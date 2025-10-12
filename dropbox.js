(() => {
  const API_BASE =
    window.location.port === "5000"
      ? ""
      : `${window.location.protocol}//${window.location.hostname}:5000`;

  const dropZone = document.getElementById("drop-zone");
  const output = document.getElementById("output") || document.body;
  const submitButton = document.getElementById("submitButton");

  let queue = [];

  const picker = document.createElement("input");
  picker.type = "file";
  picker.accept = "image/*";
  picker.multiple = true;
  picker.style.display = "none";
  document.body.appendChild(picker);

  if (submitButton) submitButton.hidden = true;

  dropZone.addEventListener("click", () => picker.click());
  picker.addEventListener("change", (e) => enqueueFiles([...(e.target.files || [])]));

  ["dragenter", "dragover", "dragleave", "drop"].forEach((ev) => {
    window.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); });
  });
  dropZone.addEventListener("dragenter", () => dropZone.classList.add("hover"));
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("hover"));
  dropZone.addEventListener("drop", (e) => {
    dropZone.classList.remove("hover");
    enqueueFiles([...(e.dataTransfer?.files || [])]);
  });

  submitButton?.addEventListener("click", async () => {
    if (!queue.length) return;
    submitButton.disabled = true;

    for (const file of queue) {
      await previewAndClassify(file);
    }

    queue = [];
    submitButton.disabled = false;
    submitButton.hidden = true;
  });

  function enqueueFiles(files) {
    const filtered = (files || []).filter((f) => f.type?.startsWith("image/"));
    if (!filtered.length) {
      log("No images found in selection.", "orange");
      return;
    }
    queue.push(...filtered);
    log(`Queued ${filtered.length} image(s). Total queued: ${queue.length}.`);
    if (submitButton) submitButton.hidden = false;
  }

  async function previewAndClassify(file) {
    const url = URL.createObjectURL(file);
    const fig = document.createElement("figure");
    fig.style.margin = "12px";
    fig.style.display = "inline-block";
    fig.style.textAlign = "center";

    const img = document.createElement("img");
    img.src = url;
    img.alt = "";
    img.style.maxWidth = "240px";
    img.style.display = "block";
    img.style.borderRadius = "12px";
    img.style.border = "4px solid #777"; // neutral until classified

    const cap = document.createElement("figcaption");
    cap.style.font = "13px/1.3 system-ui";
    cap.style.color = "#aaa";
    cap.style.marginTop = "6px";
    cap.textContent = `Image is not accessible (red)`;

    fig.appendChild(img);
    fig.appendChild(cap);
    output.appendChild(fig);
    img.addEventListener("load", () => URL.revokeObjectURL(url));

    const fd = new FormData();
    fd.append("file", file);

    try {
      const r = await fetch(`${API_BASE}/upload_file`, { method: "POST", body: fd, mode: "cors" });
      const raw = await r.text();
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}: ${raw.slice(0, 200)}`);

      let data;
      try { data = JSON.parse(raw); } catch { throw new Error(`Non-JSON: ${raw.slice(0, 200)}`); }
      if (data.error) throw new Error(data.error);

      // Prefer numeric score if your app returns it; else fall back to color/label
      let color;
      if (typeof data.score === "number") {
        const s = data.score;
        color = s <= 0.4 ? "green" : s <= 0.6 ? "yellow" : "red";
        cap.textContent = `Score: ${s.toFixed(3)} (${color.toUpperCase()})`;
      } else {
        const label = (data.accessibility || "").toLowerCase();
        const c = (data.color || "").toLowerCase();
        if (c.includes("red") || label.includes("not")) color = "red";
        else if (c.includes("yellow") || label.includes("somewhat")) color = "yellow";
        else color = "green";
        cap.textContent = data.accessibility || color.toUpperCase();
      }

      img.style.borderColor = color;
      cap.textContent = `The image is not accessible (red)`;

      if (data.url) img.addEventListener("click", () => window.open(data.url, "_blank"));
    } catch (err) {
      img.style.borderColor = "red";
      cap.textContent = `The image is not accessible (red)`;
    }
  }

  function log(msg, color) {
    const p = document.createElement("p");
    if (color) p.style.color = color;
    p.textContent = msg;
    output.appendChild(p);
  }
})();

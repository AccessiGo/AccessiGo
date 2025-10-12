(() => {
  // Point to Flask on :5000 unless we’re already on that origin.
  const API_BASE = (() => {
    if (window.location.port === "5000") return ""; // same origin as Flask
    if (window.location.protocol === "http:" || window.location.protocol === "https:") {
      return `${window.location.protocol}//${window.location.hostname}:5000`;
    }
    // if opened as file:// fallback to localhost
    return "http://localhost:5000";
  })();

  const dropZone = document.getElementById("drop-zone");
  const output = document.getElementById("output");
  const submitButton = document.getElementById("submitButton");
  if (submitButton) submitButton.hidden = true;

  // Allow click-to-upload as well
  const picker = document.createElement("input");
  picker.type = "file";
  picker.accept = "image/*";
  picker.multiple = true;
  picker.style.display = "none";
  document.body.appendChild(picker);

  dropZone.addEventListener("click", () => picker.click());
  picker.addEventListener("change", (e) => handleFiles([...(e.target.files || [])]));

  // Prevent default browser behavior for drag&drop globally
  ["dragenter", "dragover", "dragleave", "drop"].forEach((ev) => {
    window.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); });
  });

  // Simple hover styling hooks (optional CSS)
  dropZone.addEventListener("dragenter", () => dropZone.classList.add("hover"));
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("hover"));

  dropZone.addEventListener("drop", (e) => {
    dropZone.classList.remove("hover");
    handleFiles([...(e.dataTransfer?.files || [])]);
  });

  function handleFiles(files) {
    if (!files || !files.length) return;
    files.forEach((f) => uploadFile(f));
  }

  async function uploadFile(file) {
    log(`⏳ Uploading ${escapeHtml(file.name)}...`);
    const fd = new FormData();
    fd.append("file", file);

    const url = `${API_BASE}/upload_file`;
    try {
// ---- robust fetch + parse block ----
const url = `${API_BASE}/upload_file`;

let resp, raw, data;
try {
  resp = await fetch(url, {
    method: "POST",
    body: fd,
    mode: "cors",              // allow cross-origin if you open page from Live Server
    credentials: "omit",       // do not send cookies
    headers: { Accept: "application/json" } // helps proxies/servers pick JSON
  });
} catch (networkErr) {
  // Happens when Flask isn't reachable, mixed content (https page -> http API),
  // wrong port, or CORS preflight blocked before request reaches Flask.
  log(`❌ Network error contacting ${url}: ${escapeHtml(String(networkErr))}`, "red");
  return;
}

const contentType = (resp.headers.get("content-type") || "").toLowerCase();

// Read the body *once* and decide how to parse
try {
        raw = await resp.text();
        } catch (e) {
        log(`❌ Failed to read response body: ${escapeHtml(String(e))}`, "red");
        return;
        }

        if (!resp.ok) {
        // Show exact status + first bytes of body (often an HTML error page)
        log(`❌ ${resp.status} ${resp.statusText} from ${url}`, "red");
        log(escapeHtml(raw.slice(0, 300)), "red");
        return;
        }

        // Prefer JSON if server says it's JSON; otherwise try to parse anyway
        if (contentType.includes("application/json")) {
        try { data = JSON.parse(raw); } 
        catch (e) {
            log(`❌ Couldn't parse JSON: ${escapeHtml(String(e))}. Body: ${escapeHtml(raw.slice(0,300))}`, "red");
            return;
        }
        } else {
        try { data = JSON.parse(raw); }
        catch {
            log(`❌ Server returned non-JSON. Body: ${escapeHtml(raw.slice(0,300))}`, "red");
            return;
        }
        }

        if (data.error) {
        log(`❌ ${escapeHtml(data.error)}`, "red");
        return;
        }

        const color = data.color || "limegreen";
        log(`✅ ${escapeHtml(data.filename)} uploaded.`);
        output.insertAdjacentHTML(
        "beforeend",
        `<p style="font-weight:bold;color:${color}">Accessibility: ${escapeHtml(data.accessibility || "")}</p>`
        );
        if (data.url) {
        output.insertAdjacentHTML(
            "beforeend",
            `<img src="${data.url}" alt="" style="max-width:240px;display:block;margin:8px 0">`
        );
        }
        if (submitButton) submitButton.hidden = false;
        // ---- end robust fetch + parse block ----
    } catch (err) {
      // Network/CORS or mixed-content (https page -> http backend) usually land here
      log(`❌ Network error contacting ${url}. ${escapeHtml(String(err))}`, "red");
      console.error("Upload error:", err);
    }
  }

  function log(msg, color) {
    output.insertAdjacentHTML("beforeend", `<p${color ? ` style="color:${color}"` : ""}>${msg}</p>`);
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }
})();

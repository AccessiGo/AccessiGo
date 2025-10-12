import os
import pickle
import numpy as np
from PIL import Image
from werkzeug.utils import secure_filename
from flask import Flask, request, jsonify, send_from_directory

# Optional CORS if your HTML runs from a different origin (e.g., Live Server)
try:
    from flask_cors import CORS  # type: ignore
    CORS_AVAILABLE = True
except Exception:
    CORS_AVAILABLE = False

# -------------------- App setup --------------------
app = Flask(__name__)
if CORS_AVAILABLE:
    CORS(app)  # during dev; tighten for prod

# Accept both /path and /path/ (avoids 308 redirects that break fetch JSON)
app.url_map.strict_slashes = False

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 25 * 1024 * 1024  # 25 MB

ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

# -------------------- Model loading --------------------
_MODEL = None
_MODEL_KIND = None  # "keras" or "pickle"
_INPUT_SIZE = (224, 224)  # fallback if not inferable

def _try_load_keras(path):
    try:
        import tensorflow as tf  # type: ignore
    except Exception as e:
        raise RuntimeError(f"TensorFlow is not installed: {e}")
    model = tf.keras.models.load_model(path)
    # Try to infer input size from model.input_shape (None, H, W, C)
    try:
        ishape = model.input_shape
        if isinstance(ishape, (list, tuple)) and len(ishape) >= 3:
            h = ishape[1] if isinstance(ishape[1], int) and ishape[1] else 224
            w = ishape[2] if isinstance(ishape[2], int) and ishape[2] else 224
        else:
            h, w = 224, 224
    except Exception:
        h, w = 224, 224
    return model, (h, w)

def _try_load_pickle(path):
    with open(path, "rb") as f:
        model = pickle.load(f)
    # If a Keras model was pickled, try to infer size
    h, w = 224, 224
    try:
        ishape = getattr(model, "input_shape", None)
        if ishape and isinstance(ishape, (list, tuple)) and len(ishape) >= 3:
            h = ishape[1] if ishape[1] else h
            w = ishape[2] if ishape[2] else w
    except Exception:
        pass
    return model, (h, w)

def load_model_once():
    """Find and load a model once (prefers Keras, falls back to pickle)."""
    global _MODEL, _MODEL_KIND, _INPUT_SIZE
    if _MODEL is not None:
        return

    candidates = [
        os.getenv("MODEL_PATH"),
        os.path.join(BASE_DIR, "models", "AccessibleClassifier.keras"),
        os.path.join(BASE_DIR, "models", "imageclassifier.keras"),
        os.path.join(BASE_DIR, "AccessibleClassifier.keras"),
        os.path.join(BASE_DIR, "imageclassifier.keras"),
        os.path.join(BASE_DIR, "trained_model.pkl"),
        os.path.join(BASE_DIR, "model.pkl"),
    ]
    candidates = [p for p in candidates if p and os.path.exists(p)]
    if not candidates:
        raise FileNotFoundError(
            "No model file found. Looked for .keras in ./models/ and trained_model.pkl/model.pkl in project root. "
            "You can set MODEL_PATH=/full/path/to/model"
        )

    path = candidates[0]
    ext = os.path.splitext(path)[1].lower()

    if ext == ".keras" or os.path.isdir(path):
        model, size = _try_load_keras(path)
        _MODEL, _MODEL_KIND, _INPUT_SIZE = model, "keras", size
    elif ext == ".pkl":
        model, size = _try_load_pickle(path)
        _MODEL, _MODEL_KIND, _INPUT_SIZE = model, "pickle", size
    else:
        # Try keras first, then pickle
        try:
            model, size = _try_load_keras(path)
            _MODEL, _MODEL_KIND, _INPUT_SIZE = model, "keras", size
        except Exception:
            model, size = _try_load_pickle(path)
            _MODEL, _MODEL_KIND, _INPUT_SIZE = model, "pickle", size

# -------------------- Prediction helpers --------------------
def _preprocess_image(pth, size):
    """RGB → resize to model input → scale to [0,1] → add batch dim."""
    with Image.open(pth) as im:
        im = im.convert("RGB")
        im = im.resize(size)
        arr = np.asarray(im, dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)  # NHWC

def _score_from_array(arr):
    """Map various prediction shapes to a [0,1] 'risk' score."""
    arr = np.array(arr).astype("float32")

    if arr.ndim == 0:
        score = float(arr)
    elif arr.ndim == 1:
        if arr.shape[0] == 1:
            score = float(arr[0])
        elif arr.shape[0] >= 3:
            # 3-class heuristic: [accessible, somewhat, not]
            score = float(0.2 * arr[0] + 0.5 * arr[1] + 1.0 * arr[2])
            score = max(0.0, min(1.0, score))
        else:
            score = float(arr.max())
    elif arr.ndim == 2:
        if arr.shape[1] == 1:
            score = float(arr[0, 0])
        elif arr.shape[1] >= 3:
            a, y, r = arr[0, 0], arr[0, 1], arr[0, 2]
            score = float(0.2 * a + 0.5 * y + 1.0 * r)
            score = max(0.0, min(1.0, score))
        else:
            score = float(arr[0].max())
    else:
        score = float(arr.reshape(-1)[0])

    return max(0.0, min(1.0, score))

def _predict_accessibility(image_path):
    load_model_once()
    img = _preprocess_image(image_path, _INPUT_SIZE)

    # Keras expects NHWC; classic sklearn pickle expects 2D (n_samples, n_features).
    try:
        if _MODEL_KIND == "pickle":
            X = img.reshape((img.shape[0], -1))
            if hasattr(_MODEL, "predict_proba"):
                pred = _MODEL.predict_proba(X)
            else:
                pred = _MODEL.predict(X)
        else:
            pred = _MODEL.predict(img)  # Keras
    except Exception as e:
        raise RuntimeError(f"Model predict failed: {e}")

    try:
        score = _score_from_array(pred)
    except Exception:
        score = 0.5  # neutral fallback

    if score > 0.6:
        label, color = "Not accessible (red)", "red"
    elif score > 0.4:
        label, color = "Somewhat accessible (yellow)", "yellow"
    else:
        label, color = "Accessible (green)", "limegreen"

    return label, color, float(score)

# -------------------- Routes --------------------
@app.route("/upload_file", methods=["POST"])
def upload_file():
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file part named 'file' in form-data."}), 400
        f = request.files["file"]
        if f.filename == "":
            return jsonify({"error": "No file selected."}), 400

        ext = os.path.splitext(f.filename)[1].lower()
        if ext not in ALLOWED_EXTS:
            return jsonify({"error": f"Unsupported file type '{ext}'. Allowed: {sorted(ALLOWED_EXTS)}"}), 400

        filename = secure_filename(f.filename)
        save_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        f.save(save_path)

        label, color, score = _predict_accessibility(save_path)

        return jsonify({
            "filename": filename,
            "accessibility": label,
            "color": color,
            "score": score,
            "url": f"/uploads/{filename}"
        })
    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

@app.route("/uploads/<path:filename>")
def uploads(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

# Serve your existing static files from same origin to avoid CORS issues
@app.route("/")
def root():
    return send_from_directory(BASE_DIR, "index.html")

@app.route("/upload.html")
def upload_html():
    return send_from_directory(BASE_DIR, "upload.html")

@app.route("/dropbox.js")
def dropbox_js():
    return send_from_directory(BASE_DIR, "dropbox.js")

@app.route("/style.css")
def style_css():
    return send_from_directory(BASE_DIR, "style.css")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

import os
import pickle
import numpy as np
import cv2
import tensorflow as tf
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename

app = Flask(__name__)

app.url_map.strict_slashes = False 

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

MODEL_PATH = os.getenv("MODEL_PATH", os.path.join(BASE_DIR, "trained_model.pkl"))
if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Model not found at {MODEL_PATH}. Set MODEL_PATH or place trained_model.pkl next to app.py")

with open(MODEL_PATH, "rb") as f:
    new_model = pickle.load(f)

def _preprocess_for_model(img_bgr, size=(256, 256)):
    """cv2 BGR -> RGB -> resize -> [0,1] -> NHWC float32"""
    if img_bgr is None:
        raise ValueError("Could not read image (cv2.imread returned None).")
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    resized = tf.image.resize(img_rgb, size).numpy().astype("float32") / 255.0
    return np.expand_dims(resized, 0) 

def _score_from_pred(pred):
    """
    Convert model output to a scalar in [0,1].
    If your model is binary (sigmoid), this is the prob.
    If it's multi-class, we fallback to the max prob as a 'risk' proxy.
    """
    arr = np.array(pred, dtype="float32")
    if arr.ndim == 0:
        score = float(arr)
    elif arr.ndim == 1:
        score = float(arr[0] if arr.shape[0] == 1 else arr.max())
    elif arr.ndim == 2:
        score = float(arr[0, 0] if arr.shape[1] == 1 else arr[0].max())
    else:
        score = float(arr.reshape(-1)[0])
    return max(0.0, min(1.0, score))

@app.route("/upload_file", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file field named 'file' in form-data."}), 400

    f = request.files["file"]
    if f.filename == "":
        return jsonify({"error": "No file selected."}), 400

    ext = os.path.splitext(f.filename)[1].lower()
    if ext not in ALLOWED_EXTS:
        return jsonify({"error": f"Unsupported file type '{ext}'. Allowed: {sorted(ALLOWED_EXTS)}"}), 400

    filename = secure_filename(f.filename)
    save_path = os.path.join(UPLOAD_FOLDER, filename)
    f.save(save_path)
    img = cv2.imread(save_path) 
    
    try:
        X = _preprocess_for_model(img, size=(256, 256))
        try:
            pred = new_model.predict(X)
        except Exception:
            X_flat = X.reshape((X.shape[0], -1))
            pred = new_model.predict_proba(X_flat) if hasattr(new_model, "predict_proba") else new_model.predict(X_flat)
        score = _score_from_pred(pred)
    except Exception as e:
        return jsonify({"error": f"Inference error: {e}"}), 500

    return jsonify({
        "filename": filename,
        "score": float(score),          
        "url": f"/uploads/{filename}"
    })

@app.route("/uploads/<path:filename>")
def uploads(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route("/")
def root():
    return "OK"

@app.route("/health")
def health():
    return jsonify({"ok": True})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

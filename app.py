from flask import Flask, render_template, request, jsonify
import os
from werkzeug.utils import secure_filename
from PIL import Image, ImageStat

app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = os.environ.get("UPLOAD_FOLDER", "/tmp")
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "bmp"}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/upload-page", methods=["GET"])
def upload_page():
    return render_template("upload.html")  # file is templates/upload.html

@app.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files: return jsonify({"error": "No file part"}), 400
    f = request.files["file"]
    if f.filename == "": return jsonify({"error": "No file selected"}), 400
    if not allowed_file(f.filename): return jsonify({"error": "Invalid type"}), 400

    filename = secure_filename(f.filename)
    path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    f.save(path)
    try:
        with Image.open(path) as img:
            means = ImageStat.Stat(img.convert("RGB")).mean
            score = (sum(means)/3.0) % 1.0
        os.remove(path)
        return jsonify({"score": round(float(score), 4)})
    except Exception as e:
        if os.path.exists(path): os.remove(path)
        return jsonify({"error": str(e)}), 500

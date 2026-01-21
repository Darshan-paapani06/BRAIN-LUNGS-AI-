# server/app.py
import io, os, numpy as np
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from PIL import Image
import tensorflow as tf

app = Flask(__name__, static_folder="../", static_url_path="")
CORS(app)

# ----- Labels (adjust if yours differ) -----
BRAIN_CLASSES = ["glioma", "meningioma", "no_tumor", "pituitary"]
LUNG_CLASSES  = ["Bacterial Pneumonia","Corona Virus Disease","Normal","Tuberculosis","Viral Pneumonia"]

# ----- Load models (keep your paths) -----
BRAIN_MODEL_PATH = os.path.join(os.path.dirname(__file__), "../brain/artifacts/best_xception.keras")
LUNG_MODEL_PATH  = os.path.join(os.path.dirname(__file__), "../lung/artifacts/effnetv2b0_final.keras")

brain_model = tf.keras.models.load_model(BRAIN_MODEL_PATH, compile=False)
lung_model  = tf.keras.models.load_model(LUNG_MODEL_PATH,  compile=False)

# ----- Preprocess helpers -----
def _prep_img(file_bytes, size):
    img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    img = img.resize(size)
    arr = np.asarray(img).astype("float32") / 255.0
    return np.expand_dims(arr, 0)

# You can swap to model-specific normalization if you used different preprocessing

# ----- Health -----
@app.get("/health")
def health():
    return jsonify({
        "ok": True,
        "brain": {"model": os.path.basename(BRAIN_MODEL_PATH), "labels": BRAIN_CLASSES},
        "lung":  {"model": os.path.basename(LUNG_MODEL_PATH),  "labels": LUNG_CLASSES}
    })

# ----- Predict: Brain -----
@app.post("/api/brain/predict")
def predict_brain():
    if "image" not in request.files:
        return jsonify({"error": "image missing"}), 400
    img_b = request.files["image"].read()
    x = _prep_img(img_b, (299, 299))  # Xception input
    probs = brain_model.predict(x, verbose=0)[0]
    probs = tf.nn.softmax(probs).numpy().tolist() if len(probs) > 1 else [1.0]

    top_idx = int(np.argmax(probs))
    top_conf = float(probs[top_idx])
    top_label = BRAIN_CLASSES[top_idx]

    return jsonify({
        "top": top_label,                 # <- UI reads this
        "top_idx": top_idx,
        "conf": top_conf,                 # <- UI reads this
        "labels": BRAIN_CLASSES,          # optional but useful
        "probs": {BRAIN_CLASSES[i]: float(p) for i, p in enumerate(probs)}
    })

# ----- Predict: Lung -----
@app.post("/api/lung/predict")
def predict_lung():
    if "image" not in request.files:
        return jsonify({"error": "image missing"}), 400
    img_b = request.files["image"].read()
    x = _prep_img(img_b, (224, 224))  # EffNetV2-B0 input
    probs = lung_model.predict(x, verbose=0)[0]
    probs = tf.nn.softmax(probs).numpy().tolist() if len(probs) > 1 else [1.0]

    top_idx = int(np.argmax(probs))
    top_conf = float(probs[top_idx])
    top_label = LUNG_CLASSES[top_idx]

    return jsonify({
        "top": top_label,                 # <- UI reads this
        "top_idx": top_idx,
        "conf": top_conf,                 # <- UI reads this
        "labels": LUNG_CLASSES,           # optional but useful
        "probs": {LUNG_CLASSES[i]: float(p) for i, p in enumerate(probs)}
    })

# ----- Static files for your HTML (Render serves same-origin) -----
@app.get("/")
def root():
    return send_from_directory(app.static_folder, "index.html")

@app.get("/<path:path>")
def static_proxy(path):
    return send_from_directory(app.static_folder, path)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "10000"))
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)

import os
import io
import json
import numpy as np
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Set TF log level
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
import tensorflow as tf

app = FastAPI(title="Pulmo AI Lung Disease Prediction Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Disease classification classes
DISEASES = [
    "Atelectasis", "Cardiomegaly", "Effusion", "Infiltration", "Mass",
    "Nodule", "Pneumonia", "Pneumothorax", "Consolidation",
    "Edema", "Emphysema", "Fibrosis", "Pleural_Thickening", "Hernia"
]

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model", "lung_model.h5")
model = None

@app.on_event("startup")
def load_ml_model():
    global model
    if os.path.exists(MODEL_PATH):
        print(f"Loading Keras model from {MODEL_PATH}...")
        model = tf.keras.models.load_model(MODEL_PATH, compile=False)
        print("Model loaded successfully.")
    else:
        print(f"Warning: Model file not found at {MODEL_PATH}")

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "model_loaded": model is not None
    }

@app.post("/predict")
async def predict_scan(file: UploadFile = File(...)):
    global model
    if model is None:
        raise HTTPException(status_code=503, detail="Model is not loaded on this server.")

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        image = image.resize((224, 224))
        
        img_array = np.array(image, dtype=np.float32) / 255.0
        img_array = np.expand_dims(img_array, axis=0)

        preds = model.predict(img_array, verbose=0)[0]

        threshold = 0.2
        results = [
            (DISEASES[i], float(prob))
            for i, prob in enumerate(preds)
            if prob >= threshold
        ]
        results = sorted(results, key=lambda x: x[1], reverse=True)

        if len(results) > 0:
            output = [
                f"{disease} → {prob * 100:.2f}%"
                for disease, prob in results[:3]
            ]
            return {
                "status": "Disease Detected",
                "predictions": output
            }
        else:
            max_index = int(np.argmax(preds))
            return {
                "status": "Normal / Low Risk",
                "top_prediction": f"{DISEASES[max_index]} ({preds[max_index] * 100:.2f}%)"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)

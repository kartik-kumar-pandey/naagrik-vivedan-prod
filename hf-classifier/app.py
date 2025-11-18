import base64
import io
import os
import sys

import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from PIL import Image

# Ensure shared module is importable when this folder is used standalone
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

from shared.model_inference import IssueClassifier  # noqa: E402

MODEL_PATH = os.getenv('MODEL_PATH', os.path.join(PROJECT_ROOT, 'model', 'best_urban_mobilenet.pth'))
MODEL_NUM_CLASSES = int(os.getenv('MODEL_NUM_CLASSES', '6'))

app = FastAPI(
    title="Naagrik Nivedan Classifier",
    version="1.0.0",
    description="Lightweight FastAPI wrapper that exposes the MobileNet model for Hugging Face Spaces."
)

classifier = IssueClassifier(model_path=MODEL_PATH, num_classes=MODEL_NUM_CLASSES)


class PredictRequest(BaseModel):
    image: str  # data URL or raw base64 string


class PredictResponse(BaseModel):
    issue_type: str
    confidence: float


def decode_image(image_payload: str) -> np.ndarray:
    if not image_payload:
        raise HTTPException(status_code=400, detail="Image field is required")

    payload = image_payload
    if payload.startswith('data:image'):
        try:
            _, payload = payload.split(',', 1)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid data URL format")

    try:
        image_bytes = base64.b64decode(payload)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image payload")

    try:
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Unsupported image bytes: {exc}") from exc

    return np.array(image)


@app.get("/health")
def health():
    return {"status": "ok", "model_path": MODEL_PATH}


@app.post("/predict", response_model=PredictResponse)
def predict(payload: PredictRequest):
    image_array = decode_image(payload.image)
    result = classifier.classify_issue(image_array)
    return PredictResponse(**result)


@app.get("/")
def root():
    return {
        "service": "Naagrik Nivedan HF Classifier",
        "endpoints": {
            "health": "/health",
            "predict": "POST /predict"
        }
    }


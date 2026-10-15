import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import (
    HOST,
    PORT,
    CORS_ORIGINS,
    ALLOWED_EXTENSIONS,
    MAX_AUDIO_FILE_SIZE,
    MODEL_DIR,
)
from model_service import forensics_service, ModelNotInstalledException

logger = logging.getLogger("voiceproof.api")
logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan handler: Loads the fine-tuned Facebook Wav2Vec2 model
    once during application startup rather than on every prediction request.
    """
    logger.info(f"[VoiceProof] Initializing backend. Target model directory: {MODEL_DIR}")
    try:
        forensics_service.load_model()
        logger.info(f"[VoiceProof] Model successfully loaded on startup on device: {forensics_service.device}")
    except ModelNotInstalledException as e:
        logger.warning(f"[VoiceProof] Model weights not found on startup: {e.message}")
    except Exception as e:
        logger.error(f"[VoiceProof] Failed to load model on startup: {e}")

    yield

    logger.info("[VoiceProof] Shutting down VoiceProof API service.")


app = FastAPI(
    title="VoiceProof — AI Voice Deepfake Detector",
    description="Real ML Audio Forensics Service powered by fine-tuned Facebook Wav2Vec2",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for frontend applications (local dev and configured origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root metadata endpoint."""
    return {
        "service": "VoiceProof AI Audio Forensics Backend",
        "version": "1.0.0",
        "model_architecture": "Facebook Wav2Vec2 Audio Classification",
        "documentation": "/docs",
        "endpoints": {
            "health": "/api/health",
            "predict": "/api/predict (POST)",
        },
    }


@app.get("/api/health")
async def health_check():
    """
    Health check endpoint reporting API status, model readiness, device,
    and local model installation state.
    """
    model_status = forensics_service.get_model_status()
    return {
        "status": "online",
        "service": "VoiceProof Audio Forensics API",
        "version": "1.0.0",
        "model_installed": model_status["model_installed"],
        "model_ready": model_status["model_ready"],
        "model_name": model_status["model_name"],
        "device": model_status["device"],
        "device_requested": model_status["device_requested"],
        "message": model_status["message"],
        "model_details": model_status,
    }


@app.post("/api/predict")
async def predict_voice(audio_file: UploadFile = File(...)):
    """
    Forensics analysis endpoint.
    Accepts an audio file and executes deepfake detection using the fine-tuned Wav2Vec2 model.
    Validates file type and size, decodes safely, resamples to 16 kHz mono, and truncates to 12s.
    """
    # 1. Validate file presence
    if not audio_file or not audio_file.filename:
        logger.warning("[VoiceProof] 400 Bad Request: No audio file provided in request.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"status": "error", "message": "No audio file provided in the upload request."},
        )

    # 2. Validate file extension (case-insensitive)
    filename = audio_file.filename.strip()
    file_ext = Path(filename).suffix.lower()

    # If the file has an extension, verify it's supported
    if file_ext and file_ext not in ALLOWED_EXTENSIONS:
        logger.warning(f"[VoiceProof] 400 Bad Request: Unsupported audio format '{file_ext}' for file '{filename}'.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "status": "unsupported_media_type",
                "message": f"Unsupported audio format '{file_ext}'. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
                "filename": filename,
            },
        )

    # 3. Read audio bytes and validate size
    try:
        content = await audio_file.read()
    except Exception as e:
        logger.warning(f"[VoiceProof] 400 Bad Request: Failed to read file bytes from '{filename}': {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"status": "read_error", "message": f"Failed to read audio file bytes: {str(e)}"},
        )

    if len(content) == 0:
        logger.warning(f"[VoiceProof] 400 Bad Request: Uploaded file '{filename}' is empty (0 bytes).")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"status": "empty_file", "message": "Uploaded audio file is empty (0 bytes)."},
        )

    if len(content) > MAX_AUDIO_FILE_SIZE:
        size_mb = len(content) / (1024 * 1024)
        max_mb = MAX_AUDIO_FILE_SIZE / (1024 * 1024)
        logger.warning(f"[VoiceProof] 413 File Too Large: '{filename}' ({size_mb:.2f} MB > limit {max_mb:.0f} MB).")
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={
                "status": "file_too_large",
                "message": f"File size ({size_mb:.2f} MB) exceeds maximum allowed limit of {max_mb:.0f} MB.",
            },
        )

    # 4. Check model availability and execute real inference
    try:
        logger.info(f"[VoiceProof] Received audio file '{filename}' ({len(content)} bytes). Starting forensics...")
        result = await forensics_service.predict(content, filename)
        logger.info(f"[VoiceProof] Prediction complete for '{filename}': {result['predicted_class']} ({result['confidence']*100:.1f}%)")
        return result
    except ModelNotInstalledException as e:
        logger.warning(f"[VoiceProof] 503 Model Not Installed: {e.message}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "model_not_installed",
                "message": e.message,
                "model_ready": False,
                "filename": filename,
                "file_size_bytes": len(content),
                "content_type": audio_file.content_type,
                "guidance": e.details.get("installation_guidance", []),
                "details": e.details,
            },
        )
    except ValueError as e:
        logger.warning(f"[VoiceProof] 400 Bad Request: Audio decoding error on '{filename}': {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "status": "audio_decode_error",
                "message": str(e),
                "filename": filename,
            },
        )
    except Exception as e:
        logger.exception(f"[VoiceProof] 500 Inference execution error on '{filename}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "status": "inference_error",
                "message": f"An error occurred during audio forensics processing: {str(e)}",
            },
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)

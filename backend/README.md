# VoiceProof — Backend Service

FastAPI service powering the **VoiceProof** AI Voice Deepfake Detector with your fine-tuned **Facebook Wav2Vec2** audio classifier.

## Architecture

- **Framework**: FastAPI (asynchronous, high-performance)
- **Model Engine**: Hugging Face `transformers` using `AutoFeatureExtractor` and `AutoModelForAudioClassification`
- **Model Loading**: Pre-loaded once into memory on application startup via FastAPI's `lifespan` handler (no per-request re-loading)
- **Audio Preprocessing**:
  - Safe decoding with `soundfile`
  - Automatic stereo-to-mono downmixing (channel averaging)
  - Resampling to 16,000 Hz via `scipy.signal.resample_poly`
  - Truncation to 12.0 seconds (`192,000` samples), directly matching model training
- **Hardware Acceleration**: CPU by default; GPU enabled via `DEVICE=cuda` or `USE_CUDA=true` if CUDA is available
- **Strict ML Integrity**: Zero mock metrics or fake confidence scores. Returns real softmax class probabilities and an explicit authenticity disclaimer.

---

## Windows Setup & Local Execution

### 1. Virtual Environment & Dependencies

From the `backend/` directory in PowerShell:

```powershell
# Activate the existing virtual environment
.\.venv\Scripts\Activate.ps1

# Ensure dependencies are installed
pip install -r requirements.txt
pip install -r requirements-ml.txt
```

### 2. Device Selection (CPU / GPU)

By default, inference runs on CPU. If you have an NVIDIA GPU and installed PyTorch with CUDA:

In `backend/.env`:
```ini
DEVICE=cuda
USE_CUDA=true
```

If CUDA is requested but not compatible or unavailable, the backend logs a warning and safely falls back to CPU.

### 3. Run the Development Server

```powershell
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

- API Base: `http://127.0.0.1:8000`
- Interactive OpenAPI Docs: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/api/health`

### 4. Run Backend Tests

```powershell
pytest -v test_api.py
```

---

## Production Configuration

### 1. Backend CORS (`backend/.env`)
Set `CORS_ORIGINS` to allow your production frontend domain:
```ini
CORS_ORIGINS=https://voiceproof.yourdomain.com
```

### 2. Frontend API Base URL (`frontend/.env`)
Configure the Vite frontend to point to your deployed backend:
```ini
VITE_API_BASE_URL=https://api.voiceproof.yourdomain.com
```
Build the frontend bundle:
```powershell
cd ../frontend
npm run build
```
Deploy the resulting static build or host behind an HTTPS reverse proxy (Nginx, Caddy, Cloudflare, etc.).

---

## API Endpoints

### 1. Health Status
- **Method**: `GET`
- **Route**: `/api/health`
- **Response**:
  ```json
  {
    "status": "online",
    "service": "VoiceProof Audio Forensics API",
    "version": "1.0.0",
    "model_installed": true,
    "model_ready": true,
    "model_name": "Facebook Wav2Vec2 Audio Deepfake Classifier",
    "device": "cpu",
    "device_requested": "cpu",
    "message": "Model loaded and ready for real inference on cpu."
  }
  ```

### 2. Forensics Predict
- **Method**: `POST`
- **Route**: `/api/predict`
- **Payload**: `multipart/form-data` with field `audio_file` (`.wav`, `.mp3`, `.flac`, `.ogg`, `.m4a`)
- **Response**:
  ```json
  {
    "status": "success",
    "model_ready": true,
    "filename": "sample.wav",
    "predicted_class": "AI-generated",
    "predicted_label": "AI-generated",
    "confidence": 0.8942,
    "probabilities": {
      "Original": 0.1058,
      "AI-generated": 0.8942
    },
    "audio_metadata": {
      "original_sample_rate": 44100,
      "original_duration_seconds": 14.5,
      "processed_sample_rate": 16000,
      "processed_duration_seconds": 12.0,
      "channels": "mono (converted from stereo)",
      "truncated": true,
      "max_duration_seconds": 12.0
    },
    "device": "cpu",
    "disclaimer": "VoiceProof classification reflects statistical model confidence from fine-tuned Facebook Wav2Vec2 representations. Confidence scores indicate acoustic pattern alignment and do not constitute an absolute legal or forensic guarantee of authenticity."
  }
  ```

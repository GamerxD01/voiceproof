# VoiceProof — AI Voice Deepfake Detector

**VoiceProof** is an end-to-end audio forensics full-stack application for detecting AI voice clones, synthetic speech, and deepfake audio artifacts using a local fine-tuned **Facebook Wav2Vec2** audio classification model.

This is a real machine-learning system built with strict ML integrity: **it never invents fake metrics, mock probabilities, or simulated detection scores**. It executes real neural classification using Hugging Face `transformers` and reports true softmax class probabilities alongside an explicit authenticity disclaimer.

---

## Model Specifications

- **Base Architecture**: `facebook/wav2vec2-base`
- **Model Checkpoint**: Fine-tuned for two-class audio deepfake detection:
  - **Class 0**: `Original` (Authentic human voice)
  - **Class 1**: `AI-generated` (Synthetic / cloned speech)
- **Audio Preprocessing**:
  - Sample rate: `16,000 Hz` (resampled via high-quality polyphase filtering)
  - Channels: `Mono` (stereo tracks automatically downmixed)
  - Duration window: Truncated to `12.0 seconds` (`192,000` samples) to match training preprocessing
- **Loading Strategy**: Loaded once during FastAPI startup (`AutoFeatureExtractor` + `AutoModelForAudioClassification`) to optimize per-request latency.

---

## Technology Stack

- **Frontend**: React 19 + TypeScript + Vite 6
- **Styling**: Tailwind CSS v4 with dark forensics design theme
- **Visualization**: Recharts (audio architecture & latency benchmarks)
- **Icons**: Lucide React
- **Backend**: Python 3.10+ with FastAPI, Uvicorn, and Pydantic
- **Deep Learning**: PyTorch 2.x + Transformers (`AutoFeatureExtractor`, `AutoModelForAudioClassification`)
- **Audio I/O**: `soundfile` and `scipy.signal`

---

## Monorepo Architecture

```text
projectVoice/
├── frontend/                     # React 19 + TypeScript + Vite application
│   ├── src/
│   │   ├── components/           # Forensics UI components (Header, AudioUploader, PipelineCard, etc.)
│   │   ├── lib/utils.ts          # Class-name utility (cn)
│   │   ├── services/api.ts       # Typed API client with real prediction interfaces
│   │   ├── App.tsx               # Primary dashboard interface
│   │   ├── index.css             # Tailwind styling and theme tokens
│   │   └── main.tsx              # Application entry point
│   ├── .env                      # Local frontend environment (VITE_API_BASE_URL)
│   ├── .env.example              # Frontend environment template with production notes
│   ├── package.json              # Frontend npm dependencies and scripts
│   └── vite.config.ts            # Vite 6 configuration with Tailwind and path aliases
│
├── backend/                      # FastAPI Python service
│   ├── main.py                   # FastAPI application with lifespan model loading & routes
│   ├── model_service.py          # Wav2Vec2 forensics service & audio preprocessing
│   ├── config.py                 # Relative path resolution, device, audio limits, & CORS
│   ├── requirements.txt          # Base backend web dependencies
│   ├── requirements-ml.txt       # Deep learning & testing dependencies
│   ├── test_api.py               # Unit & integration test suite (6 tests)
│   ├── .env                      # Local server configuration
│   ├── .env.example              # Backend environment template with device & CORS notes
│   └── README.md                 # Backend-specific instructions
│
├── model/                        # Fine-tuned Facebook Wav2Vec2 checkpoint files
│   ├── config.json               # Architecture & id2label mapping (0: Original, 1: AI-generated)
│   ├── preprocessor_config.json  # Wav2Vec2 feature extraction settings
│   ├── model.safetensors         # Fine-tuned classification weights (~378 MB, gitignored)
│   ├── README.md                 # Checkpoint directory documentation
│   └── .gitkeep                  # Preserves directory in version control
│
├── .gitignore                    # Excludes node_modules, .venv, *.safetensors, *.bin, audio dumps, .env
└── README.md                     # Project documentation (this file)
```

---

## Getting Started on Windows (PowerShell)

### Prerequisites
- **Node.js**: v20.x or higher (`node -v`)
- **Python**: 3.10 to 3.13 (`python --version`)

---

### 1. Run the Backend

Open a PowerShell terminal in the `backend/` directory:

```powershell
cd backend

# Activate the virtual environment
.\.venv\Scripts\Activate.ps1

# Run the backend test suite
pytest -v test_api.py

# Start the FastAPI server
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

- API Base: `http://127.0.0.1:8000`
- Interactive API Docs: `http://127.0.0.1:8000/docs`
- Health Endpoint: `http://127.0.0.1:8000/api/health`

---

### 2. Run the Frontend

Open a second PowerShell terminal in the `frontend/` directory:

```powershell
cd frontend

# Start the development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## Device Configuration (CPU / GPU)

Inference runs on **CPU by default**. If you have an NVIDIA GPU and installed a CUDA-enabled PyTorch build:

Set in `backend/.env`:
```ini
DEVICE=cuda
USE_CUDA=true
```

If CUDA is requested but unavailable on the host, the backend logs a warning and automatically falls back to CPU without crashing.

---

## Production Deployment & CORS Configuration

### 1. Backend CORS
In production, set `CORS_ORIGINS` in `backend/.env` to include your production frontend domain:
```ini
CORS_ORIGINS=https://voiceproof.yourdomain.com
```

### 2. Frontend API Base URL
In `frontend/.env`, set the backend base URL:
```ini
VITE_API_BASE_URL=https://api.voiceproof.yourdomain.com
```
Then build the static assets:
```powershell
cd frontend
npm run build
```

---

## API Contract

### `GET /api/health`
Returns the status of the service, model loading state, and compute device:

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

### `POST /api/predict`
Uploads an audio file (`.wav`, `.mp3`, `.flac`, `.ogg`, `.m4a`) as `multipart/form-data` with field `audio_file`.

**Response (HTTP 200)**:
```json
{
  "status": "success",
  "model_ready": true,
  "filename": "sample_speech.wav",
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

---

## ML Forensics & Authenticity Policy

1. **No Simulated Outputs**: All inference scores reflect actual softmax logits computed by the fine-tuned Facebook Wav2Vec2 neural network.
2. **Confidence vs. Guarantee**: High confidence reflects statistical feature similarity to synthetic speech training distributions and is not presented as an infallible forensic guarantee.
3. **Decoupled Binaries**: Weight binaries (`model.safetensors`, `*.bin`, `*.pt`) are excluded from Git tracking via `.gitignore`.

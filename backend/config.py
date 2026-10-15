import os
from pathlib import Path
from dotenv import load_dotenv

# Load optional .env file from backend or project root
load_dotenv()

# Path resolution: Always anchor to this file's parent and project root,
# ensuring paths work regardless of the terminal's current working directory.
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
DEFAULT_MODEL_DIR = PROJECT_ROOT / "model"

# Model directory configuration
MODEL_DIR = Path(os.getenv("MODEL_DIR", str(DEFAULT_MODEL_DIR))).resolve()

# Server configuration
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))

# Hardware device configuration: Defaults to CPU.
# Set DEVICE=cuda or USE_CUDA=true in your environment to attempt GPU inference if supported.
DEVICE_ENV = os.getenv("DEVICE", "cpu").lower().strip()
USE_CUDA_ENV = os.getenv("USE_CUDA", "false").lower().strip() in ("true", "1", "yes")

# CORS configuration: Local development origins by default, expandable via CORS_ORIGINS
DEFAULT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
CORS_ORIGINS_ENV = os.getenv("CORS_ORIGINS", "")
if CORS_ORIGINS_ENV:
    configured_origins = [o.strip() for o in CORS_ORIGINS_ENV.split(",") if o.strip()]
    CORS_ORIGINS = list(dict.fromkeys(DEFAULT_CORS_ORIGINS + configured_origins))
else:
    CORS_ORIGINS = DEFAULT_CORS_ORIGINS

# Audio processing constants (matches fine-tuned Wav2Vec2 training parameters)
TARGET_SAMPLE_RATE = 16000          # 16 kHz
MAX_DURATION_SECONDS = 12.0         # 12 seconds
MAX_SAMPLES = int(TARGET_SAMPLE_RATE * MAX_DURATION_SECONDS)  # 192,000 samples

# Maximum audio upload size (default: 25 MB)
MAX_AUDIO_FILE_SIZE = int(os.getenv("MAX_AUDIO_FILE_SIZE", 25 * 1024 * 1024))

# Supported audio extensions (WAV, MP3, FLAC, OGG, M4A, AAC, WEBM, OPUS, WMA)
ALLOWED_EXTENSIONS = {
    ".wav",
    ".mp3",
    ".flac",
    ".ogg",
    ".m4a",
    ".aac",
    ".webm",
    ".weba",
    ".opus",
    ".wma",
}

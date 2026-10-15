import io
import tempfile
from pathlib import Path

import numpy as np
import pytest
import soundfile as sf
from fastapi.testclient import TestClient

from main import app
from model_service import Wav2Vec2ForensicsService, ModelNotInstalledException


@pytest.fixture(scope="module")
def client():
    """Provides a TestClient with lifespan startup/shutdown execution."""
    with TestClient(app) as test_client:
        yield test_client


def create_test_wav_bytes(
    duration_seconds: float = 1.0,
    sample_rate: int = 16000,
    channels: int = 1,
    frequency: float = 440.0,
) -> bytes:
    """Helper to generate in-memory valid PCM WAV audio bytes."""
    total_samples = int(duration_seconds * sample_rate)
    t = np.linspace(0, duration_seconds, total_samples, endpoint=False)
    waveform = (0.5 * np.sin(2 * np.pi * frequency * t)).astype(np.float32)

    if channels == 2:
        waveform = np.column_stack([waveform, waveform])

    buf = io.BytesIO()
    sf.write(buf, waveform, sample_rate, format="WAV", subtype="PCM_16")
    return buf.getvalue()


def create_test_flac_bytes(
    duration_seconds: float = 1.0,
    sample_rate: int = 16000,
) -> bytes:
    """Helper to generate in-memory valid FLAC audio bytes."""
    total_samples = int(duration_seconds * sample_rate)
    t = np.linspace(0, duration_seconds, total_samples, endpoint=False)
    waveform = (0.5 * np.sin(2 * np.pi * 300.0 * t)).astype(np.float32)
    buf = io.BytesIO()
    sf.write(buf, waveform, sample_rate, format="FLAC")
    return buf.getvalue()


def test_health_endpoint(client):
    """Verifies GET /api/health reports online status, model readiness, and device."""
    response = client.get("/api/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "online"
    assert data["service"] == "VoiceProof Audio Forensics API"
    assert data["model_ready"] is True
    assert data["model_installed"] is True
    assert "cpu" in data["device"].lower() or "cuda" in data["device"].lower()
    assert data["model_name"] == "Facebook Wav2Vec2 Audio Deepfake Classifier"


def test_predict_validation_empty_file(client):
    """Verifies POST /api/predict rejects empty audio files with 400 Bad Request."""
    empty_bytes = b""
    files = {"audio_file": ("empty.wav", empty_bytes, "audio/wav")}
    response = client.post("/api/predict", files=files)

    assert response.status_code == 400
    detail = response.json().get("detail", {})
    assert detail.get("status") == "empty_file"


def test_predict_validation_unsupported_extension(client):
    """Verifies POST /api/predict rejects disallowed file formats with 400 Bad Request."""
    text_bytes = b"Hello world, not audio"
    files = {"audio_file": ("document.txt", text_bytes, "text/plain")}
    response = client.post("/api/predict", files=files)

    assert response.status_code == 400
    detail = response.json().get("detail", {})
    assert detail.get("status") == "unsupported_media_type"


def test_predict_real_inference_mono_wav(client):
    """
    Verifies POST /api/predict executes real inference on 16kHz mono audio,
    returning predicted class, probabilities for both classes, duration, sample rate,
    and the authenticity disclaimer.
    """
    wav_bytes = create_test_wav_bytes(duration_seconds=1.5, sample_rate=16000, channels=1)
    files = {"audio_file": ("sample_test.wav", wav_bytes, "audio/wav")}
    response = client.post("/api/predict", files=files)

    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "success"
    assert data["model_ready"] is True
    assert data["predicted_class"] in ("Original", "AI-generated")
    assert "Original" in data["probabilities"]
    assert "AI-generated" in data["probabilities"]

    # Validate probability bounds and sum ~ 1.0
    prob_orig = data["probabilities"]["Original"]
    prob_ai = data["probabilities"]["AI-generated"]
    assert 0.0 <= prob_orig <= 1.0
    assert 0.0 <= prob_ai <= 1.0
    assert round(prob_orig + prob_ai, 2) == 1.0
    assert data["confidence"] == max(prob_orig, prob_ai)

    # Validate metadata
    meta = data["audio_metadata"]
    assert meta["original_sample_rate"] == 16000
    assert meta["processed_sample_rate"] == 16000
    assert meta["channels"] == "mono"
    assert meta["truncated"] is False

    # Validate disclaimer distinguishing confidence from authenticity guarantee
    assert "disclaimer" in data
    assert "guarantee" in data["disclaimer"].lower()


def test_predict_multi_format_flac(client):
    """Verifies POST /api/predict safely decodes alternative formats like FLAC."""
    flac_bytes = create_test_flac_bytes(duration_seconds=1.0, sample_rate=16000)
    files = {"audio_file": ("speech.flac", flac_bytes, "audio/flac")}
    response = client.post("/api/predict", files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["predicted_class"] in ("Original", "AI-generated")


def test_predict_stereo_resampling_and_truncation(client):
    """
    Verifies that a stereo 44.1kHz audio sample longer than 12 seconds
    is safely converted to mono, resampled to 16kHz, and truncated to 12s.
    """
    # 14 seconds of 44.1kHz stereo audio
    wav_bytes = create_test_wav_bytes(duration_seconds=14.0, sample_rate=44100, channels=2)
    files = {"audio_file": ("stereo_long.wav", wav_bytes, "audio/wav")}
    response = client.post("/api/predict", files=files)

    assert response.status_code == 200
    data = response.json()

    meta = data["audio_metadata"]
    assert meta["original_sample_rate"] == 44100
    assert meta["processed_sample_rate"] == 16000
    assert meta["channels"] == "mono (converted from stereo)"
    assert meta["truncated"] is True
    assert meta["processed_duration_seconds"] == 12.0


def test_missing_model_behavior():
    """
    Verifies that if model files are missing, the service raises ModelNotInstalledException
    and returns installation guidance rather than returning fake metrics.
    """
    with tempfile.TemporaryDirectory() as empty_dir:
        service = Wav2Vec2ForensicsService(model_dir=Path(empty_dir))
        assert service.is_model_installed() is False

        status = service.get_model_status()
        assert status["model_installed"] is False
        assert status["model_ready"] is False
        assert status["missing_weights"] is True

        dummy_audio = create_test_wav_bytes(duration_seconds=0.5)

        with pytest.raises(ModelNotInstalledException) as exc_info:
            import asyncio
            asyncio.run(service.predict(dummy_audio, "test.wav"))

        assert "not installed" in exc_info.value.message.lower()

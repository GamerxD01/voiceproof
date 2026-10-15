import io
import logging
import tempfile
from math import gcd
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

import numpy as np
import soundfile as sf
import torch
from transformers import AutoFeatureExtractor, AutoModelForAudioClassification

from config import (
    MODEL_DIR,
    DEVICE_ENV,
    USE_CUDA_ENV,
    TARGET_SAMPLE_RATE,
    MAX_DURATION_SECONDS,
    MAX_SAMPLES,
)

logger = logging.getLogger("voiceproof.model_service")
logging.basicConfig(level=logging.INFO)


class ModelNotInstalledException(Exception):
    """Raised when an inference request is made but the trained model weights are missing or unreadable."""
    def __init__(self, message: str, details: Dict[str, Any]):
        super().__init__(message)
        self.message = message
        self.details = details


class Wav2Vec2ForensicsService:
    """
    Manages one-time loading, status inspection, robust multi-format audio decoding,
    and inference for the fine-tuned Facebook Wav2Vec2 audio deepfake classifier.
    """

    EXPECTED_WEIGHT_FILES = ["model.safetensors", "pytorch_model.bin"]
    EXPECTED_CONFIG_FILES = ["config.json", "preprocessor_config.json"]

    def __init__(self, model_dir: Path = MODEL_DIR):
        self.model_dir = Path(model_dir).resolve()
        self.device = self._resolve_device()
        self.model: Optional[AutoModelForAudioClassification] = None
        self.feature_extractor: Optional[AutoFeatureExtractor] = None
        self.is_loaded: bool = False
        self.load_error: Optional[str] = None

    def _resolve_device(self) -> torch.device:
        """
        Resolves the PyTorch device for inference.
        Defaults to CPU. Enables CUDA only if requested via DEVICE=cuda
        or USE_CUDA=true AND torch.cuda.is_available() is True.
        """
        want_cuda = USE_CUDA_ENV or (DEVICE_ENV in ("cuda", "gpu"))
        if want_cuda:
            if torch.cuda.is_available():
                logger.info("[VoiceProof] CUDA requested and available. Using GPU for inference.")
                return torch.device("cuda")
            else:
                logger.warning(
                    "[VoiceProof] CUDA was requested via environment variable, but torch.cuda.is_available() "
                    "is False. Falling back to CPU inference."
                )
                return torch.device("cpu")
        logger.info("[VoiceProof] Using default CPU device for inference.")
        return torch.device("cpu")

    def get_existing_files(self) -> List[str]:
        """List non-hidden files currently located in the model directory."""
        if not self.model_dir.exists() or not self.model_dir.is_dir():
            return []
        return [f.name for f in self.model_dir.iterdir() if f.is_file() and not f.name.startswith(".")]

    def is_model_installed(self) -> bool:
        """
        Validates whether actual fine-tuned model artifacts exist in model_dir.
        Requires at least:
        1. An architecture config ('config.json')
        2. A weight file ('model.safetensors' or 'pytorch_model.bin')
        """
        if not self.model_dir.exists() or not self.model_dir.is_dir():
            return False

        files = set(self.get_existing_files())
        has_config = "config.json" in files
        has_weights = any(w in files for w in self.EXPECTED_WEIGHT_FILES)
        return has_config and has_weights

    def load_model(self) -> None:
        """
        Loads the fine-tuned model and feature extractor once into memory.
        Uses AutoFeatureExtractor and AutoModelForAudioClassification.
        """
        if self.is_loaded and self.model is not None and self.feature_extractor is not None:
            return

        if not self.is_model_installed():
            status = self.get_model_status()
            self.load_error = "Checkpoint files missing in model directory."
            raise ModelNotInstalledException(
                message="Trained model is not installed. Please verify that config.json and model.safetensors exist in the model/ directory.",
                details=status,
            )

        try:
            logger.info(f"[VoiceProof] Loading Facebook Wav2Vec2 model from: {self.model_dir}")
            
            # Load feature extractor and classifier strictly from local model directory
            self.feature_extractor = AutoFeatureExtractor.from_pretrained(
                str(self.model_dir),
                local_files_only=True
            )
            self.model = AutoModelForAudioClassification.from_pretrained(
                str(self.model_dir),
                local_files_only=True
            )
            
            self.model.to(self.device)
            self.model.eval()
            self.is_loaded = True
            self.load_error = None
            logger.info(f"[VoiceProof] Model successfully loaded on device: {self.device}. id2label: {self.model.config.id2label}")
        except Exception as e:
            self.is_loaded = False
            self.load_error = str(e)
            logger.error(f"[VoiceProof] Failed to load Wav2Vec2 model from {self.model_dir}: {e}")
            raise RuntimeError(f"Failed to load fine-tuned Wav2Vec2 model: {e}")

    def get_model_status(self) -> Dict[str, Any]:
        """Returns structured diagnostic status about the model installation and device."""
        installed = self.is_model_installed()
        files = self.get_existing_files()
        missing_configs = [f for f in self.EXPECTED_CONFIG_FILES if f not in files]
        has_weights = any(w in files for w in self.EXPECTED_WEIGHT_FILES)

        id2label = None
        if self.model is not None and hasattr(self.model, "config") and hasattr(self.model.config, "id2label"):
            id2label = self.model.config.id2label

        return {
            "model_installed": installed,
            "model_ready": self.is_loaded,
            "model_name": "Facebook Wav2Vec2 Audio Deepfake Classifier",
            "model_directory": str(self.model_dir),
            "device": str(self.device),
            "device_requested": DEVICE_ENV,
            "detected_files": files,
            "missing_weights": not has_weights,
            "missing_configs": missing_configs,
            "id2label": id2label,
            "load_error": self.load_error,
            "message": (
                f"Model loaded and ready for real inference on {self.device}."
                if self.is_loaded
                else (
                    f"Model load failed: {self.load_error}"
                    if self.load_error
                    else "Trained weights not found in the 'model/' directory. Prediction endpoint is inactive to prevent fake analysis."
                )
            ),
            "installation_guidance": [
                f"Place your fine-tuned model checkpoint inside: {self.model_dir}",
                "Required files: 'config.json' and 'model.safetensors' (or 'pytorch_model.bin')",
                "Recommended preprocessor file: 'preprocessor_config.json' for 16kHz Wav2Vec2 feature extraction",
            ],
        }

    def _decode_audio_raw(self, file_bytes: bytes, filename: str) -> Tuple[np.ndarray, int]:
        """
        Multi-tier audio decoding supporting WAV, MP3, FLAC, OGG, M4A, AAC, WEBM, OPUS.
        Attempts soundfile first, then temporary file descriptor, then PyAV, and finally scipy wavfile.
        """
        decode_errors = []

        # Tier 1: Try soundfile in-memory BytesIO
        try:
            data, sr = sf.read(io.BytesIO(file_bytes), dtype="float32")
            return data, int(sr)
        except Exception as e1:
            decode_errors.append(f"soundfile(memory): {e1}")

        # Tier 2: Try soundfile with temporary physical file
        ext = Path(filename).suffix.lower() if filename else ".wav"
        try:
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                tmp.write(file_bytes)
                tmp_path = Path(tmp.name)
            try:
                data, sr = sf.read(str(tmp_path), dtype="float32")
                return data, int(sr)
            finally:
                if tmp_path.exists():
                    tmp_path.unlink()
        except Exception as e2:
            decode_errors.append(f"soundfile(file): {e2}")

        # Tier 3: Try PyAV (Universal decoder for M4A, AAC, WEBM, OPUS, MP3, WAV, etc.)
        try:
            import av
            container = av.open(io.BytesIO(file_bytes))
            audio_streams = [s for s in container.streams if s.type == "audio"]
            if audio_streams:
                stream = audio_streams[0]
                sr = stream.rate
                frames = [frame.to_ndarray() for frame in container.decode(stream)]
                if frames:
                    # Concatenate audio frames across time axis
                    audio_raw = np.concatenate(frames, axis=-1)
                    # Convert integer PCM to float32 between -1.0 and 1.0
                    if np.issubdtype(audio_raw.dtype, np.integer):
                        max_val = float(np.iinfo(audio_raw.dtype).max)
                        audio_raw = (audio_raw / max_val).astype(np.float32)
                    else:
                        audio_raw = audio_raw.astype(np.float32)

                    # In PyAV, multi-channel shape is (channels, frames). Transpose to (frames, channels)
                    if audio_raw.ndim == 2:
                        audio_raw = audio_raw.T
                    return audio_raw, int(sr)
        except Exception as e3:
            decode_errors.append(f"PyAV: {e3}")

        # Tier 4: Try scipy.io.wavfile as fallback for WAV
        try:
            import scipy.io.wavfile
            sr, data = scipy.io.wavfile.read(io.BytesIO(file_bytes))
            if np.issubdtype(data.dtype, np.integer):
                max_val = float(np.iinfo(data.dtype).max)
                data = (data / max_val).astype(np.float32)
            else:
                data = data.astype(np.float32)
            return data, int(sr)
        except Exception as e4:
            decode_errors.append(f"scipy.wavfile: {e4}")

        raise ValueError(
            f"Could not decode audio stream '{filename}'. Details: {'; '.join(decode_errors)}"
        )

    def preprocess_audio(self, file_bytes: bytes, filename: str = "") -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Decodes the audio safely, converts stereo to mono,
        resamples to 16,000 Hz, and truncates to 12.0 seconds (192,000 samples)
        matching the training preprocessing pipeline.
        """
        audio_data, original_sr = self._decode_audio_raw(file_bytes, filename)

        # Check stereo vs mono conversion
        was_stereo = False
        if audio_data.ndim > 1:
            was_stereo = True
            # Average across channels (frames, channels)
            audio_data = np.mean(audio_data, axis=-1)

        audio_data = np.squeeze(audio_data).astype(np.float32)
        if audio_data.ndim != 1 or len(audio_data) == 0:
            raise ValueError(f"Decoded audio file '{filename}' contains zero samples or invalid dimensions.")

        original_duration = round(float(len(audio_data)) / float(original_sr), 3)

        # Resample to 16 kHz if necessary
        if original_sr != TARGET_SAMPLE_RATE:
            import scipy.signal
            g = gcd(TARGET_SAMPLE_RATE, original_sr)
            up = TARGET_SAMPLE_RATE // g
            down = original_sr // g
            audio_data = scipy.signal.resample_poly(audio_data, up, down).astype(np.float32)

        # Truncate to 12 seconds (192,000 samples)
        was_truncated = False
        if len(audio_data) > MAX_SAMPLES:
            audio_data = audio_data[:MAX_SAMPLES]
            was_truncated = True

        processed_duration = round(float(len(audio_data)) / float(TARGET_SAMPLE_RATE), 3)

        metadata = {
            "original_sample_rate": int(original_sr),
            "original_duration_seconds": original_duration,
            "processed_sample_rate": TARGET_SAMPLE_RATE,
            "processed_duration_seconds": processed_duration,
            "channels": "mono (converted from stereo)" if was_stereo else "mono",
            "truncated": was_truncated,
            "max_duration_seconds": MAX_DURATION_SECONDS,
        }
        return audio_data, metadata

    async def predict(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Executes real inference on an uploaded audio file using the preloaded model.
        Never fabricates mock predictions.
        """
        if not self.is_loaded or self.model is None or self.feature_extractor is None:
            self.load_model()

        # Preprocess according to model training parameters
        audio_array, audio_metadata = self.preprocess_audio(file_bytes, filename)

        # Prepare inputs via AutoFeatureExtractor
        inputs = self.feature_extractor(
            audio_array,
            sampling_rate=TARGET_SAMPLE_RATE,
            return_tensors="pt"
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        # Perform forward pass
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=-1)[0]

        # Extract classification labels and probabilities
        id2label = getattr(self.model.config, "id2label", {0: "Original", 1: "AI-generated"})
        
        # Standardize class 0 and 1
        label_0 = id2label.get(0, id2label.get("0", "Original"))
        label_1 = id2label.get(1, id2label.get("1", "AI-generated"))

        prob_0 = round(float(probs[0].item()), 4)
        prob_1 = round(float(probs[1].item()), 4)

        pred_index = int(torch.argmax(probs).item())
        predicted_class = id2label.get(pred_index, id2label.get(str(pred_index), f"Class {pred_index}"))
        confidence = round(max(prob_0, prob_1), 4)

        # Explicit authenticity disclaimer to distinguish confidence from guarantee
        disclaimer = (
            "VoiceProof classification reflects statistical model confidence from fine-tuned "
            "Facebook Wav2Vec2 representations. Confidence scores indicate acoustic pattern alignment "
            "and do not constitute an absolute legal or forensic guarantee of authenticity. "
            "Results should be considered alongside contextual verification."
        )

        return {
            "status": "success",
            "model_ready": True,
            "filename": filename,
            "predicted_class": predicted_class,
            "predicted_label": predicted_class,
            "confidence": confidence,
            "probabilities": {
                label_0: prob_0,
                label_1: prob_1,
            },
            "audio_metadata": audio_metadata,
            "device": str(self.device),
            "disclaimer": disclaimer,
        }


# Singleton service instance
forensics_service = Wav2Vec2ForensicsService()

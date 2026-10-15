# VoiceProof — Model Storage Directory

This directory is designated for your local fine-tuned **Facebook Wav2Vec2** audio deepfake detection model.

> **Privacy & Security Note**:
> Actual model weight files (`*.bin`, `*.safetensors`, `*.pt`, `*.onnx`) are automatically ignored by `.gitignore` to prevent committing gigabytes of binaries into version control.

---

## Expected Model Artifacts

When you train or export your fine-tuned Facebook Wav2Vec2 model (e.g. from Hugging Face `transformers` or PyTorch), place the saved directory contents directly here or in a named subfolder:

```text
model/
├── config.json                     # Model architecture and classification head configuration
├── preprocessor_config.json        # Audio feature extractor config (Wav2Vec2Processor, 16 kHz sampling)
├── model.safetensors               # (or pytorch_model.bin) Fine-tuned classification weights
├── special_tokens_map.json         # (Optional) Tokenizer / mapping definitions
└── vocab.json                      # (Optional) Vocabulary config
```

### Classification Labels
The model classification head should map outputs to binary or multiclass forensics classes:
- Label `0`: `Real / Bonafide Human Voice`
- Label `1`: `Deepfake / Synthetic / Cloned Voice`

---

## How to Save Your Model Here

If you trained your model using the Hugging Face `Trainer` or PyTorch in a Python script or Jupyter Notebook:

```python
# In your training script:
model.save_pretrained("./model")
processor.save_pretrained("./model")
```

Once these files are in place, restart the backend service or invoke the `/api/health` endpoint. The backend will detect the checkpoint and transition to `MODEL_READY` mode.

---

## Verification

When the files are placed in this folder, you can verify detection via:
1. Checking `GET http://localhost:8000/api/health` — it will return `"model_installed": true`.
2. Inspecting the top status bar in the VoiceProof frontend dashboard.

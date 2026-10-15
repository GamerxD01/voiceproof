import React, { useState, useRef } from 'react'
import {
  UploadCloud,
  FileAudio,
  Play,
  Pause,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Binary,
  Layers,
  ShieldAlert,
  ShieldCheck,
  Info,
} from 'lucide-react'
import { uploadAudioForForensics, type PredictionResult } from '../services/api'

export const AudioUploader: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [result, setResult] = useState<PredictionResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState<boolean>(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFile = (file: File) => {
    setErrorMsg(null)
    setResult(null)
    setIsPlaying(false)

    // Allowed extensions
    const allowed = ['.wav', '.mp3', '.flac', '.ogg', '.m4a', '.aac', '.webm', '.weba', '.opus', '.wma']
    const hasValidExt = allowed.some((ext) => file.name.toLowerCase().endsWith(ext))
    if (!hasValidExt) {
      setErrorMsg(`Unsupported audio format. Supported formats: ${allowed.join(', ')}`)
      return
    }

    // Set file and preview URL
    setSelectedFile(file)
    const url = URL.createObjectURL(file)
    setAudioUrl(url)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleReset = () => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setSelectedFile(null)
    setAudioUrl(null)
    setIsPlaying(false)
    setResult(null)
    setErrorMsg(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async () => {
    if (!selectedFile) return
    setIsSubmitting(true)
    setErrorMsg(null)
    setResult(null)

    try {
      const response = await uploadAudioForForensics(selectedFile)
      setResult(response)

      // If backend returned a 400 error status, surface the exact error message
      if (response.status !== 'success' && response.status !== 'model_not_installed') {
        setErrorMsg(response.message || 'The server rejected this audio file.')
      }
    } catch (err: any) {
      setErrorMsg(
        err?.message || 'Unable to communicate with the forensics backend service. Ensure backend is running.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const isAiGenerated = result?.predicted_class === 'AI-generated'
  const origProb = result?.probabilities?.Original ?? 0
  const aiProb = result?.probabilities?.['AI-generated'] ?? 0

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center space-x-2">
            <FileAudio className="w-5 h-5 text-indigo-400" />
            <span>Audio Forensics Ingestion</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Submit a voice sample to test the pipeline against your Facebook Wav2Vec2 model.
          </p>
        </div>
        {selectedFile && (
          <button
            onClick={handleReset}
            className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800/60 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Upload Zone */}
      {!selectedFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-500 bg-indigo-950/20'
              : 'border-slate-800 hover:border-slate-700 bg-slate-950/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".wav,.mp3,.flac,.ogg,.m4a,.aac,.webm,.weba,.opus,.wma,audio/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0])
              }
            }}
          />
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-200">
                Drag and drop audio file, or <span className="text-indigo-400 underline">browse</span>
              </p>
              <p className="text-xs text-slate-500">
                Supports WAV, MP3, FLAC, OGG, M4A, AAC, WEBM (resampled to 16 kHz mono, max 12s)
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Selected Audio Preview */
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 truncate">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <FileAudio className="w-5 h-5" />
              </div>
              <div className="truncate">
                <p className="text-sm font-medium text-slate-200 truncate">{selectedFile.name}</p>
                <p className="text-xs text-slate-400">
                  {formatFileSize(selectedFile.size)} • {selectedFile.type || 'audio file'}
                </p>
              </div>
            </div>

            <button
              onClick={togglePlay}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
          </div>

          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              className="w-full mt-2 h-8 accent-indigo-500"
              controls
            />
          )}

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all shadow-sm hover:shadow-indigo-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing through Wav2Vec2...</span>
                </>
              ) : (
                <>
                  <Binary className="w-4 h-4" />
                  <span>Execute Model Prediction</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Explicit Error banner for 400 Bad Request, Decode, or Network Errors */}
      {errorMsg && (
        <div className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-4 text-xs text-rose-300 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-rose-200 text-sm">Forensics Analysis Error</span>
            <p className="leading-relaxed text-rose-300/90">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Model Not Installed Diagnostic Report */}
      {result && result.status === 'model_not_installed' && (
        <div className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-5 space-y-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-800/60 text-amber-400 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-semibold text-amber-200">
                  Backend Check: Model Weights Not Installed
                </h4>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800/60">
                  HTTP 503
                </span>
              </div>
              <p className="text-xs text-amber-300/90 leading-relaxed">{result.message}</p>
            </div>
          </div>

          <div className="rounded-lg border border-amber-900/40 bg-slate-950/60 p-4 space-y-3">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Next Steps to Connect Your Fine-Tuned Model</span>
            </h5>
            <ul className="text-xs text-slate-400 space-y-2 list-none pl-0">
              {result.guidance?.map((step, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <span className="text-indigo-400 font-mono text-[11px] font-semibold shrink-0 mt-0.5">
                    {idx + 1}.
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Real Model Prediction Verdict */}
      {result && result.status === 'success' && (
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 space-y-5">
          {/* Main Verdict Card */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div
                className={`p-3 rounded-xl border mt-0.5 ${
                  isAiGenerated
                    ? 'bg-rose-950/40 border-rose-800/50 text-rose-400'
                    : 'bg-emerald-950/40 border-emerald-800/50 text-emerald-400'
                }`}
              >
                {isAiGenerated ? <ShieldAlert className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Acoustic Forensics Classification
                </span>
                <div className="flex items-center space-x-3 mt-0.5">
                  <h4
                    className={`text-xl font-bold tracking-tight ${
                      isAiGenerated ? 'text-rose-300' : 'text-emerald-300'
                    }`}
                  >
                    {result.predicted_class}
                  </h4>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-medium border ${
                      isAiGenerated
                        ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                        : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                    }`}
                  >
                    {((result.confidence ?? 0) * 100).toFixed(1)}% Confidence
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right text-[11px] font-mono text-slate-500">
              <span>Device: {result.device || 'CPU'}</span>
            </div>
          </div>

          {/* Probabilities Breakdown */}
          <div className="space-y-3 pt-2 border-t border-slate-800/70">
            <div className="text-xs font-semibold text-slate-300">Class Probability Distribution</div>
            
            {/* AI-Generated Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">AI-generated (Synthetic Speech)</span>
                <span className="text-rose-400 font-semibold">{(aiProb * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-rose-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(Math.max(aiProb * 100, 0), 100)}%` }}
                />
              </div>
            </div>

            {/* Original Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">Original (Bonafide Human Voice)</span>
                <span className="text-emerald-400 font-semibold">{(origProb * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(Math.max(origProb * 100, 0), 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Audio Preprocessing & Pipeline Specs */}
          {result.audio_metadata && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/70 text-xs font-mono">
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Original SR</span>
                <span className="text-slate-200">{result.audio_metadata.original_sample_rate} Hz</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Processed SR</span>
                <span className="text-indigo-300">{result.audio_metadata.processed_sample_rate} Hz</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Duration</span>
                <span className="text-slate-200">
                  {result.audio_metadata.processed_duration_seconds}s
                  {result.audio_metadata.truncated && (
                    <span className="text-amber-400 text-[10px] ml-1">(trunc)</span>
                  )}
                </span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Channels</span>
                <span className="text-slate-200 truncate">{result.audio_metadata.channels}</span>
              </div>
            </div>
          )}

          {/* Disclaimer (Distinguishing confidence from absolute authenticity guarantee) */}
          {result.disclaimer && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 flex items-start space-x-2 text-[11px] text-slate-400">
              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{result.disclaimer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

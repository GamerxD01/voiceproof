import React from 'react'
import { HardDrive, AlertTriangle, CheckCircle2, FolderKey, FileCode2 } from 'lucide-react'
import type { SystemHealth } from '../services/api'

interface ModelStatusBannerProps {
  health: SystemHealth | null
}

export const ModelStatusBanner: React.FC<ModelStatusBannerProps> = ({ health }) => {
  const isInstalled = health?.model_installed ?? false

  return (
    <div
      className={`rounded-xl border p-5 transition-all ${
        isInstalled
          ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
          : 'bg-slate-900/60 border-slate-800 text-slate-300'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div
            className={`p-2.5 rounded-lg border mt-0.5 ${
              isInstalled
                ? 'bg-emerald-900/40 border-emerald-700/50 text-emerald-400'
                : 'bg-amber-950/30 border-amber-800/40 text-amber-400'
            }`}
          >
            {isInstalled ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-semibold text-slate-100">
                {isInstalled ? 'Model Ready For Live Inference' : 'Model Pending Installation'}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                Facebook Wav2Vec2
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-3xl">
              {isInstalled
                ? 'Your fine-tuned Wav2Vec2 classification weights are active in the local backend.'
                : 'VoiceProof enforces strict ML integrity. Predictions and forensics scores are disabled until your fine-tuned Facebook Wav2Vec2 checkpoint is placed in the local model directory.'}
            </p>
          </div>
        </div>

        {/* Directory Path Info */}
        <div className="shrink-0 flex items-center gap-2 bg-slate-950/80 px-3 py-2 rounded-lg border border-slate-800/80 text-xs font-mono text-slate-300">
          <FolderKey className="w-4 h-4 text-indigo-400" />
          <span>model/</span>
        </div>
      </div>

      {!isInstalled && (
        <div className="mt-4 pt-4 border-t border-slate-800/70 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="flex items-start space-x-2 text-slate-400">
            <FileCode2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-200 font-medium">config.json</span>
              <p className="text-[11px] text-slate-400">Architecture & label mapping</p>
            </div>
          </div>
          <div className="flex items-start space-x-2 text-slate-400">
            <HardDrive className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-200 font-medium">model.safetensors / pytorch_model.bin</span>
              <p className="text-[11px] text-slate-400">Fine-tuned neural network weights</p>
            </div>
          </div>
          <div className="flex items-start space-x-2 text-slate-400">
            <FileCode2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-200 font-medium">preprocessor_config.json</span>
              <p className="text-[11px] text-slate-400">16kHz audio feature extractor settings</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import React from 'react'
import {
  Layers,
  Cpu,
  Sliders,
  Sparkles,
  Binary,
  Clock,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'

const benchmarkData = [
  { duration: '1s audio', cpu_ms: 120, gpu_ms: 25 },
  { duration: '3s audio', cpu_ms: 290, gpu_ms: 45 },
  { duration: '5s audio', cpu_ms: 450, gpu_ms: 70 },
  { duration: '10s audio', cpu_ms: 820, gpu_ms: 110 },
]

export const PipelineCard: React.FC = () => {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-100 flex items-center space-x-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <span>Facebook Wav2Vec2 Forensics Architecture</span>
          </h3>
          <p className="text-xs text-slate-400">
            End-to-end neural audio representation for synthetic speech and deepfake artifact detection.
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full font-mono bg-slate-800 text-slate-300 border border-slate-700">
          PyTorch + Transformers
        </span>
      </div>

      {/* Pipeline Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3.5 space-y-1.5">
          <div className="flex items-center space-x-2 text-indigo-400 font-medium">
            <Sliders className="w-4 h-4" />
            <span>1. Preprocessing</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            Converts audio to 16,000 Hz single-channel mono float32 tensor via <code className="text-slate-300">Wav2Vec2Processor</code>.
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3.5 space-y-1.5">
          <div className="flex items-center space-x-2 text-indigo-400 font-medium">
            <Cpu className="w-4 h-4" />
            <span>2. Feature Encoder</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            7-layer temporal convolutional network maps raw waveforms into 512-dim latent representations.
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3.5 space-y-1.5">
          <div className="flex items-center space-x-2 text-indigo-400 font-medium">
            <Sparkles className="w-4 h-4" />
            <span>3. Transformer Context</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            Multi-head self-attention captures acoustic artifacts, phase mismatches, and vocoder anomalies.
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3.5 space-y-1.5">
          <div className="flex items-center space-x-2 text-indigo-400 font-medium">
            <Binary className="w-4 h-4" />
            <span>4. Forensics Head</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            Classification projection layer outputs logits for real human voice vs synthetic deepfake audio.
          </p>
        </div>
      </div>

      {/* Latency Reference Chart */}
      <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>Expected Inference Latency Reference (CPU vs GPU)</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Benchmark Reference</span>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={benchmarkData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="duration" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit="ms" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                  color: '#f8fafc',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
              <Bar dataKey="cpu_ms" name="CPU Inference (ms)" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gpu_ms" name="CUDA GPU Inference (ms)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

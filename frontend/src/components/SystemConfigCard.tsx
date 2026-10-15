import React from 'react'
import { Settings, Server, Globe, Terminal } from 'lucide-react'
import { API_BASE_URL, type SystemHealth } from '../services/api'

interface SystemConfigCardProps {
  health: SystemHealth | null
}

export const SystemConfigCard: React.FC<SystemConfigCardProps> = ({ health }) => {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-100 flex items-center space-x-2">
          <Settings className="w-5 h-5 text-indigo-400" />
          <span>Environment & Service Configuration</span>
        </h3>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
          Local Monorepo
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
        {/* Frontend Config */}
        <div className="rounded-lg border border-slate-800/80 bg-slate-950/50 p-4 space-y-2">
          <div className="flex items-center space-x-2 text-indigo-400 font-sans font-medium text-xs">
            <Globe className="w-4 h-4" />
            <span>Frontend Environment</span>
          </div>
          <div className="space-y-1.5 text-slate-300">
            <div className="flex justify-between border-b border-slate-800/60 pb-1">
              <span className="text-slate-500">VITE_API_BASE_URL</span>
              <span className="text-indigo-300 truncate max-w-[180px]">{API_BASE_URL}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/60 pb-1">
              <span className="text-slate-500">Framework</span>
              <span>React 19 + TypeScript + Vite 6</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Styling</span>
              <span>Tailwind CSS</span>
            </div>
          </div>
        </div>

        {/* Backend Config */}
        <div className="rounded-lg border border-slate-800/80 bg-slate-950/50 p-4 space-y-2">
          <div className="flex items-center space-x-2 text-indigo-400 font-sans font-medium text-xs">
            <Server className="w-4 h-4" />
            <span>Backend Service</span>
          </div>
          <div className="space-y-1.5 text-slate-300">
            <div className="flex justify-between border-b border-slate-800/60 pb-1">
              <span className="text-slate-500">Service Status</span>
              <span className={health ? 'text-emerald-400' : 'text-rose-400'}>
                {health ? 'Online' : 'Disconnected'}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-800/60 pb-1">
              <span className="text-slate-500">Compute Device</span>
              <span>{health?.device || 'Unknown (Backend Offline)'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Target Model</span>
              <span className="truncate max-w-[170px]">Facebook Wav2Vec2</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick run command tip */}
      <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3.5 flex items-start space-x-3 text-xs">
        <Terminal className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-slate-400 space-y-1">
          <p className="text-slate-200 font-medium">To run the full-stack locally on Windows:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px] text-slate-300 pt-1">
            <code className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
              Backend: .\.venv\Scripts\uvicorn.exe main:app --reload
            </code>
            <code className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
              Frontend: npm run dev (in frontend/)
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}

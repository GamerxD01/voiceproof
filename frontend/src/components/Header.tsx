import React from 'react'
import { ShieldCheck, Activity, Cpu, RefreshCw, AlertCircle } from 'lucide-react'
import type { SystemHealth } from '../services/api'

interface HeaderProps {
  health: SystemHealth | null
  isLoading: boolean
  error: string | null
  onRefresh: () => void
}

export const Header: React.FC<HeaderProps> = ({ health, isLoading, error, onRefresh }) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-lg tracking-tight text-slate-100">VoiceProof</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-950/70 text-indigo-300 border border-indigo-800/60">
                Wav2Vec2 Forensics
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              AI Voice Deepfake Detection & Synthetic Speech Analysis
            </p>
          </div>
        </div>

        {/* Backend status indicators */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-xs">
            {isLoading ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 animate-pulse">
                <RefreshCw className="w-3 h-3 mr-1.5 animate-spin text-slate-400" />
                Connecting...
              </span>
            ) : error ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-rose-950/50 text-rose-300 border border-rose-800/60">
                <AlertCircle className="w-3 h-3 mr-1.5 text-rose-400" />
                Backend Offline
              </span>
            ) : health?.model_installed ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/50 text-emerald-300 border border-emerald-800/60">
                <Activity className="w-3 h-3 mr-1.5 text-emerald-400" />
                Model Ready ({health.device})
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-950/40 text-amber-300 border border-amber-800/50">
                <Cpu className="w-3 h-3 mr-1.5 text-amber-400" />
                Model Pending Installation
              </span>
            )}
          </div>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh backend status"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-md border border-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  )
}

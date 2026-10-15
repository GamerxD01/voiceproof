import { useState, useEffect, useCallback } from 'react'
import { Header } from './components/Header'
import { ModelStatusBanner } from './components/ModelStatusBanner'
import { AudioUploader } from './components/AudioUploader'
import { PipelineCard } from './components/PipelineCard'
import { SystemConfigCard } from './components/SystemConfigCard'
import { fetchHealth, type SystemHealth } from './services/api'
import { Shield, Sparkles, BookOpen, Terminal, CheckCircle2 } from 'lucide-react'

export function App() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const checkBackend = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchHealth()
      setHealth(data)
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to backend service')
      setHealth(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkBackend()
  }, [checkBackend])

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/20 selection:text-indigo-200">
      {/* Top Header */}
      <Header
        health={health}
        isLoading={isLoading}
        error={error}
        onRefresh={checkBackend}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section */}
        <div className="space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Voice Forensics • College ML Project</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-100">
            VoiceProof — AI Voice Deepfake Detector
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-3xl leading-relaxed">
            A real machine-learning system designed to detect synthetic speech, voice cloning, and audio
            deepfakes using a fine-tuned <strong className="text-slate-200">Facebook Wav2Vec2</strong> audio classification
            model. Zero fabricated metrics — strictly verified AI forensics.
          </p>
        </div>

        {/* Model Status Card */}
        <ModelStatusBanner health={health} />

        {/* Core Audio Upload & Testing Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            <AudioUploader />
            <SystemConfigCard health={health} />
          </div>

          <div className="lg:col-span-5 space-y-6">
            <PipelineCard />

            {/* Quick Developer Guide */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3 text-xs">
              <div className="flex items-center space-x-2 text-slate-200 font-semibold">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>Next Milestone Checklist</span>
              </div>
              <ul className="space-y-2 text-slate-400">
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>React + Vite + Tailwind frontend initialized</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>FastAPI service scaffolded with health & predict endpoints</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Terminal className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Place your trained weights in <code className="text-slate-200 bg-slate-800 px-1 py-0.5 rounded">model/</code></span>
                </li>
                <li className="flex items-start space-x-2">
                  <Terminal className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>Install ML dependencies: <code className="text-slate-200 bg-slate-800 px-1 py-0.5 rounded">pip install -r backend/requirements-ml.txt</code></span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span>VoiceProof AI Audio Forensics — College ML Project</span>
          </div>
          <div>
            Built with React, TypeScript, Tailwind CSS, FastAPI & Facebook Wav2Vec2
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App

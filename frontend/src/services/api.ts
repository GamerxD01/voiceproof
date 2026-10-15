export interface SystemHealth {
  status: string
  service: string
  version: string
  model_installed: boolean
  model_ready?: boolean
  model_name?: string
  model_path?: string
  device: string
  device_requested?: string
  message: string
}

export interface AudioMetadata {
  original_sample_rate: number
  original_duration_seconds: number
  processed_sample_rate: number
  processed_duration_seconds: number
  channels: string
  truncated: boolean
  max_duration_seconds: number
}

export interface PredictionResult {
  status: 'model_not_installed' | 'success' | 'error'
  message?: string
  model_ready: boolean
  filename?: string
  file_size_bytes?: number
  content_type?: string
  predicted_class?: 'Original' | 'AI-generated' | string
  predicted_label?: string
  confidence?: number
  probabilities?: {
    Original?: number
    'AI-generated'?: number
    [key: string]: number | undefined
  }
  audio_metadata?: AudioMetadata
  disclaimer?: string
  device?: string
  detail?: string
  guidance?: string[]
}

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:8000'

export async function fetchHealth(): Promise<SystemHealth> {
  const response = await fetch(`${API_BASE_URL}/api/health`, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Health check failed with status: ${response.status}`)
  }

  return response.json()
}

export async function uploadAudioForForensics(file: File): Promise<PredictionResult> {
  const formData = new FormData()
  formData.append('audio_file', file)

  const response = await fetch(`${API_BASE_URL}/api/predict`, {
    method: 'POST',
    body: formData,
  })

  const data = await response.json()

  if (!response.ok) {
    const errorMsg = data?.detail?.message || data?.message || data?.detail || `Server returned ${response.status}`
    const errorResult: PredictionResult = {
      status: data?.detail?.status || 'error',
      message: errorMsg,
      model_ready: false,
      detail: typeof data?.detail === 'string' ? data.detail : JSON.stringify(data.detail),
      guidance: data?.detail?.guidance || data?.guidance,
      filename: file.name,
      file_size_bytes: file.size,
      content_type: file.type,
    }
    return errorResult
  }

  return data
}

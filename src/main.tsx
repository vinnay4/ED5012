import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App'

declare global {
  interface Window {
    __extract?: (src: string, fps: number) => Promise<string>
  }
}

// Hook used by scripts/extract-poses.mjs to regenerate the cached demo
// landmarks with exactly the same in-browser pipeline the app uses.
window.__extract = async (src: string, fps: number) => {
  const { extractPoseTrack } = await import('./lib/pose/landmarker')
  return JSON.stringify(await extractPoseTrack(src, { sampleFps: fps, variant: 'full' }))
}

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

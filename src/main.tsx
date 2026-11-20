import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App'
import { DEMO_CLIPS } from './lib/demo/library'

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

// Video elements fetch with Range headers, and 206 responses are not cacheable,
// so the demo videos are fetched whole once the service worker controls the page.
// The runtime cache then serves range requests from the cached copy offline.
function warmDemoVideos() {
  for (const clip of DEMO_CLIPS) if (clip.video) fetch(clip.video).catch(() => undefined)
}

registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration || !('serviceWorker' in navigator)) return
    if (navigator.serviceWorker.controller) warmDemoVideos()
    else navigator.serviceWorker.addEventListener('controllerchange', warmDemoVideos, { once: true })
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

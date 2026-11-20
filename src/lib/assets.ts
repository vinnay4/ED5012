declare global {
  const __MEDIAPIPE_VERSION__: string
  interface Window {
    /** Filled by scripts/build-single.mjs with data URLs for the demo files. */
    __FD_ASSETS?: Record<string, string>
  }
}

/** True in the self-contained single-HTML build (`npm run build:single`). */
export const SINGLE_FILE = import.meta.env.MODE === 'single'

export function assetUrl(path: string) {
  return window.__FD_ASSETS?.[path] ?? `${import.meta.env.BASE_URL}${path}`
}

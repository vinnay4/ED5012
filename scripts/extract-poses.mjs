// Runs the app's own in-browser MediaPipe pipeline (headless Chrome) over the
// bundled sample clips and writes the pose tracks used by demo mode.
// Usage: start `npm run dev` (or `npm run preview`), then
//   node scripts/extract-poses.mjs http://localhost:5173/
import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'node:fs'

const baseUrl = process.argv[2] ?? 'http://localhost:5173/'
const all = [
  { id: 'side-kettlebell-squat', fps: 15 },
  { id: 'oblique-barbell-back-squat', fps: 15 },
]
const only = process.argv.slice(3)
const clips = only.length ? all.filter((c) => only.includes(c.id)) : all

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
})
const page = await browser.newPage()
page.on('console', (m) => {
  const t = m.text()
  if (!t.startsWith('{')) console.log('[page]', t)
})
await page.goto(baseUrl)
await page.waitForFunction(() => typeof window.__extract === 'function')
mkdirSync('public/samples', { recursive: true })
for (const clip of clips) {
  const started = Date.now()
  const json = await page.evaluate(([src, fps]) => window.__extract(src, fps), [`samples/${clip.id}.mp4`, clip.fps])
  writeFileSync(`public/samples/${clip.id}.pose.json`, json)
  const track = JSON.parse(json)
  const detected = track.frames.filter(Boolean).length
  console.log(`${clip.id}: ${detected}/${track.frames.length} frames with a pose, ${(Date.now() - started) / 1000}s, ${track.model}`)
}
await browser.close()

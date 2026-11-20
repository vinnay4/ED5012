// Captures the screenshots used in docs/REPORT.md. Needs `npm run dev` running.
// Usage: node scripts/docs-shots.mjs [baseUrl]
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const base = process.argv[2] ?? 'http://127.0.0.1:5173/'
const out = 'docs/img'
mkdirSync(out, { recursive: true })

const browser = await chromium.launch({ channel: 'chrome', args: ['--use-gl=angle', '--use-angle=swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const go = async (hash) => {
  await page.goto(`${base}#${hash}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
}
const analyse = async (answer) => {
  await page.getByRole('button', { name: /Analyse this set/ }).click()
  await page.getByText('Before you look').waitFor({ timeout: 20000 })
  if (answer === 'shot') return
  await page.getByRole('button', { name: answer ?? 'No change' }).click()
  await page.waitForTimeout(400)
}
// Captures `height` px of the full page starting just above the first element matching `text`.
const region = async (name, text, height = 900) => {
  const y = await page
    .getByText(text, { exact: false })
    .first()
    .evaluate((el) => el.getBoundingClientRect().top + window.scrollY)
  const total = await page.evaluate(() => document.documentElement.scrollHeight)
  const top = Math.max(0, Math.min(y - 24, total - height))
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true, clip: { x: 0, y: top, width: 1440, height: Math.min(height, total - top) } })
  console.log('wrote', name)
}
const shot = async (name, clip) => {
  await page.screenshot({ path: `${out}/${name}.png`, clip })
  console.log('wrote', name)
}

await go('/')
await shot('landing')

await go('/session/sim-side')
await analyse('shot')
await shot('perception-check')
await page.getByRole('button', { name: 'No change' }).click()
await page.waitForTimeout(300)
await page.locator('button[title^="Rep 7:"]').click()
await page.getByRole('button', { name: 'Analyst' }).click()
await page.getByRole('button', { name: 'Play' }).first().click()
await page.evaluate(() => window.scrollTo(0, 0))
await page.waitForTimeout(4700)
await shot('player-cue', { x: 0, y: 56, width: 1440, height: 760 })
await page.getByRole('button', { name: 'Pause' }).first().click()
await region('overview', 'Self-perception check:', 1000)
await page.getByRole('button', { name: 'Rep by rep', exact: true }).click()
await region('rep-by-rep', 'Squat depth', 700)
await page.getByRole('button', { name: 'Feedback log', exact: true }).click()
await region('feedback-log', 'Cue timeline', 520)
await page.getByRole('button', { name: 'Ground truth', exact: true }).click()
await region('ground-truth', 'Simulated set with known ground truth', 760)

await go('/session/side-kettlebell-squat')
await analyse()
await page.getByRole('button', { name: 'Biomechanics', exact: true }).click()
await region('biomechanics', 'Hip depth over time', 1000)
await page.getByRole('button', { name: 'Body proportions', exact: true }).click()
await region('body-proportions', 'Segment proportions', 380)

await go('/session/oblique-barbell-back-squat')
await analyse()
await region('oblique-honest', 'Reps counted', 560)

await go('/validation')
await page.getByRole('button', { name: /Run noise sweep/ }).click()
await page.waitForTimeout(6000)
await shot('validation')
await region('noise-sweep', '3. Robustness', 560)

await go('/method')
await region('method-4w1h', 'Who, when and where', 700)

await go('/study')
await shot('study')

await page.setViewportSize({ width: 390, height: 844 })
await go('/session/sim-front')
await analyse()
await shot('mobile-session')

await browser.close()

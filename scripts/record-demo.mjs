// Records a silent backup walkthrough of the demo to docs/media/FormDrift_demo_backup.webm.
// Needs `npm run dev` (or `npm run preview`) running. Usage: node scripts/record-demo.mjs [baseUrl]
import { chromium } from 'playwright'
import { mkdirSync, renameSync } from 'node:fs'

const base = process.argv[2] ?? 'http://127.0.0.1:5173/'
mkdirSync('docs/media', { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-gl=angle', '--use-angle=swiftshader'] })
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: '/tmp/demo-video', size: { width: 1280, height: 720 } } })
const page = await context.newPage()
const wait = (ms) => page.waitForTimeout(ms)
const smoothScroll = async (y, ms = 900) => {
  await page.evaluate(
    ([y, ms]) => {
      const start = window.scrollY
      const t0 = performance.now()
      const step = (t) => {
        const k = Math.min(1, (t - t0) / ms)
        window.scrollTo(0, start + (y - start) * (0.5 - Math.cos(Math.PI * k) / 2))
        if (k < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    },
    [y, ms],
  )
  await wait(ms + 200)
}
const scrollToText = async (text, offset = 80) => {
  const y = await page
    .getByText(text)
    .first()
    .evaluate((el) => el.getBoundingClientRect().top + window.scrollY)
  await smoothScroll(Math.max(0, y - offset))
}
const analyse = async (answer) => {
  await page.getByRole('button', { name: /Analyse this set/ }).click()
  await page.getByText('Before you look').waitFor({ timeout: 20000 })
  await wait(1800)
  await page.getByRole('button', { name: answer, exact: true }).click()
  await wait(1500)
}

await page.goto(base)
await page.waitForLoadState('networkidle')
await wait(3000)
await page.getByRole('link', { name: /Open the one-click demo/ }).click()
await wait(1500)
await analyse('Rep 8')
await page.locator('button[title^="Rep 4:"]').click()
await page.locator('select[aria-label="Playback speed"]').selectOption('1.5')
await page.getByRole('button', { name: 'Play' }).first().click()
await wait(23000)
await scrollToText('Self-perception check:')
await wait(3500)
await scrollToText('What changed, why it matters')
await wait(4000)
await scrollToText('Self-perception check:')
await page.getByRole('button', { name: 'Feedback log', exact: true }).click()
await wait(3500)
await page.getByRole('button', { name: 'Ground truth', exact: true }).click()
await wait(3500)

await page.goto(`${base}#/session/side-kettlebell-squat`)
await wait(1200)
await analyse('No change')
await page.locator('select[aria-label="Playback speed"]').selectOption('2')
await page.getByRole('button', { name: 'Play' }).first().click()
await wait(9000)
await scrollToText('Self-perception check:')
await wait(2500)
await page.getByRole('button', { name: 'Biomechanics', exact: true }).click()
await wait(1000)
await scrollToText('Estimated L5/S1')
await wait(3500)

await page.goto(`${base}#/session/oblique-barbell-back-squat`)
await wait(1200)
await analyse('No change')
await scrollToText('Reps counted')
await wait(4500)

await page.goto(`${base}#/validation`)
await wait(3500)

const video = page.video()
await context.close()
renameSync(await video.path(), 'docs/media/FormDrift_demo_backup.webm')
await browser.close()
console.log('wrote docs/media/FormDrift_demo_backup.webm')

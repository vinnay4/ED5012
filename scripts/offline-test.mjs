// Verifies the PWA works offline after one online visit. Needs `npm run preview` running.
// Usage: node scripts/offline-test.mjs [baseUrl]
import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://127.0.0.1:4173/'
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'] })
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await context.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))

await page.goto(base)
await page.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 30000 })
await page.waitForTimeout(4000)
const cached = await page.evaluate(async () => {
  const names = await caches.keys()
  const out = {}
  for (const n of names) out[n] = (await (await caches.open(n)).keys()).length
  return out
})
console.log('caches', cached)

await context.setOffline(true)
let failed = 0
for (const id of ['sim-side', 'side-kettlebell-squat', 'oblique-barbell-back-squat']) {
  await page.goto(`${base}#/session/${id}`)
  await page.getByRole('button', { name: /Analyse this set/ }).click({ timeout: 10000 })
  await page.getByRole('button', { name: /Skip and show results/ }).click({ timeout: 20000 })
  await page.getByRole('button', { name: 'Play' }).first().click()
  await page.waitForTimeout(2500)
  const state = await page.evaluate(() => {
    const v = document.querySelector('video')
    return v ? { video: true, time: v.currentTime, readyState: v.readyState, error: v.error?.code ?? null } : { video: false }
  })
  const reps = await page.getByText('Reps counted', { exact: true }).locator('xpath=..').innerText()
  const ok = !state.video || (state.time > 0.5 && !state.error)
  if (!ok) failed++
  console.log(ok ? 'PASS' : 'FAIL', id, JSON.stringify(state), reps.replace(/\n/g, ' '))
}
await page.goto(`${base}#/validation`)
await page.getByText('Drift-flag F1').waitFor({ timeout: 10000 })
console.log('PASS validation page offline')
await browser.close()
if (errors.length) console.log('page errors:', errors)
process.exit(failed || errors.length ? 1 : 0)

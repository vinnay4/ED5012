// Opens docs/FormDrift.html from disk (file://) and walks the main demo flows.
// Usage: node scripts/single-test.mjs
import { chromium } from 'playwright'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const url = pathToFileURL(resolve('docs/FormDrift.html')).href
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'] })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
await context.route(/^https?:/, (route) => route.abort())
const page = await context.newPage()
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(e.message))

const check = (ok, label) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`)
  if (!ok) process.exitCode = 1
}

await page.goto(url)
check(await page.getByText('FormDrift notices.').isVisible(), 'landing page renders')

for (const id of ['sim-side', 'side-kettlebell-squat', 'oblique-barbell-back-squat']) {
  await page.goto(`${url}#/session/${id}`)
  await page.getByRole('button', { name: /Analyse this set/ }).click()
  const skip = page.getByRole('button', { name: 'No change' })
  await skip.waitFor({ timeout: 20000 }).then(() => skip.click()).catch(() => undefined)
  await page.getByRole('button', { name: 'Overview' }).waitFor({ timeout: 20000 })
  const reps = await page.getByText('Reps counted', { exact: true }).locator('..').innerText()
  check(/\d+/.test(reps), `${id}: analysed (${reps.replace(/\s+/g, ' ').slice(0, 40)})`)
  if (id !== 'sim-side') {
    const v = await page.evaluate(async () => {
      const el = document.querySelector('video')
      if (!el) return null
      if (el.readyState < 2) await new Promise((r) => el.addEventListener('loadeddata', r, { once: true }))
      return { readyState: el.readyState, duration: el.duration, error: el.error?.code ?? null }
    })
    check(v && v.readyState >= 2 && v.duration > 1, `${id}: embedded video plays (${JSON.stringify(v)})`)
  }
}

for (const [hash, text] of [
  ['/method', '4W1H'],
  ['/validation', 'Noise'],
  ['/study', 'SUS'],
  ['/present', 'FormDrift'],
]) {
  await page.goto(`${url}#${hash}`)
  await page.waitForTimeout(1500)
  check((await page.content()).includes(text), `${hash} renders`)
}

check(errors.length === 0, `no console errors${errors.length ? `: ${errors.join(' | ')}` : ''}`)
await browser.close()

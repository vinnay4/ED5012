// Headless smoke test: visits every route, runs the demo flows and saves screenshots.
// Usage: node scripts/smoke.mjs [baseUrl] [outDir]
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const base = process.argv[2] ?? 'http://127.0.0.1:5173/'
const out = process.argv[3] ?? '/tmp/smoke'
mkdirSync(out, { recursive: true })

const browser = await chromium.launch({ channel: 'chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(`[console] ${m.text()}`))
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))

const shot = async (name) => {
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true })
  console.log('shot', name)
}

const go = async (hash) => {
  await page.goto(`${base}#${hash}`)
  await page.waitForLoadState('networkidle')
}

await go('/')
await shot('01-landing')
await go('/analyze')
await shot('02-analyze')

for (const id of ['sim-side', 'sim-front', 'side-kettlebell-squat', 'oblique-barbell-back-squat']) {
  await go(`/session/${id}`)
  await page.getByRole('button', { name: /Analyse this set/ }).click()
  const modal = page.getByText('Self-perception check')
  const done = page.getByRole('button', { name: 'Overview' })
  await Promise.race([modal.first().waitFor({ timeout: 20000 }), done.waitFor({ timeout: 20000 })])
  if (
    await page
      .getByRole('button', { name: 'No change' })
      .isVisible()
      .catch(() => false)
  ) {
    await shot(`03-${id}-perception`)
    await page.getByRole('button', { name: 'No change' }).click()
  }
  await done.waitFor()
  await shot(`04-${id}-overview`)
  for (const tab of ['Rep by rep', 'Biomechanics', 'Body proportions', 'Feedback log', 'Ground truth', 'Data & export']) {
    const b = page.getByRole('button', { name: tab, exact: true })
    if (await b.count()) {
      await b.click()
      await shot(`05-${id}-${tab.replace(/\W+/g, '-').toLowerCase()}`)
    }
  }
}

await go('/method')
await shot('06-method')
await go('/validation')
await page.waitForTimeout(800)
await page.getByRole('button', { name: /Run noise sweep/ }).click()
await page
  .getByText(/computing/)
  .waitFor({ state: 'detached', timeout: 60000 })
  .catch(() => undefined)
await page.waitForTimeout(500)
await shot('07-validation')
await go('/study')
await shot('08-study')

await page.setViewportSize({ width: 1280, height: 800 })
for (let s = 1; s <= 12; s++) {
  await go(`/present?s=${s}`)
  await page.waitForTimeout(350)
  await page.screenshot({ path: `${out}/09-slide-${String(s).padStart(2, '0')}.png` })
}
console.log('slides done')

await page.setViewportSize({ width: 390, height: 844 })
await go('/')
await shot('10-mobile-landing')
await go('/session/sim-side')
await page.getByRole('button', { name: /Analyse this set/ }).click()
await page.getByRole('button', { name: /Skip and show results/ }).click({ timeout: 20000 })
await shot('11-mobile-session')

console.log('\nERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
await browser.close()

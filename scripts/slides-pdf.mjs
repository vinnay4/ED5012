// Exports the in-app slide deck to docs/FormDrift_Slides.pdf. Needs `npm run dev` running.
// Usage: node scripts/slides-pdf.mjs [baseUrl]
import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://127.0.0.1:5173/'
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-gl=angle', '--use-angle=swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 776 }, deviceScaleFactor: 2 })
const shots = []
for (let s = 1; ; s++) {
  await page.goto(`${base}#/present?s=${s}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(900)
  const counter = await page.locator('.num', { hasText: '/' }).last().innerText()
  const [cur, total] = counter.split('/').map((v) => parseInt(v, 10))
  const deck = page.locator('div.relative.overflow-hidden.rounded-xl').first()
  shots.push((await deck.screenshot()).toString('base64'))
  if (cur >= total) break
}
const doc = await browser.newPage()
await doc.setContent(
  `<style>@page{size:1280px 720px;margin:0}body{margin:0}img{width:1280px;height:720px;display:block;page-break-after:always}</style>` +
    shots.map((b) => `<img src="data:image/png;base64,${b}">`).join(''),
)
await doc.pdf({ path: 'docs/FormDrift_Slides.pdf', width: '1280px', height: '720px', printBackground: true })
await browser.close()
console.log(`wrote docs/FormDrift_Slides.pdf (${shots.length} slides)`)

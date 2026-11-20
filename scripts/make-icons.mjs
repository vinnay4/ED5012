// Renders the PWA PNG icons from an inline SVG with headless Chrome.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const glyph = (stroke) => `<path d="M10 34h9l5-13 9 26 6-17 4 4h11" fill="none" stroke="#070a10" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/>`
const grad = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7ee8f7"/><stop offset="1" stop-color="#0e93ab"/></linearGradient></defs>`
const rounded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${grad}<rect width="64" height="64" rx="14" fill="url(#g)"/>${glyph(5.2)}</svg>`
// Maskable: full-bleed background, glyph kept inside the 80 % safe zone.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${grad}<rect width="64" height="64" fill="url(#g)"/><g transform="translate(9.6 9.6) scale(0.7)">${glyph(6)}</g></svg>`

mkdirSync('public/icons', { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()
for (const [name, svg, size] of [
  ['icon-192.png', rounded, 192],
  ['icon-512.png', rounded, 512],
  ['icon-maskable-512.png', maskable, 512],
  ['apple-touch-icon.png', maskable, 180],
]) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`)
  await page.locator('svg').screenshot({ path: `public/icons/${name}`, omitBackground: true })
  console.log('wrote', name)
}
await browser.close()

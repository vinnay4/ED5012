// Turns the `vite build --mode single` output into one self-contained HTML file
// (docs/FormDrift.html) that opens straight from disk. The demo videos, posters and
// cached landmarks are embedded as data URLs; live pose extraction loads MediaPipe from its CDN.
// Usage: npm run build:single
import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'

const MIME = { '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }
const dataUrl = (file) => `data:${MIME[extname(file)]};base64,${readFileSync(file).toString('base64')}`

const assets = {}
for (const name of readdirSync('public/samples')) {
  if (MIME[extname(name)]) assets[`samples/${name}`] = dataUrl(join('public/samples', name))
}

let html = readFileSync('dist-single/index.html', 'utf8')
const inject = `<script>window.__FD_ASSETS=${JSON.stringify(assets)}</script>`
html = html.replace(/<head>/i, `<head>\n    ${inject}`)
html = html.replace('href="./favicon.svg"', `href="${dataUrl('public/favicon.svg')}"`)
html = html.replace('href="./icons/apple-touch-icon.png"', `href="${dataUrl('public/icons/apple-touch-icon.png')}"`)

const out = 'docs/FormDrift.html'
writeFileSync(out, html)
console.log(`wrote ${out} (${(statSync(out).size / 1024 / 1024).toFixed(1)} MB, ${Object.keys(assets).length} embedded demo files)`)

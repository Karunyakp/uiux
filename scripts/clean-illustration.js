import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

async function run() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const page = await browser.newPage()
  await page.goto('file:///E:/uiux%20project/trustlens-fullstack/trustlens/output/navy_transparent_illustration.png')
  await page.waitForFunction(() => {
    const img = document.querySelector('img')
    return img && img.complete && img.naturalWidth > 0
  })

  const result = await page.evaluate(() => {
    const img = document.querySelector('img')
    const canvas = document.createElement('canvas')
    const W = img.naturalWidth
    const H = img.naturalHeight
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)

    const imgData = ctx.getImageData(0, 0, W, H)
    const data = imgData.data

    // Clear all leftover text artifacts on the left edge (x < 42):
    // Magnifying glass handle starts at x >= 42 in this crop (tip of handle is at x=42, y=260)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < 42; x++) {
        const idx = (y * W + x) * 4
        data[idx + 3] = 0 // completely transparent
      }
    }

    // Soft blur / smooth the aura outer fringe so there are no step-like edges:
    // Any semi-isolated pixels or ragged boundary can be smoothed:
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const idx = (y * W + x) * 4
        if (data[idx + 3] > 0) {
          // Count transparent 8-neighbors
          let transCount = 0
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue
              const nIdx = ((y + dy) * W + (x + dx)) * 4
              if (data[nIdx + 3] === 0) transCount++
            }
          }
          if (transCount >= 5) {
            // Edge pixel: soften alpha
            data[idx + 3] = Math.round(data[idx + 3] * 0.35)
          } else if (transCount >= 3) {
            data[idx + 3] = Math.round(data[idx + 3] * 0.7)
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0)
    return canvas.toDataURL('image/png')
  })

  const base64Data = result.replace(/^data:image\/png;base64,/, '')
  fs.writeFileSync('src/assets/hero-illustration.png', Buffer.from(base64Data, 'base64'))
  fs.writeFileSync('public/hero-illustration.png', Buffer.from(base64Data, 'base64'))
  fs.writeFileSync('output/clean_hero_illustration.png', Buffer.from(base64Data, 'base64'))
  console.log('Saved clean hero illustration to src/assets/hero-illustration.png')
  await browser.close()
}

run().catch(console.error)

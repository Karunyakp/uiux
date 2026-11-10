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
  await page.goto('file:///C:/Users/Karunyaayashu/.gemini/antigravity/brain/7eb51cfc-2267-4fea-9ad9-da27afa4c565/.user_uploaded/media_1794113857639_23fd9c39.png')
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
    const d = ctx.getImageData(0, 0, W, H).data

    // Find bounding box
    let minX = W, maxX = 0, minY = H, maxY = 0
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const a = d[(y * W + x) * 4 + 3]
        if (a > 10) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }

    // Add 12px padding
    const pad = 12
    const cropX = Math.max(0, minX - pad)
    const cropY = Math.max(0, minY - pad)
    const cropW = Math.min(W - cropX, (maxX - minX + 1) + pad * 2)
    const cropH = Math.min(H - cropY, (maxY - minY + 1) + pad * 2)

    const outCanvas = document.createElement('canvas')
    outCanvas.width = cropW
    outCanvas.height = cropH
    const outCtx = outCanvas.getContext('2d')
    outCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)

    return outCanvas.toDataURL('image/png')
  })

  const base64Data = result.replace(/^data:image\/png;base64,/, '')
  fs.writeFileSync('src/assets/ai-inspection.png', Buffer.from(base64Data, 'base64'))
  fs.writeFileSync('public/ai-inspection.png', Buffer.from(base64Data, 'base64'))
  fs.writeFileSync('output/ai-inspection-trimmed.png', Buffer.from(base64Data, 'base64'))
  console.log('Saved src/assets/ai-inspection.png!')
  await browser.close()
}

run().catch(console.error)

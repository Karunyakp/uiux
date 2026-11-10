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
  await page.goto('file:///C:/Users/Karunyaayashu/.gemini/antigravity/brain/7eb51cfc-2267-4fea-9ad9-da27afa4c565/.user_uploaded/media_1794112277264_b15771fc.png')
  await page.waitForFunction(() => {
    const img = document.querySelector('img')
    return img && img.complete && img.naturalWidth > 0
  })

  const result = await page.evaluate(() => {
    const img = document.querySelector('img')
    const canvas = document.createElement('canvas')
    canvas.width = 300
    canvas.height = 300
    const ctx = canvas.getContext('2d')
    // Crop around the magnifying glass handle: x=360 to 660, y=100 to 400
    ctx.drawImage(img, 360, 100, 300, 300, 0, 0, 300, 300)
    return canvas.toDataURL('image/png')
  })

  const base64Data = result.replace(/^data:image\/png;base64,/, '')
  fs.writeFileSync('output/mg_handle_crop.png', Buffer.from(base64Data, 'base64'))
  console.log('Saved output/mg_handle_crop.png')
  await browser.close()
}

run().catch(console.error)

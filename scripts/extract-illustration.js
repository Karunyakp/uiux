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
  
  const imgUrl = 'file:///C:/Users/Karunyaayashu/.gemini/antigravity/brain/7eb51cfc-2267-4fea-9ad9-da27afa4c565/.user_uploaded/media_1794112277264_b15771fc.png'

  await page.goto(imgUrl)
  await page.waitForFunction(() => {
    const img = document.querySelector('img')
    return img && img.complete && img.naturalWidth > 0
  })

  const result = await page.evaluate(() => {
    const img = document.querySelector('img')
    const canvas = document.createElement('canvas')
    
    // Crop coordinates from 1024x575
    // Magnifying glass top-left is around (455, 75)
    // Badge bottom-left is around (460, 500)
    // Rightmost paper is around (960, 400)
    // Bottom of girl/backpack is around 565
    const cropX = 455
    const cropY = 70
    const cropW = 1024 - cropX
    const cropH = 575 - cropY

    canvas.width = cropW
    canvas.height = cropH
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)
    return canvas.toDataURL('image/png')
  })

  const base64Data = result.replace(/^data:image\/png;base64,/, '')
  fs.writeFileSync('src/assets/hero-illustration.png', Buffer.from(base64Data, 'base64'))
  fs.writeFileSync('public/hero-illustration.png', Buffer.from(base64Data, 'base64'))

  console.log('Restored clean hero-illustration.png')
  await browser.close()
}

run().catch(console.error)

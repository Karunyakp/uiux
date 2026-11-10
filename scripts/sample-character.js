import puppeteer from 'puppeteer-core'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

async function run() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const page = await browser.newPage()
  await page.goto('file:///C:/Users/Karunyaayashu/.gemini/antigravity/brain/7eb51cfc-2267-4fea-9ad9-da27afa4c565/.user_uploaded/media_1794112282011_b7e3bfb1.jpg')
  await page.waitForFunction(() => {
    const img = document.querySelector('img')
    return img && img.complete && img.naturalWidth > 0
  })

  const check = await page.evaluate(() => {
    const img = document.querySelector('img')
    const canvas = document.createElement('canvas')
    const W = img.naturalWidth
    const H = img.naturalHeight
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const d = ctx.getImageData(0, 0, W, H).data

    // Sample background at corners:
    const corners = [
      { name: 'top-left (5,5)', r: d[(5*W+5)*4], g: d[(5*W+5)*4+1], b: d[(5*W+5)*4+2] },
      { name: 'top-mid (W/2, 5)', r: d[(5*W+Math.floor(W/2))*4], g: d[(5*W+Math.floor(W/2))*4+1], b: d[(5*W+Math.floor(W/2))*4+2] },
      { name: 'mid-left (5, H/2)', r: d[(Math.floor(H/2)*W+5)*4], g: d[(Math.floor(H/2)*W+5)*4+1], b: d[(Math.floor(H/2)*W+5)*4+2] },
      { name: 'badge center', r: d[(590*W+100)*4], g: d[(590*W+100)*4+1], b: d[(590*W+100)*4+2] }
    ]

    return { W, H, corners }
  })

  console.log('Image dimensions and samples:', check)
  await browser.close()
}

run().catch(console.error)

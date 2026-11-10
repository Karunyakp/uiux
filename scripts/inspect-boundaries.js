import puppeteer from 'puppeteer-core'

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

  const check = await page.evaluate(() => {
    const img = document.querySelector('img')
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)

    const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data

    // Let's inspect the entire handle region
    let leftmostHandleX = 1000
    let handleY = 0
    for (let y = 180; y <= 330; y++) {
      for (let x = 360; x <= 450; x++) {
        const i = (y * canvas.width + x) * 4
        const r = d[i], g = d[i+1], b = d[i+2]
        // Check for handle border or body
        const diff = Math.abs(r - 28) + Math.abs(g - 63) + Math.abs(b - 92)
        if (diff > 35) {
          if (x < leftmostHandleX) {
            leftmostHandleX = x
            handleY = y
          }
        }
      }
    }

    // Rightmost point of the guest button
    let rightmostGuestBtnX = 0
    for (let y = 360; y <= 425; y++) {
      for (let x = 300; x <= 410; x++) {
        const i = (y * canvas.width + x) * 4
        const r = d[i], g = d[i+1], b = d[i+2]
        const diff = Math.abs(r - 28) + Math.abs(g - 63) + Math.abs(b - 92)
        if (diff > 35) {
          if (x > rightmostGuestBtnX) rightmostGuestBtnX = x
        }
      }
    }

    return { leftmostHandleX, handleY, rightmostGuestBtnX }
  })

  console.log('Boundaries:', check)
  await browser.close()
}

run().catch(console.error)

import puppeteer from 'puppeteer-core'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

async function run() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const page = await browser.newPage()

  // 1. Desktop 1440x900
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
  await page.goto('http://localhost:5173/#/landing', { waitUntil: 'networkidle0' })
  await new Promise(r => setTimeout(r, 600))
  await page.screenshot({ path: 'output/landing_final_desktop.png' })
  console.log('Saved output/landing_final_desktop.png')

  // 2. Mobile 390x844
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true })
  await new Promise(r => setTimeout(r, 400))
  await page.screenshot({ path: 'output/landing_final_mobile.png' })
  console.log('Saved output/landing_final_mobile.png')

  // 3. Tablet 768x1024
  await page.setViewport({ width: 768, height: 1024, deviceScaleFactor: 2 })
  await new Promise(r => setTimeout(r, 400))
  await page.screenshot({ path: 'output/landing_final_tablet.png' })
  console.log('Saved output/landing_final_tablet.png')

  await browser.close()
}

run().catch(console.error)

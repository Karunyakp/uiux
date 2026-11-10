import puppeteer from 'puppeteer-core'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

async function run() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1366, height: 768, deviceScaleFactor: 1.5 })

  await page.goto('http://localhost:5173/#/app', { waitUntil: 'networkidle0' })
  await new Promise(r => setTimeout(r, 600))

  // Open accessibility panel
  const a11yTrigger = await page.$('.a11y-trigger-btn')
  if (a11yTrigger) await a11yTrigger.click()
  await new Promise(r => setTimeout(r, 400))

  // Click 'System' theme button
  await page.evaluate(() => {
    const btns = document.querySelectorAll('.a11y-theme-btn')
    for (const b of btns) {
      if (b.textContent.includes('System')) b.click()
    }
  })
  await new Promise(r => setTimeout(r, 400))

  await page.screenshot({ path: 'output/a11y_system_mode_blue.png' })
  console.log('Saved output/a11y_system_mode_blue.png')

  await browser.close()
}

run().catch(console.error)

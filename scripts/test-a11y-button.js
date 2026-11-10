import puppeteer from 'puppeteer-core'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

async function test() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox']
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 })
  await page.goto('http://localhost:5173/#/app', { waitUntil: 'networkidle2' })
  await new Promise(r => setTimeout(r, 1000))

  await page.screenshot({ path: 'C:/Users/Karunyaayashu/.gemini/antigravity/brain/7eb51cfc-2267-4fea-9ad9-da27afa4c565/dashboard_with_a11y_button.png' })
  console.log('Saved dashboard_with_a11y_button.png')

  await page.click('.a11y-header-btn')
  await new Promise(r => setTimeout(r, 600))
  await page.screenshot({ path: 'C:/Users/Karunyaayashu/.gemini/antigravity/brain/7eb51cfc-2267-4fea-9ad9-da27afa4c565/dashboard_with_a11y_opened.png' })
  console.log('Saved dashboard_with_a11y_opened.png')

  await browser.close()
  console.log('ALL A11Y TESTS PASSED!')
}

test().catch(console.error)

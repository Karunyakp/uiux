import puppeteer from 'puppeteer-core'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const ARTIFACT_DIR = 'C:\\Users\\Karunyaayashu\\.gemini\\antigravity\\brain\\7eb51cfc-2267-4fea-9ad9-da27afa4c565'

async function run() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1366, height: 768, deviceScaleFactor: 1.5 })

  // 1. Dashboard in System Mode (Teal Blue)
  await page.goto('http://localhost:5173/#/app', { waitUntil: 'domcontentloaded' })
  await new Promise(r => setTimeout(r, 1500))
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'system')
    const s = JSON.parse(localStorage.getItem('trustlens_a11y_settings') || '{}')
    s.theme = 'system'
    localStorage.setItem('trustlens_a11y_settings', JSON.stringify(s))
  })
  await new Promise(r => setTimeout(r, 500))
  await page.screenshot({ path: `${ARTIFACT_DIR}\\dashboard_system_teal.png` })
  console.log('Saved dashboard_system_teal.png')

  // Open A11y panel inside dashboard
  const a11yBtn = await page.$('.a11y-trigger-btn')
  if (a11yBtn) {
    await a11yBtn.click()
    await new Promise(r => setTimeout(r, 500))
    await page.screenshot({ path: `${ARTIFACT_DIR}\\dashboard_a11y_system_open.png` })
    console.log('Saved dashboard_a11y_system_open.png')
    // Click outside to close panel
    await page.mouse.click(100, 100)
    await new Promise(r => setTimeout(r, 300))
  }

  // 2. Dashboard in Dark Mode (Pure OLED Black)
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
    const s = JSON.parse(localStorage.getItem('trustlens_a11y_settings') || '{}')
    s.theme = 'dark'
    localStorage.setItem('trustlens_a11y_settings', JSON.stringify(s))
  })
  await new Promise(r => setTimeout(r, 500))
  await page.screenshot({ path: `${ARTIFACT_DIR}\\dashboard_dark_black.png` })
  console.log('Saved dashboard_dark_black.png')

  // 3. Dashboard in Light Mode
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light')
    const s = JSON.parse(localStorage.getItem('trustlens_a11y_settings') || '{}')
    s.theme = 'light'
    localStorage.setItem('trustlens_a11y_settings', JSON.stringify(s))
  })
  await new Promise(r => setTimeout(r, 500))
  await page.screenshot({ path: `${ARTIFACT_DIR}\\dashboard_light_white.png` })
  console.log('Saved dashboard_light_white.png')

  await browser.close()
  console.log('Done capturing all dashboard modes!')
}

run().catch(console.error)

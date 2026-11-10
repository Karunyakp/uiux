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

  // Go to site and set guest user + system mode
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.setItem('trustlens_user', JSON.stringify({ email: 'guest@trustlens.ai', role: 'guest' }))
    localStorage.setItem('trustlens_a11y_settings', JSON.stringify({
      theme: 'system',
      colorBlind: false,
      largeText: false,
      dyslexicFont: false,
      calmMotion: false,
      focusMode: false
    }))
    document.documentElement.setAttribute('data-theme', 'system')
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await new Promise(r => setTimeout(r, 1200))
  await page.screenshot({ path: `${ARTIFACT_DIR}\\dashboard_teal_system.png` })
  console.log('Saved dashboard_teal_system.png')

  // Open A11y panel inside dashboard
  const a11yBtn = await page.$('.a11y-trigger-btn')
  if (a11yBtn) {
    await a11yBtn.click()
    await new Promise(r => setTimeout(r, 600))
    await page.screenshot({ path: `${ARTIFACT_DIR}\\dashboard_a11y_panel_system.png` })
    console.log('Saved dashboard_a11y_panel_system.png')
  }

  // Switch to Dark Mode (Pure OLED Black)
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('trustlens_a11y_settings') || '{}')
    s.theme = 'dark'
    localStorage.setItem('trustlens_a11y_settings', JSON.stringify(s))
    document.documentElement.setAttribute('data-theme', 'dark')
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await new Promise(r => setTimeout(r, 1200))
  await page.screenshot({ path: `${ARTIFACT_DIR}\\dashboard_black_dark.png` })
  console.log('Saved dashboard_black_dark.png')

  await browser.close()
  console.log('All dashboard theme captures done!')
}

run().catch(console.error)

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

  // 1. Dashboard - System Mode (Teal Blue)
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' })
  await page.evaluate(() => {
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
  await page.reload({ waitUntil: 'networkidle0' })
  await new Promise(r => setTimeout(r, 600))
  await page.screenshot({ path: `${ARTIFACT_DIR}\\system_dashboard_teal.png` })
  console.log('Saved system_dashboard_teal.png')

  // Open A11y panel in system mode
  const a11yBtn = await page.$('.a11y-trigger-btn')
  if (a11yBtn) {
    await a11yBtn.click()
    await new Promise(r => setTimeout(r, 500))
    await page.screenshot({ path: `${ARTIFACT_DIR}\\a11y_panel_system_theme.png` })
    console.log('Saved a11y_panel_system_theme.png')
  }

  // 2. Sign In - System Mode (Teal Blue)
  await page.goto('http://localhost:5173/#/signin', { waitUntil: 'networkidle0' })
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'system')
  })
  await new Promise(r => setTimeout(r, 400))
  await page.screenshot({ path: `${ARTIFACT_DIR}\\system_signin_teal.png` })
  console.log('Saved system_signin_teal.png')

  // 3. Landing - System Mode (Teal Blue)
  await page.goto('http://localhost:5173/#/landing', { waitUntil: 'networkidle0' })
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'system')
  })
  await new Promise(r => setTimeout(r, 400))
  await page.screenshot({ path: `${ARTIFACT_DIR}\\system_landing_teal.png` })
  console.log('Saved system_landing_teal.png')

  // 4. Dark Mode Verification - Pure Black
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' })
  await page.evaluate(() => {
    localStorage.setItem('trustlens_a11y_settings', JSON.stringify({
      theme: 'dark',
      colorBlind: false,
      largeText: false,
      dyslexicFont: false,
      calmMotion: false,
      focusMode: false
    }))
    document.documentElement.setAttribute('data-theme', 'dark')
  })
  await page.reload({ waitUntil: 'networkidle0' })
  await new Promise(r => setTimeout(r, 600))
  await page.screenshot({ path: `${ARTIFACT_DIR}\\dark_dashboard_black.png` })
  console.log('Saved dark_dashboard_black.png')

  await page.goto('http://localhost:5173/#/signin', { waitUntil: 'networkidle0' })
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
  })
  await new Promise(r => setTimeout(r, 400))
  await page.screenshot({ path: `${ARTIFACT_DIR}\\dark_signin_black.png` })
  console.log('Saved dark_signin_black.png')

  await browser.close()
  console.log('All verification screenshots complete!')
}

run().catch(console.error)

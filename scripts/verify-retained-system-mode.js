import puppeteer from 'puppeteer-core'
import path from 'node:path'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const ARTIFACT_DIR = 'C:\\Users\\Karunyaayashu\\.gemini\\antigravity\\brain\\7eb51cfc-2267-4fea-9ad9-da27afa4c565'

async function run() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })

    // Navigate to app
    await page.goto('http://localhost:5173', { waitUntil: 'load' })
    const cta = await page.$('.lp-btn-secondary')
    if (cta) await cta.click()
    await page.waitForSelector('.newchat', { timeout: 10000 })
    await new Promise(r => setTimeout(r, 600))

    // 1. Verify System Mode (Teal Blue)
    await page.evaluate(() => {
      localStorage.setItem('trustlens_a11y_settings', JSON.stringify({ theme: 'system' }))
      document.documentElement.setAttribute('data-theme', 'system')
    })
    await page.reload({ waitUntil: 'load' })
    await page.waitForSelector('.newchat', { timeout: 10000 })
    await new Promise(r => setTimeout(r, 600))
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'system_mode_retained_dashboard.png') })
    console.log('✅ Captured system_mode_retained_dashboard.png')

    // 2. Open A11y Panel in System Mode
    const a11yBtn = await page.$('.a11y-header-btn')
    if (a11yBtn) {
      await a11yBtn.click()
      await new Promise(r => setTimeout(r, 500))
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'system_mode_a11y_panel.png') })
      console.log('✅ Captured system_mode_a11y_panel.png')
    }

    console.log('=== VERIFICATION COMPLETE ===')
  } finally {
    await browser.close()
  }
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})

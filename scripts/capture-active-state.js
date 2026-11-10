import puppeteer from 'puppeteer-core'
import path from 'path'

const artifactDir = 'C:\\Users\\Karunyaayashu\\.gemini\\antigravity\\brain\\7eb51cfc-2267-4fea-9ad9-da27afa4c565'
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto('http://localhost:5173/#/app', { waitUntil: 'networkidle2' })
  await sleep(1500)

  // Ensure light mode
  await page.evaluate(() => {
    localStorage.setItem('trustlens_a11y_settings', JSON.stringify({
      theme: 'light',
      colorBlind: false,
      largeText: false,
      dyslexicFont: false,
      calmMotion: false,
      focusMode: false
    }))
    document.documentElement.setAttribute('data-theme', 'light')
  })
  await page.reload({ waitUntil: 'networkidle2' })
  await sleep(1500)

  console.log('Typing question into composer...')
  await page.type('.composer-textarea', 'Can 3rd-year students apply for GATE 2027?')
  await sleep(300)
  await page.click('.composer-send-btn')

  console.log('Waiting for AI answer text to render...')
  await page.waitForFunction(() => {
    const body = document.querySelector('.assistant-answer-body')
    return body && body.textContent.trim().length > 20
  }, { timeout: 30000 })

  console.log('AI response arrived! Waiting 1s for calibration meters & evidence panel...')
  await sleep(1000)

  const activePath = path.join(artifactDir, 'dashboard_active_full_1440x900.png')
  await page.screenshot({ path: activePath })
  console.log(`Saved screenshot: ${activePath}`)

  await browser.close()
}

run().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})

import puppeteer from 'puppeteer-core'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const artifactDir = 'C:\\Users\\Karunyaayashu\\.gemini\\antigravity\\brain\\7eb51cfc-2267-4fea-9ad9-da27afa4c565'
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function run() {
  console.log('Launching Edge for visual verification at multiple resolutions...')
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
  })

  const page = await browser.newPage()

  const resolutions = [
    { name: '1366x768', width: 1366, height: 768 },
    { name: '1440x900', width: 1440, height: 900 },
    { name: '1920x1080', width: 1920, height: 1080 }
  ]

  for (const res of resolutions) {
    console.log(`\nTesting resolution ${res.name} (${res.width}x${res.height})...`)
    await page.setViewport({ width: res.width, height: res.height, deviceScaleFactor: 1 })
    await page.goto('http://localhost:5173/#/app', { waitUntil: 'networkidle2' })
    await sleep(1500)

    // Ensure localStorage defaults to light mode
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
    await sleep(1200)

    // 1. Capture State A: Clean New Chat (Empty State)
    const stateAPath = path.join(artifactDir, `dashboard_state_a_${res.name}.png`)
    await page.screenshot({ path: stateAPath })
    console.log(`Saved State A screenshot: ${stateAPath}`)

    // If 1440x900, let's also test asking a question and active state
    if (res.name === '1440x900') {
      console.log('Interacting with chat composer...')
      // Click first starter card or type
      await page.type('.composer-textarea', 'Can 3rd-year students apply for GATE 2027?')
      await sleep(300)
      await page.click('.composer-send-btn')
      console.log('Waiting for AI response from Gemini / calibration engine...')
      await sleep(4500)

      const stateBPath = path.join(artifactDir, `dashboard_state_b_${res.name}.png`)
      await page.screenshot({ path: stateBPath })
      console.log(`Saved State B screenshot: ${stateBPath}`)

      // Open Accessibility panel
      console.log('Opening Accessibility panel...')
      await page.click('.a11y-header-btn')
      await sleep(500)

      const a11yPath = path.join(artifactDir, `dashboard_a11y_open_${res.name}.png`)
      await page.screenshot({ path: a11yPath })
      console.log(`Saved A11y open screenshot: ${a11yPath}`)

      // Toggle to dark theme to ensure dark mode works as requested
      console.log('Switching to dark mode in A11y modal...')
      await page.evaluate(() => {
        const darkBtn = [...document.querySelectorAll('.a11y-theme-btn')].find(b => b.textContent.includes('Dark'))
        if (darkBtn) darkBtn.click()
      })
      await sleep(500)

      const darkPath = path.join(artifactDir, `dashboard_dark_mode_${res.name}.png`)
      await page.screenshot({ path: darkPath })
      console.log(`Saved Dark Mode screenshot: ${darkPath}`)
    }
  }

  await browser.close()
  console.log('\nAll visual verification captures completed successfully!')
}

run().catch(err => {
  console.error('Error running verification:', err)
  process.exit(1)
})

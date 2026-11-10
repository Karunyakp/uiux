import puppeteer from 'puppeteer-core'
import path from 'node:path'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const ARTIFACT_DIR = 'C:\\Users\\Karunyaayashu\\.gemini\\antigravity\\brain\\7eb51cfc-2267-4fea-9ad9-da27afa4c565'

async function run() {
  console.log('=== STARTING TEST: NEW CHAT UNWANTED FLASH VERIFICATION ===')
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })
    await page.goto('http://localhost:5173', { waitUntil: 'load' })

    // If on landing page, click to go to app
    const cta = await page.$('.lp-btn-secondary')
    if (cta) {
      await cta.click()
    } else {
      const anyAppBtn = await page.$('button[title*="TrustLens"], .lp-nav-link')
      if (anyAppBtn) await anyAppBtn.click()
    }

    // Wait for app dashboard sidebar
    await page.waitForSelector('.newchat', { timeout: 10000 })
    await new Promise(r => setTimeout(r, 600))

    // Check 1: Initial state on dashboard
    let toastVisible = await page.evaluate(() => {
      const t = document.querySelector('.toast.on')
      return t ? { text: t.innerText, visible: true } : null
    })
    console.log('Test 1 (Initial load toast check):', toastVisible ? 'FAILED' : 'PASSED (no toast)')
    if (toastVisible) throw new Error('Toast unexpectedly visible on initial load')

    // Check 2: Click "New Chat"
    console.log('Clicking New Chat button...')
    const newChatBtn = await page.$('.newchat')
    if (!newChatBtn) throw new Error('Could not find .newchat button')
    
    await newChatBtn.click()

    // Poll every 100ms for 2500ms to guarantee no toast flashes
    let flashed = false
    let flashText = ''
    for (let i = 0; i < 25; i++) {
      const flash = await page.evaluate(() => {
        const t = document.querySelector('.toast.on')
        if (t && getComputedStyle(t).opacity !== '0' && getComputedStyle(t).display !== 'none') {
          return t.innerText || '[empty container]'
        }
        return null
      })
      if (flash) {
        flashed = true
        flashText = flash
        break
      }
      await new Promise(r => setTimeout(r, 100))
    }

    if (flashed) {
      console.error(`❌ FAILED: Detected unwanted flash during New Chat: "${flashText}"`)
      process.exit(1)
    } else {
      console.log('✅ PASSED: No blue rectangle or toast flashed when clicking New Chat.')
    }

    // Check 3: Multiple rapid clicks
    console.log('Testing rapid multiple New Chat clicks...')
    for (let k = 0; k < 5; k++) {
      await newChatBtn.click()
      await new Promise(r => setTimeout(r, 150))
    }

    const anyFlashAfterRapid = await page.evaluate(() => {
      const t = document.querySelector('.toast.on')
      return !!(t && getComputedStyle(t).opacity !== '0' && getComputedStyle(t).display !== 'none')
    })

    if (anyFlashAfterRapid) {
      console.error('❌ FAILED: Detected flash after rapid clicks')
      process.exit(1)
    } else {
      console.log('✅ PASSED: Rapid clicks cleanly handled without any flash.')
    }

    // Check 4: Capture screenshot of clean new chat state
    const ssPath = path.join(ARTIFACT_DIR, 'new_chat_clean_initialization_no_flash.png')
    await page.screenshot({ path: ssPath })
    console.log(`✅ Screenshot saved to: ${ssPath}`)

    console.log('=== ALL TESTS PASSED: UNWANTED BLUE FLASH ELIMINATED ===')
  } finally {
    await browser.close()
  }
}

run().catch(err => {
  console.error('Test error:', err)
  process.exit(1)
})

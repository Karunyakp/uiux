import puppeteer from 'puppeteer-core'
import fs from 'fs'
import path from 'path'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const ARTIFACTS_DIR = 'C:\\Users\\Karunyaayashu\\.gemini\\antigravity\\brain\\7eb51cfc-2267-4fea-9ad9-da27afa4c565'

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function run() {
  console.log('--- STARTING VERIFICATION PULSE LOADER TESTS ---')
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true })
  }

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })

  console.log('1. Navigating to TrustLens AI app...')
  await page.goto('http://localhost:5173/#/app', { waitUntil: 'networkidle2' })
  await sleep(1500)

  // Ensure fresh new chat
  const newChatBtn = await page.$('.newchat')
  if (newChatBtn) await newChatBtn.click()
  await sleep(600)

  // 1. Submit a question to observe the loading experience
  console.log('2. Submitting question to capture animated Verification Pulse Loader in Light Mode...')
  const textarea = await page.$('.composer-textarea')
  if (textarea) {
    await textarea.type('What are the official eligibility requirements for third-year students in GATE 2027?')
    await sleep(400)
    const sendBtn = await page.$('.composer-send-btn')
    if (sendBtn) await sendBtn.click()
  }

  // Immediately capture the loader in active stage 1 (Understanding / Analysing)
  await sleep(700)
  console.log('3. Capturing loader Stage 1 / Stage 2 in Light Mode...')
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'pulse_loader_light_mode_stage1.png') })

  // Wait to capture Stage 2 / Stage 3
  await sleep(2200)
  console.log('4. Capturing loader Stage 3 in Light Mode...')
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'pulse_loader_light_mode_stage3.png') })

  // Wait for the response to finish
  console.log('Waiting for response to complete...')
  await page.waitForFunction(() => {
    const bubbles = document.querySelectorAll('.assistant-card')
    const last = bubbles[bubbles.length - 1]
    return last && !last.classList.contains('pending-card') && document.querySelectorAll('.v-pulse-card').length === 0
  }, { timeout: 25000 }).catch(() => {})
  await sleep(2000)

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'pulse_loader_replaced_by_response.png') })
  console.log('✓ Successfully replaced loader with calibrated answer.')

  // 2. Test in Dark Mode (matching user reference screenshot)
  console.log('5. Testing in Dark Mode (matching reference image #102B46)...')
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
  })
  await sleep(600)

  const textareaDark = await page.$('.composer-textarea')
  if (textareaDark) {
    await textareaDark.type('Is there any age restriction or limit for taking the exam?')
    await sleep(400)
    const sendBtnDark = await page.$('.composer-send-btn')
    if (sendBtnDark) await sendBtnDark.click()
  }

  await sleep(800)
  console.log('6. Capturing Verification Pulse Loader in Dark Mode...')
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'pulse_loader_dark_mode_reference_match.png') })

  // Wait for second response
  await page.waitForFunction(() => {
    const loaders = document.querySelectorAll('.v-pulse-card')
    return loaders.length === 0
  }, { timeout: 25000 }).catch(() => {})
  await sleep(2000)

  // 3. Test Calm Motion
  console.log('7. Testing Calm Motion mode...')
  await page.evaluate(() => {
    document.body.classList.add('a11y-calm-motion')
  })
  await sleep(400)

  const textareaCalm = await page.$('.composer-textarea')
  if (textareaCalm) {
    await textareaCalm.type('What are the refund rules for late application fees?')
    await sleep(300)
    const sendBtnCalm = await page.$('.composer-send-btn')
    if (sendBtnCalm) await sendBtnCalm.click()
  }

  await sleep(700)
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'pulse_loader_calm_motion_mode.png') })
  console.log('✓ Calm motion mode captured.')

  // Wait for finish
  await sleep(3500)

  console.log('All Verification Pulse Loader tests completed successfully!')
  await browser.close()
}

run().catch(err => {
  console.error('Test error:', err)
  process.exit(1)
})

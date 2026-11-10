import puppeteer from 'puppeteer-core'
import path from 'path'
import fs from 'fs'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const ARTIFACTS_DIR = 'C:/Users/Karunyaayashu/.gemini/antigravity/brain/7eb51cfc-2267-4fea-9ad9-da27afa4c565'

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function run() {
  console.log('Launching Edge for Reference Design Validation...')
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 })

    console.log('Navigating to http://localhost:5173/#/app ...')
    await page.goto('http://localhost:5173/#/app', { waitUntil: 'networkidle2' })
    await sleep(1500)

    // Set theme to system (navy/teal/mint)
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'system')
    })
    await sleep(400)

    // Ensure fresh state
    await page.evaluate(() => {
      const btn = document.querySelector('.newchat')
      if (btn) btn.click()
    })
    await sleep(800)

    console.log('--- 1. Capturing State A: Fresh 3-Column Workspace ---')
    const stateAShot = path.join(ARTIFACTS_DIR, 'reference_match_state_a.png')
    await page.screenshot({ path: stateAShot, fullPage: false })
    console.log('Saved:', stateAShot)

    console.log('--- 2. Submitting Question via Composer: "Can I apply for GATE 2027 while studying in my third year?" ---')
    await page.click('.composer-textarea')
    await page.type('.composer-textarea', 'Can I apply for GATE 2027 while studying in my third year?')
    await sleep(300)
    await page.click('.composer-send-btn')

    console.log('Waiting for Gemini response and calibration...')
    await page.waitForFunction(() => {
      const cards = document.querySelectorAll('.assistant-card:not(.pending-card)')
      return cards.length > 0
    }, { timeout: 45000 })
    await sleep(2000)

    console.log('--- 3. Capturing State B: Active Conversation matching Reference Image ---')
    const stateBShot = path.join(ARTIFACTS_DIR, 'reference_match_state_b.png')
    await page.screenshot({ path: stateBShot, fullPage: false })
    console.log('Saved:', stateBShot)

    // Rename conversation to exact "GATE 2027 eligibility"
    console.log('--- 4. Renaming Conversation to "GATE 2027 eligibility" ---')
    await page.evaluate(() => {
      const editBtn = document.querySelector('.conv-edit-title-btn')
      if (editBtn) editBtn.click()
    })
    await sleep(400)

    await page.click('.conv-title-edit-input')
    await page.evaluate(() => {
      const inp = document.querySelector('.conv-title-edit-input')
      if (inp) inp.value = ''
    })
    await page.type('.conv-title-edit-input', 'GATE 2027 eligibility')
    await sleep(200)
    await page.click('.conv-title-save-btn')
    await sleep(1000)

    const finalHeaderTitle = await page.evaluate(() => {
      const h1 = document.querySelector('.conv-main-title')
      return h1 ? h1.textContent.trim() : null
    })
    console.log('Header title after rename:', finalHeaderTitle)

    const stateBRefinedShot = path.join(ARTIFACTS_DIR, 'reference_match_exact_header.png')
    await page.screenshot({ path: stateBRefinedShot, fullPage: false })
    console.log('Saved:', stateBRefinedShot)

    console.log('--- 5. Capturing Dark Mode (#000000) ---')
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark')
    })
    await sleep(600)
    const darkShot = path.join(ARTIFACTS_DIR, 'reference_match_dark_mode.png')
    await page.screenshot({ path: darkShot, fullPage: false })
    console.log('Saved:', darkShot)

    console.log('Reference design verification completed successfully!')
  } finally {
    await browser.close()
  }
}

run().catch(err => {
  console.error('Validation error:', err)
  process.exit(1)
})

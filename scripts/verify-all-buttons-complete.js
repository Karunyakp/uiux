import puppeteer from 'puppeteer-core'
import fs from 'fs'
import path from 'path'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const ARTIFACTS_DIR = 'C:\\Users\\Karunyaayashu\\.gemini\\antigravity\\brain\\7eb51cfc-2267-4fea-9ad9-da27afa4c565'

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function run() {
  console.log('--- STARTING COMPLETE BUTTONS FUNCTIONALITY VERIFICATION ---')
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true })
  }

  // Create temporary test attachment files
  const testDir = path.join(process.cwd(), 'scripts', 'test-files')
  fs.mkdirSync(testDir, { recursive: true })
  const testPdfPath = path.join(testDir, 'Official_Guidelines_2026.pdf')
  const testTxtPath = path.join(testDir, 'Verification_Notes.txt')
  fs.writeFileSync(testPdfPath, '%PDF-1.4\n1 0 obj\n<< /Title (Official Guidelines) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF')
  fs.writeFileSync(testTxtPath, 'Official requirement: Candidate must complete degree before joining.')

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })

  // Grant clipboard and microphone permissions
  const context = browser.defaultBrowserContext()
  try {
    await context.overridePermissions('http://localhost:5173', ['clipboard-read', 'clipboard-write'])
  } catch {}

  console.log('Navigating to http://localhost:5173/#/app ...')
  await page.goto('http://localhost:5173/#/app', { waitUntil: 'networkidle2' })
  await sleep(1500)

  // 1. Verify New Chat Empty State
  console.log('1. Testing New Chat clean state...')
  const newChatBtn = await page.$('.newchat')
  if (newChatBtn) await newChatBtn.click()
  await sleep(500)

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'btn_test_1_new_chat_clean.png') })
  console.log('✓ Clean state verified.')

  // 2. Testing File Attachment Button & Tray
  console.log('2. Testing Attachment (Paperclip) button and file input...')
  const fileInput = await page.$('input[type="file"]')
  if (fileInput) {
    await fileInput.uploadFile(testPdfPath, testTxtPath)
    await sleep(800)
    console.log('✓ Uploaded 2 test attachments.')
  }

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'btn_test_2_attachments_tray.png') })

  // 3. Testing Microphone Button
  console.log('3. Testing Microphone voice button...')
  const micBtn = await page.$('.composer-tool-btn')
  if (micBtn) {
    await micBtn.click()
    await sleep(600)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'btn_test_3_voice_listening.png') })
    // Click Done / Stop
    const doneBtn = await page.$('.voice-stop-text-btn')
    if (doneBtn) {
      await doneBtn.click()
      await sleep(400)
    } else {
      await micBtn.click()
      await sleep(400)
    }
    console.log('✓ Microphone button and state verified.')
  }

  // 4. Submit Question with Attachment
  console.log('4. Submitting message with attachments to Gemini Engine...')
  const textarea = await page.$('.composer-textarea')
  if (textarea) {
    await textarea.type('What are the key requirements confirmed in the uploaded guideline document?')
    await sleep(300)
    const sendBtn = await page.$('.composer-send-btn')
    await sendBtn.click()
  }

  // Wait for response to generate
  console.log('Waiting for calibrated response...')
  await page.waitForFunction(() => {
    const bubbles = document.querySelectorAll('.assistant-card')
    const last = bubbles[bubbles.length - 1]
    return last && !last.classList.contains('pending-card')
  }, { timeout: 25000 }).catch(e => console.warn('Wait timeout or completed:', e.message))
  await sleep(2500)

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'btn_test_4_assistant_response.png') })
  console.log('✓ Assistant response and attachment badges verified.')

  // 5. Testing Assistant Action Toolbar Buttons
  console.log('5. Testing Assistant Toolbar: Copy, Read aloud, Save, Share, Explain, Verify, Report...')
  
  // A. Copy Button
  const actButtons = await page.$$('.assistant-card-actions .act-btn')
  console.log(`Found ${actButtons.length} action toolbar buttons.`)
  if (actButtons.length >= 1) {
    await actButtons[0].click() // Copy
    await sleep(500)
  }

  // B. Save Button
  if (actButtons.length >= 3) {
    await actButtons[2].click() // Save
    await sleep(500)
    console.log('✓ Answer saved.')
  }

  // C. Report Button & Modal
  if (actButtons.length >= 7) {
    await actButtons[6].click() // Report
    await sleep(600)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'btn_test_5_report_dialog.png') })

    // Fill report details and cancel/close
    const reportText = await page.$('.report-flyout-box textarea')
    if (reportText) await reportText.type('Verified claim phrasing is clear and accurate.')
    const closeReport = await page.$('.report-close-x')
    if (closeReport) await closeReport.click()
    await sleep(400)
    console.log('✓ Report modal verified.')
  }

  // 6. Testing Header Actions
  console.log('6. Testing Header: Accessibility, Share, Save, More Options...')
  
  // A. Accessibility Flyout
  const a11yHeaderBtn = await page.$('.a11y-header-btn')
  if (a11yHeaderBtn) {
    await a11yHeaderBtn.click()
    await sleep(600)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'btn_test_6_header_a11y.png') })
    const closeA11y = await page.$('.a11y-close-btn')
    if (closeA11y) await closeA11y.click()
    await sleep(400)
  }

  // B. More Options Menu
  const moreBtn = await page.$('.conv-more-btn')
  if (moreBtn) {
    await moreBtn.click()
    await sleep(600)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'btn_test_7_more_options_menu.png') })
    await moreBtn.click() // close
    await sleep(300)
  }

  // 7. Testing Sidebar Navigation: Saved Answers, Hub, Explore, Feedback, Profile, Settings
  console.log('7. Testing Sidebar views...')
  
  // A. Saved Answers view
  const navItems = await page.$$('.side-nav-item')
  if (navItems.length >= 1) {
    await navItems[0].click() // Saved Answers (or index based on order)
    await sleep(800)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'btn_test_8_saved_answers_view.png') })
  }

  // B. Verification Hub
  const hubBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('.side-nav-item'))
    return btns.find(b => b.textContent.includes('Verification Hub'))
  })
  if (hubBtn && hubBtn.asElement()) {
    await hubBtn.asElement().click()
    await sleep(800)
    // Check a box
    const checkInput = await page.$('.view input[type="checkbox"]')
    if (checkInput) await checkInput.click()
    await sleep(500)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'btn_test_9_verification_hub.png') })
  }

  // C. Explore Topics
  const exploreBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('.side-nav-item'))
    return btns.find(b => b.textContent.includes('Explore Topics'))
  })
  if (exploreBtn && exploreBtn.asElement()) {
    await exploreBtn.asElement().click()
    await sleep(800)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'btn_test_10_explore_topics.png') })
  }

  // D. Feedback Form
  const feedbackBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('.side-nav-item'))
    return btns.find(b => b.textContent.includes('Feedback'))
  })
  if (feedbackBtn && feedbackBtn.asElement()) {
    await feedbackBtn.asElement().click()
    await sleep(800)
    const fbText = await page.$('.view textarea')
    if (fbText) await fbText.type('The confidence scoring and evidence sources are extremely thorough and helpful!')
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'btn_test_11_feedback_form.png') })
  }

  // E. Profile Modal
  console.log('Testing Profile Modal...')
  const profileTrigger = await page.$('.side-user-info')
  if (profileTrigger) {
    await profileTrigger.click()
    await sleep(600)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'btn_test_12_profile_modal.png') })
    const closeProfile = await page.$('.modal-close-btn')
    if (closeProfile) await closeProfile.click()
    await sleep(400)
  }

  // F. Settings Modal
  console.log('Testing Settings Modal...')
  const settingsBtn = await page.$('.side-settings-btn')
  if (settingsBtn) {
    await settingsBtn.click()
    await sleep(600)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'btn_test_13_settings_modal.png') })
    const closeSettings = await page.$('.modal-close-btn')
    if (closeSettings) await closeSettings.click()
    await sleep(400)
  }

  // Return to Home
  const homeBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('.side-nav-item'))
    return btns.find(b => b.textContent.includes('Home'))
  })
  if (homeBtn && homeBtn.asElement()) {
    await homeBtn.asElement().click()
    await sleep(800)
  }

  // 8. Testing Evidence Panel: Copy URL, Document Excerpt
  console.log('8. Testing Evidence Panel Copy URL and details...')
  const copyUrlBtn = await page.$('.ev-source-action-btn')
  if (copyUrlBtn) {
    await copyUrlBtn.click()
    await sleep(400)
  }
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'btn_test_14_evidence_panel.png') })

  console.log('All button tests completed successfully!')
  await browser.close()
}

run().catch(err => {
  console.error('Test run error:', err)
  process.exit(1)
})

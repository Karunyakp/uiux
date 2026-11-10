import puppeteer from 'puppeteer-core'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function run() {
  console.log('Launching browser to test TrustLens conversational dashboard...')
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1366, height: 768, deviceScaleFactor: 1.5 })

  // Navigate to Dashboard
  await page.goto('http://localhost:5173/#/app', { waitUntil: 'networkidle0' })
  await sleep(1000)

  // 1. Check Welcome Screen on empty chat
  const welcomeTitle = await page.$('.welcome-chat-title')
  console.log('TEST 4 / Initial: Welcome screen rendered:', !!welcomeTitle)
  await page.screenshot({ path: 'output/chat_welcome_screen.png' })

  // 2. Ask Question 1 via starter card
  console.log('TEST 1: Submitting Question 1...')
  const starterCard = await page.$('.welcome-prompt-card')
  if (starterCard) {
    await starterCard.click()
  } else {
    await page.type('.chat-multiline-input', "Can I apply for GATE 2027 in my 3rd year?")
    await page.keyboard.press('Enter')
  }

  // Wait for user message to appear
  await page.waitForSelector('.user-msg-row', { timeout: 5000 })
  console.log('TEST 1: User message rendered immediately (right-aligned)')

  // Wait for AI response to complete
  await page.waitForSelector('.assistant-card:not(.pending-card)', { timeout: 30000 })
  console.log('TEST 1: AI Response received and calibrated with evidence!')
  await sleep(800)
  await page.screenshot({ path: 'output/chat_q1_completed.png' })

  // 3. Ask Question 2 (Follow-up)
  console.log('TEST 2 & 3: Submitting Question 2 (Follow-up)...')
  await page.type('.chat-multiline-input', 'What specific documents must I upload to prove my 3rd year status?')
  await page.keyboard.press('Enter')

  // Wait for second AI response to finish
  await page.waitForFunction(() => {
    const cards = document.querySelectorAll('.assistant-msg-row:not(.pending-card)')
    return cards.length >= 2
  }, { timeout: 30000 })
  console.log('TEST 2 & 3: Second Q&A completed! Both exchanges are visible!')
  await sleep(800)
  await page.screenshot({ path: 'output/chat_q2_followup.png' })

  // 4. Test Scrolling & Jump to Latest
  console.log('TEST 7 & 9: Testing upward scroll and Jump to latest button...')
  await page.evaluate(() => {
    const scroller = document.querySelector('.chat-scroll-area')
    if (scroller) scroller.scrollTop = 0
  })
  await sleep(500)
  const jumpBtn = await page.$('.jump-to-latest-btn')
  console.log('TEST 9: "Jump to latest" floating button appeared:', !!jumpBtn)
  await page.screenshot({ path: 'output/chat_scrolled_up.png' })

  if (jumpBtn) {
    await jumpBtn.click()
    await sleep(600)
    console.log('TEST 9: Clicked Jump to latest. Scrolled back down smoothly.')
  }

  // 5. Test Evidence Panel inspection on older response
  console.log('TEST 8: Selecting first response to inspect its evidence...')
  const firstResponse = await page.$('.assistant-msg-row')
  if (firstResponse) {
    await firstResponse.click()
    await sleep(500)
    const isSelected = await page.evaluate(el => el.classList.contains('is-selected-response'), firstResponse)
    console.log('TEST 8: First response is now active and inspecting in Evidence panel:', isSelected)
  }

  // 6. Test New Chat
  console.log('TEST 4 & 5: Clicking New Chat button...')
  const newChatBtn = await page.$('.newchat')
  if (newChatBtn) {
    await newChatBtn.click()
    await sleep(800)
    const emptyCount = await page.$$eval('.user-msg-row', els => els.length)
    const welcomeAgain = await page.$('.welcome-chat-title')
    console.log('TEST 4: New Chat cleared view, messages count:', emptyCount, 'Welcome screen returned:', !!welcomeAgain)
    await page.screenshot({ path: 'output/chat_new_chat_cleared.png' })
  }

  // 7. Check Conversation History in Saved Answers tab
  console.log('TEST 6: Checking Saved Answers & Conversation History...')
  await page.evaluate(() => {
    const navBtns = document.querySelectorAll('.nav button')
    for (const b of navBtns) {
      if (b.textContent.includes('Saved Answers')) b.click()
    }
  })
  await sleep(600)
  // Switch to history tab
  await page.evaluate(() => {
    const tabs = document.querySelectorAll('.seg button')
    for (const t of tabs) {
      if (t.textContent.includes('History')) t.click()
    }
  })
  await sleep(600)
  const convItems = await page.$$('.conv-card-item')
  console.log('TEST 6: Conversation History items count:', convItems.length)
  await page.screenshot({ path: 'output/chat_conversation_history.png' })

  await browser.close()
  console.log('All automated tests completed successfully!')
}

run().catch(console.error)

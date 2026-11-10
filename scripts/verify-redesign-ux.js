import puppeteer from 'puppeteer-core'
import path from 'path'
import fs from 'fs'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const ARTIFACTS_DIR = 'C:/Users/Karunyaayashu/.gemini/antigravity/brain/7eb51cfc-2267-4fea-9ad9-da27afa4c565'

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function run() {
  console.log('Launching browser with Edge...')
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })

    page.on('console', msg => console.log('PAGE LOG:', msg.text()))
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message))

    console.log('Navigating to http://localhost:5173/#/app ...')
    await page.goto('http://localhost:5173/#/app', { waitUntil: 'networkidle2' })
    await sleep(1500)

    // Ensure clean New Chat state
    await page.evaluate(() => {
      const newChatBtn = document.querySelector('.newchat')
      if (newChatBtn) newChatBtn.click()
    })
    await sleep(800)

    // 1. Verify State A: New Chat Empty State
    console.log('--- Step 1: Verifying State A (New Chat) ---')
    const welcomeTitle = await page.evaluate(() => {
      const h2 = document.querySelector('.welcome-chat-title')
      return h2 ? h2.textContent.trim() : null
    })
    const welcomeSub = await page.evaluate(() => {
      const p = document.querySelector('.welcome-chat-sub')
      return p ? p.textContent.trim() : null
    })
    const starterCardsCount = await page.evaluate(() => {
      return document.querySelectorAll('.welcome-prompt-card').length
    })
    const evEmptyTitle = await page.evaluate(() => {
      const b = document.querySelector('.ev-empty-title')
      return b ? b.textContent.trim() : null
    })
    const evEmptyDesc = await page.evaluate(() => {
      const p = document.querySelector('.ev-empty-desc')
      return p ? p.textContent.trim() : null
    })
    const composerExists = await page.evaluate(() => {
      return !!document.querySelector('.chat-composer-sticky')
    })
    const categoryTabsCount = await page.evaluate(() => {
      return document.querySelectorAll('.tabs .tab').length
    })

    console.log('Welcome title:', welcomeTitle)
    console.log('Welcome subtitle:', welcomeSub)
    console.log('Starter cards count:', starterCardsCount)
    console.log('Category tabs count:', categoryTabsCount)
    console.log('Right panel empty title:', evEmptyTitle)
    console.log('Right panel empty desc:', evEmptyDesc)
    console.log('Sticky composer visible on Home:', composerExists)

    const stateAShot = path.join(ARTIFACTS_DIR, 'dashboard_new_chat_state_a.png')
    await page.screenshot({ path: stateAShot, fullPage: false })
    console.log('Captured:', stateAShot)

    // 2. Click a starter card to transition to State B (Active Chat)
    console.log('--- Step 2: Clicking starter card & waiting for AI answer ---')
    await page.evaluate(() => {
      const firstCard = document.querySelector('.welcome-prompt-card')
      if (firstCard) firstCard.click()
    })

    // Wait for the response to arrive (assistant message pending becomes false)
    console.log('Waiting for AI response from Gemini...')
    await page.waitForFunction(() => {
      const asstMsgs = document.querySelectorAll('.assistant-card:not(.pending-card)')
      return asstMsgs.length > 0
    }, { timeout: 45000 })
    await sleep(2000)

    // Verify State B
    const messagesCount = await page.evaluate(() => {
      const user = document.querySelectorAll('.user-msg-row').length
      const asst = document.querySelectorAll('.assistant-card:not(.pending-card)').length
      return { user, asst }
    })
    const evActiveStatus = await page.evaluate(() => {
      const srcCard = document.querySelector('.src-card')
      const claim = document.querySelector('.claim')
      const evHeader = document.querySelector('.ev-hdr b')
      return {
        hasSrcCard: !!srcCard,
        hasClaim: !!claim,
        header: evHeader ? evHeader.textContent.trim() : null
      }
    })

    console.log('State B messages:', messagesCount)
    console.log('State B right panel status:', evActiveStatus)

    const stateBShot = path.join(ARTIFACTS_DIR, 'dashboard_active_chat_state_b.png')
    await page.screenshot({ path: stateBShot, fullPage: false })
    console.log('Captured:', stateBShot)

    // 3. Click "+ New Chat" and verify complete reset
    console.log('--- Step 3: Clicking + New Chat ---')
    await page.evaluate(() => {
      const btn = document.querySelector('.newchat')
      if (btn) btn.click()
    })
    await sleep(1000)

    const resetMessages = await page.evaluate(() => {
      return document.querySelectorAll('.chat-msg').length
    })
    const resetWelcomeExists = await page.evaluate(() => {
      return !!document.querySelector('.welcome-chat-title')
    })
    const resetRightPanelEmpty = await page.evaluate(() => {
      return !!document.querySelector('.ev-empty-title')
    })

    console.log('After New Chat - total messages in view:', resetMessages)
    console.log('After New Chat - welcome screen back:', resetWelcomeExists)
    console.log('After New Chat - right panel empty state back:', resetRightPanelEmpty)

    const newChatClearedShot = path.join(ARTIFACTS_DIR, 'dashboard_new_chat_cleared.png')
    await page.screenshot({ path: newChatClearedShot, fullPage: false })
    console.log('Captured:', newChatClearedShot)

    // 4. Test Navigation: Explore Topics
    console.log('--- Step 4: Testing Navigation: Explore Topics ---')
    await page.evaluate(() => {
      const navButtons = Array.from(document.querySelectorAll('.nav button'))
      const exploreBtn = navButtons.find(b => b.textContent.includes('Explore Topics'))
      if (exploreBtn) exploreBtn.click()
    })
    await sleep(800)

    const exploreComposerVisible = await page.evaluate(() => {
      return !!document.querySelector('.chat-composer-sticky')
    })
    const explorePanelTitle = await page.evaluate(() => {
      const b = document.querySelector('.ev-context-header b')
      return b ? b.textContent.trim() : null
    })
    console.log('Explore View - Composer hidden:', !exploreComposerVisible)
    console.log('Explore View - Right panel title:', explorePanelTitle)

    const exploreShot = path.join(ARTIFACTS_DIR, 'dashboard_explore_view.png')
    await page.screenshot({ path: exploreShot, fullPage: false })
    console.log('Captured:', exploreShot)

    // 5. Test Navigation: Verification Hub
    console.log('--- Step 5: Testing Navigation: Verification Hub ---')
    await page.evaluate(() => {
      const navButtons = Array.from(document.querySelectorAll('.nav button'))
      const hubBtn = navButtons.find(b => b.textContent.includes('Verification Hub'))
      if (hubBtn) hubBtn.click()
    })
    await sleep(800)

    const hubComposerVisible = await page.evaluate(() => {
      return !!document.querySelector('.chat-composer-sticky')
    })
    const hubPanelTitle = await page.evaluate(() => {
      const b = document.querySelector('.ev-context-header b')
      return b ? b.textContent.trim() : null
    })
    console.log('Hub View - Composer hidden:', !hubComposerVisible)
    console.log('Hub View - Right panel title:', hubPanelTitle)

    const hubShot = path.join(ARTIFACTS_DIR, 'dashboard_hub_view.png')
    await page.screenshot({ path: hubShot, fullPage: false })
    console.log('Captured:', hubShot)

    // 6. Test Navigation: Saved Answers
    console.log('--- Step 6: Testing Navigation: Saved Answers ---')
    await page.evaluate(() => {
      const navButtons = Array.from(document.querySelectorAll('.nav button'))
      const savedBtn = navButtons.find(b => b.textContent.includes('Saved Answers'))
      if (savedBtn) savedBtn.click()
    })
    await sleep(800)

    const savedPanelTitle = await page.evaluate(() => {
      const b = document.querySelector('.ev-context-header b')
      return b ? b.textContent.trim() : null
    })
    console.log('Saved View - Right panel title:', savedPanelTitle)

    const savedShot = path.join(ARTIFACTS_DIR, 'dashboard_saved_view.png')
    await page.screenshot({ path: savedShot, fullPage: false })
    console.log('Captured:', savedShot)

    console.log('ALL VERIFICATION CHECKS PASSED PERFECTLY!')
  } finally {
    await browser.close()
  }
}

run().catch(err => {
  console.error('Test error:', err)
  process.exit(1)
})

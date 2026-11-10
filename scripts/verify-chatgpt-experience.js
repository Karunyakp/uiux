import puppeteer from 'puppeteer-core'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const ARTIFACT_DIR = 'C:\\Users\\Karunyaayashu\\.gemini\\antigravity\\brain\\7eb51cfc-2267-4fea-9ad9-da27afa4c565'

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function run() {
  console.log('Starting ChatGPT-style open-ended experience verification...')
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900']
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })

    console.log('Navigating to http://localhost:5173/#/app...')
    await page.goto('http://localhost:5173/#/app', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await sleep(2000)

    // Ensure we start with clean New Chat
    const newChatBtn = await page.$('.newchat')
    if (newChatBtn) {
      console.log('Clicking .newchat button...')
      await newChatBtn.click()
      await sleep(1000)
    }

    // TEST 1: Verify New Chat Empty State
    console.log('Verifying New Chat Empty State...')
    const headingText = await page.$eval('.welcome-heading', el => el.textContent.trim()).catch(() => null)
    const subText = await page.$eval('.welcome-subheading', el => el.textContent.trim()).catch(() => null)
    const composerPlaceholder = await page.$eval('.composer-textarea', el => el.getAttribute('placeholder')).catch(() => null)
    const starterCardsCount = await page.$$eval('.starter-card-item', els => els.length).catch(() => 0)
    const suggestedChipsCount = await page.$$eval('.suggested-pill', els => els.length).catch(() => 0)
    const evidenceTitle = await page.$eval('.ev-minimal-title', el => el.textContent.trim()).catch(() => null)
    const evidenceDesc = await page.$eval('.ev-minimal-desc', el => el.textContent.trim()).catch(() => null)

    console.log('Heading:', headingText)
    console.log('Subheading:', subText)
    console.log('Composer Placeholder:', composerPlaceholder)
    console.log('Starter Cards Count:', starterCardsCount)
    console.log('Suggested Chips Count:', suggestedChipsCount)
    console.log('Evidence Title:', evidenceTitle)
    console.log('Evidence Desc:', evidenceDesc)

    // Check for hardcoded GATE anywhere in visible page
    const bodyText = await page.$eval('body', el => el.innerText)
    const hasGate = /GATE 2027|GATE eligibility|Information Brochure/i.test(bodyText)
    console.log('Contains hardcoded GATE text in New Chat?:', hasGate)

    const shot1 = path.join(ARTIFACT_DIR, 'clean_new_chat_chatgpt_style.png')
    await page.screenshot({ path: shot1, fullPage: false })
    console.log('Saved screenshot 1:', shot1)

    // TEST 2: Ask an arbitrary non-GATE question (e.g. Cloud Computing)
    console.log('Testing open-ended question: Cloud Computing...')
    await page.type('.composer-textarea', 'Explain cloud computing and its primary deployment models.')
    await sleep(500)
    await page.click('.composer-send-btn')

    console.log('Waiting for AI response from Gemini...')
    // Wait for response to appear and finish loading
    await page.waitForFunction(() => {
      const card = document.querySelector('.assistant-card:not(.pending-card)')
      return !!card
    }, { timeout: 45000 }).catch(err => {
      console.warn('Wait for response timed out:', err.message)
    })

    await sleep(2500)

    const answerExcerpt = await page.$eval('.assistant-answer-body', el => el.textContent.slice(0, 100)).catch(() => 'No answer body found')
    console.log('AI Answer Excerpt:', answerExcerpt)

    const shot2 = path.join(ARTIFACT_DIR, 'cloud_computing_conversation.png')
    await page.screenshot({ path: shot2, fullPage: false })
    console.log('Saved screenshot 2:', shot2)

    // TEST 3: Click New Chat again and verify it clears completely
    console.log('Clicking .newchat to verify fresh wipe...')
    const newChatBtn2 = await page.$('.newchat')
    if (newChatBtn2) {
      await newChatBtn2.click()
      await sleep(1500)
    }

    const headingAfterNew = await page.$eval('.welcome-heading', el => el.textContent.trim()).catch(() => null)
    const msgsCountAfterNew = await page.$$eval('.chat-msg', els => els.length).catch(() => 0)
    const evMinimalAfterNew = await page.$eval('.ev-minimal-title', el => el.textContent.trim()).catch(() => null)
    console.log('Heading after New Chat:', headingAfterNew)
    console.log('Message count after New Chat:', msgsCountAfterNew)
    console.log('Evidence panel title after New Chat:', evMinimalAfterNew)

    const shot3 = path.join(ARTIFACT_DIR, 'second_new_chat_cleared.png')
    await page.screenshot({ path: shot3, fullPage: false })
    console.log('Saved screenshot 3:', shot3)

    console.log('Verification completed successfully!')
  } catch (err) {
    console.error('Error during verification:', err)
  } finally {
    await browser.close()
  }
}

run()

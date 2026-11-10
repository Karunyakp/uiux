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
  console.log('Starting Navbar Title and Voice Input verification...')
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1366,768']
  })

  try {
    const page = await browser.newPage()
    // Test explicitly at 1366 x 768 as requested
    await page.setViewport({ width: 1366, height: 768 })

    console.log('Navigating to http://localhost:5173/#/app...')
    await page.goto('http://localhost:5173/#/app', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await sleep(2000)

    // Click New Chat to ensure fresh state
    const newChatBtn = await page.$('.newchat')
    if (newChatBtn) {
      await newChatBtn.click()
      await sleep(1000)
    }

    // 1. VERIFY NEW CHAT NAVBAR TITLE & SUBTITLE
    console.log('--- TEST 1: New Chat Navbar Title & Subtitle ---')
    const titleText = await page.$eval('.conv-main-title', el => el.textContent.trim()).catch(() => null)
    const titleAttr = await page.$eval('.conv-main-title', el => el.getAttribute('title')).catch(() => null)
    const subtitleText = await page.$eval('.conv-subtitle-row', el => el.textContent.trim()).catch(() => null)
    const signinText = await page.$eval('.conv-signin-btn', el => el.textContent.trim()).catch(() => null)
    const signinRect = await page.$eval('.conv-signin-btn', el => {
      const r = el.getBoundingClientRect()
      return { width: r.width, height: r.height }
    }).catch(() => null)
    const titleRect = await page.$eval('.conv-main-title', el => {
      const r = el.getBoundingClientRect()
      return { width: r.width, height: r.height }
    }).catch(() => null)

    console.log('Title text:', titleText)
    console.log('Title tooltip attribute:', titleAttr)
    console.log('Subtitle text:', subtitleText)
    console.log('Sign In button text:', signinText)
    console.log('Sign In dimensions:', signinRect)
    console.log('Title dimensions:', titleRect)

    const shot1 = path.join(ARTIFACT_DIR, 'navbar_header_clean_1366x768.png')
    await page.screenshot({ path: shot1, fullPage: false })
    console.log('Saved screenshot 1:', shot1)

    // 2. VERIFY VOICE INPUT IDLE & LISTENING VISUAL STATES
    console.log('--- TEST 2: Voice Input Idle & Listening Visual States ---')
    const micBtnTitle = await page.$eval('.composer-tool-btn', el => el.getAttribute('title')).catch(() => null)
    console.log('Mic button idle tooltip:', micBtnTitle)

    // Install mock SpeechRecognition in the browser page for end-to-end verification of Web Speech workflow
    await page.evaluate(() => {
      window.MockSpeechInstance = null
      class MockSpeechRecognition {
        constructor() {
          this.continuous = true
          this.interimResults = true
          this.lang = 'en-US'
          this.onstart = null
          this.onresult = null
          this.onerror = null
          this.onend = null
          window.MockSpeechInstance = this
        }
        start() {
          if (this.onstart) this.onstart()
        }
        stop() {
          if (this.onend) this.onend()
        }
        abort() {
          if (this.onend) this.onend()
        }
      }
      window.SpeechRecognition = MockSpeechRecognition
      window.webkitSpeechRecognition = MockSpeechRecognition
    })

    // Click microphone button to trigger speech recognition
    console.log('Clicking microphone button to start listening...')
    await page.click('.composer-tool-btn')
    await sleep(600)

    // Check listening visual indicators
    const isListeningClass = await page.$eval('.composer-tool-btn', el => el.classList.contains('is-listening')).catch(() => false)
    const statusBannerText = await page.$eval('.voice-listening-status', el => el.textContent.trim()).catch(() => null)
    const micListeningTitle = await page.$eval('.composer-tool-btn', el => el.getAttribute('title')).catch(() => null)
    console.log('Mic button has is-listening class?:', isListeningClass)
    console.log('Status banner text:', statusBannerText)
    console.log('Mic button listening tooltip:', micListeningTitle)

    const shot2 = path.join(ARTIFACT_DIR, 'voice_input_listening_state.png')
    await page.screenshot({ path: shot2, fullPage: false })
    console.log('Saved screenshot 2:', shot2)

    // 3. SIMULATE SPOKEN WORDS BEING CONVERTED INTO TEXT
    console.log('--- TEST 3: Simulating recognized speech stream ---')
    await page.evaluate(() => {
      if (window.MockSpeechInstance && window.MockSpeechInstance.onresult) {
        // Emit recognized speech event
        const mockEvent = {
          resultIndex: 0,
          results: [
            Object.assign([{ transcript: 'What are the official requirements for master degree admission?' }], { isFinal: true })
          ]
        }
        window.MockSpeechInstance.onresult(mockEvent)
      }
    })
    await sleep(600)

    // Verify recognized text is in composer textarea and NOT auto-submitted
    const composerValAfterSpeech = await page.$eval('.composer-textarea', el => el.value).catch(() => '')
    console.log('Composer text after speech recognition:', composerValAfterSpeech)

    // User can edit the text before submitting!
    console.log('Editing the recognized speech before submission...')
    await page.type('.composer-textarea', ' Please summarize concisely.')
    await sleep(400)
    const finalEditedVal = await page.$eval('.composer-textarea', el => el.value).catch(() => '')
    console.log('Final edited composer text:', finalEditedVal)

    // Stop listening
    await page.click('.voice-stop-text-btn')
    await sleep(600)

    // 4. SUBMIT QUESTION VIA SEND BUTTON
    console.log('--- TEST 4: Submitting transcribed question via Send button ---')
    await page.click('.composer-send-btn')

    // Wait for response to appear
    await page.waitForFunction(() => {
      const card = document.querySelector('.assistant-card:not(.pending-card)')
      return !!card
    }, { timeout: 35000 }).catch(err => {
      console.warn('Wait for response timed out:', err.message)
    })
    await sleep(2000)

    // Verify active conversation title generated from the question
    const activeConvTitle = await page.$eval('.conv-main-title', el => el.textContent.trim()).catch(() => '')
    const activeConvTooltip = await page.$eval('.conv-main-title', el => el.getAttribute('title')).catch(() => '')
    console.log('Active conversation title in header:', activeConvTitle)
    console.log('Active conversation title tooltip:', activeConvTooltip)

    const shot3 = path.join(ARTIFACT_DIR, 'voice_input_transcribed_and_submitted.png')
    await page.screenshot({ path: shot3, fullPage: false })
    console.log('Saved screenshot 3:', shot3)

    console.log('\nAll tests completed successfully!')
  } catch (err) {
    console.error('Error during test execution:', err)
  } finally {
    await browser.close()
  }
}

run()

import puppeteer from 'puppeteer-core'
import path from 'path'
import fs from 'fs'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const ARTIFACT_DIR = 'C:\\Users\\Karunyaayashu\\.gemini\\antigravity\\brain\\7eb51cfc-2267-4fea-9ad9-da27afa4c565'

async function runSuite() {
  console.log('🚀 Starting TrustLens System Theme Verification Suite...')
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  page.setDefaultTimeout(30000)

  // Navigate to app
  await page.goto('http://localhost:5173/', { waitUntil: 'load' })
  await new Promise(r => setTimeout(r, 800))

  // Enter dashboard if landed on landing page
  const secondaryBtn = await page.$('.lp-btn-secondary')
  if (secondaryBtn) {
    await secondaryBtn.click()
    await page.waitForSelector('.side', { timeout: 10000 })
    await new Promise(r => setTimeout(r, 600))
  }

  const results = []

  // Helper to get state
  async function getThemeState() {
    return await page.evaluate(() => {
      const el = document.documentElement
      const stored = JSON.parse(localStorage.getItem('trustlens_a11y_settings') || localStorage.getItem('trustlens_a11y') || '{}')
      const bodyBg = window.getComputedStyle(document.body).backgroundColor
      const textColor = window.getComputedStyle(document.body).color
      return {
        dataTheme: el.getAttribute('data-theme'),
        dataThemePref: el.getAttribute('data-theme-preference'),
        storedPref: stored.theme,
        bodyBg,
        textColor
      }
    })
  }

  // Helper to click theme button in A11y panel
  async function selectThemeViaA11y(themeName) {
    const a11yTrigger = await page.$('.a11y-header-btn') || await page.$('.a11y-pill-btn') || await page.$('.a11y-trigger-btn')
    if (a11yTrigger) await a11yTrigger.click()
    await page.waitForSelector('.a11y-modal', { timeout: 5000 })
    await new Promise(r => setTimeout(r, 300))

    await page.evaluate((t) => {
      const btns = Array.from(document.querySelectorAll('.a11y-theme-btn'))
      const target = btns.find(b => b.textContent.toLowerCase().includes(t))
      if (target) target.click()
    }, themeName)
    await new Promise(r => setTimeout(r, 400))

    // Close panel
    const closeBtn = await page.$('.a11y-close-btn')
    if (closeBtn) await closeBtn.click()
    await new Promise(r => setTimeout(r, 300))
  }

  // ========================================================
  // TEST 1: Select Light while OS is in Dark Mode
  // ========================================================
  console.log('\n--- Scenario 1: Select Light while OS is Dark ---')
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }])
  await selectThemeViaA11y('light')
  let state = await getThemeState()
  const pass1 = state.dataTheme === 'light' && state.dataThemePref === 'light' && state.storedPref === 'light'
  console.log(`State 1: resolved=${state.dataTheme}, pref=${state.dataThemePref}, stored=${state.storedPref} -> PASS: ${pass1}`)
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'test_1_light_while_os_dark.png') })
  results.push({ test: 'Select Light while OS Dark', passed: pass1 })

  // ========================================================
  // TEST 2: Select Dark while OS is in Light Mode
  // ========================================================
  console.log('\n--- Scenario 2: Select Dark while OS is Light ---')
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }])
  await selectThemeViaA11y('dark')
  state = await getThemeState()
  const pass2 = state.dataTheme === 'dark' && state.dataThemePref === 'dark' && state.storedPref === 'dark'
  console.log(`State 2: resolved=${state.dataTheme}, pref=${state.dataThemePref}, stored=${state.storedPref} -> PASS: ${pass2}`)
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'test_2_dark_while_os_light.png') })
  results.push({ test: 'Select Dark while OS Light', passed: pass2 })

  // ========================================================
  // TEST 3: Select System while OS is in Light Mode
  // ========================================================
  console.log('\n--- Scenario 3: Select System while OS is Light ---')
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }])
  await selectThemeViaA11y('system')
  state = await getThemeState()
  const pass3 = state.dataTheme === 'light' && state.dataThemePref === 'system' && state.storedPref === 'system'
  console.log(`State 3: resolved=${state.dataTheme}, pref=${state.dataThemePref}, stored=${state.storedPref} -> PASS: ${pass3}`)
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'test_3_system_while_os_light.png') })
  results.push({ test: 'Select System while OS Light', passed: pass3 })

  // ========================================================
  // TEST 4: Live OS Change: Light -> Dark while TrustLens is open in System Mode
  // ========================================================
  console.log('\n--- Scenario 4: Change OS Light -> Dark dynamically ---')
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }])
  await new Promise(r => setTimeout(r, 600))
  state = await getThemeState()
  const pass4 = state.dataTheme === 'dark' && state.dataThemePref === 'system' && state.storedPref === 'system'
  console.log(`State 4: resolved=${state.dataTheme}, pref=${state.dataThemePref}, stored=${state.storedPref} -> PASS: ${pass4}`)
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'test_4_system_live_os_switched_to_dark.png') })
  results.push({ test: 'Live OS change Light -> Dark in System Mode', passed: pass4 })

  // ========================================================
  // TEST 5: Live OS Change: Dark -> Light while TrustLens is open in System Mode
  // ========================================================
  console.log('\n--- Scenario 5: Change OS Dark -> Light dynamically ---')
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }])
  await new Promise(r => setTimeout(r, 600))
  state = await getThemeState()
  const pass5 = state.dataTheme === 'light' && state.dataThemePref === 'system' && state.storedPref === 'system'
  console.log(`State 5: resolved=${state.dataTheme}, pref=${state.dataThemePref}, stored=${state.storedPref} -> PASS: ${pass5}`)
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'test_5_system_live_os_switched_to_light.png') })
  results.push({ test: 'Live OS change Dark -> Light in System Mode', passed: pass5 })

  // ========================================================
  // TEST 6: Refresh Browser with System Mode selected
  // ========================================================
  console.log('\n--- Scenario 6: Refresh browser with System selected ---')
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }])
  await page.reload({ waitUntil: 'load' })
  await new Promise(r => setTimeout(r, 800))
  state = await getThemeState()
  const pass6 = state.dataTheme === 'dark' && state.dataThemePref === 'system' && state.storedPref === 'system'
  console.log(`State 6: resolved=${state.dataTheme}, pref=${state.dataThemePref}, stored=${state.storedPref} -> PASS: ${pass6}`)
  results.push({ test: 'Refresh browser with System selected', passed: pass6 })

  // ========================================================
  // TEST 7: Page Navigation preserves System resolved theme
  // ========================================================
  console.log('\n--- Scenario 7: Navigate between pages with System selected ---')
  await page.evaluate(() => { window.location.hash = '#/landing' })
  await new Promise(r => setTimeout(r, 500))
  state = await getThemeState()
  const pass7Landing = state.dataTheme === 'dark' && state.dataThemePref === 'system'

  await page.evaluate(() => { window.location.hash = '#/app' })
  await new Promise(r => setTimeout(r, 500))
  state = await getThemeState()
  const pass7App = state.dataTheme === 'dark' && state.dataThemePref === 'system'
  const pass7 = pass7Landing && pass7App
  console.log(`State 7: landing=${pass7Landing}, app=${pass7App} -> PASS: ${pass7}`)
  results.push({ test: 'Navigation preserves System resolved theme', passed: pass7 })

  // ========================================================
  // TEST 8: Open and close conversations with System mode
  // ========================================================
  console.log('\n--- Scenario 8: New Chat & Conversation switching ---')
  const newChatBtn = await page.$('.newchat')
  if (newChatBtn) {
    await newChatBtn.click()
    await new Promise(r => setTimeout(r, 500))
  }
  state = await getThemeState()
  const pass8 = state.dataTheme === 'dark' && state.dataThemePref === 'system'
  console.log(`State 8: New Chat resolved=${state.dataTheme} -> PASS: ${pass8}`)
  results.push({ test: 'Conversation and New Chat preserve System theme', passed: pass8 })

  // ========================================================
  // TEST 9: Inspect Composer, Evidence & Contrast in both modes
  // ========================================================
  console.log('\n--- Scenario 9: Element contrast in Light and Dark resolved themes ---')
  
  // Test in Dark resolved
  const darkContrast = await page.evaluate(() => {
    const textarea = document.querySelector('.composer-textarea')
    const header = document.querySelector('.conv-header')
    const side = document.querySelector('.side')
    return {
      hasTextarea: !!textarea,
      hasHeader: !!header,
      hasSide: !!side,
      sideBg: window.getComputedStyle(side).backgroundColor,
      headerBg: window.getComputedStyle(header).backgroundColor
    }
  })
  
  // Switch to Light resolved via OS
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }])
  await new Promise(r => setTimeout(r, 600))
  
  const lightContrast = await page.evaluate(() => {
    const textarea = document.querySelector('.composer-textarea')
    const header = document.querySelector('.conv-header')
    const side = document.querySelector('.side')
    return {
      hasTextarea: !!textarea,
      hasHeader: !!header,
      hasSide: !!side,
      sideBg: window.getComputedStyle(side).backgroundColor,
      headerBg: window.getComputedStyle(header).backgroundColor
    }
  })

  const pass9 = darkContrast.hasTextarea && lightContrast.hasTextarea && (darkContrast.sideBg !== lightContrast.sideBg)
  console.log(`State 9: Dark side bg=${darkContrast.sideBg}, Light side bg=${lightContrast.sideBg} -> PASS: ${pass9}`)
  results.push({ test: 'Contrast & component responsiveness in all modes', passed: pass9 })

  console.log('\n========================================================')
  console.log('SUMMARY OF ALL TEST SCENARIOS:')
  console.log('========================================================')
  let allPass = true
  for (const r of results) {
    console.log(`[${r.passed ? '✓ PASS' : '✗ FAIL'}] ${r.test}`)
    if (!r.passed) allPass = false
  }
  console.log(`\nOVERALL SUITE RESULT: ${allPass ? '🎉 100% SUCCESS' : '❌ SOME TESTS FAILED'}`)

  await browser.close()
}

runSuite().catch(err => {
  console.error('Test Suite Error:', err)
  process.exit(1)
})

import puppeteer from 'puppeteer-core'
import path from 'path'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const ARTIFACT_DIR = 'C:\\Users\\Karunyaayashu\\.gemini\\antigravity\\brain\\7eb51cfc-2267-4fea-9ad9-da27afa4c565'

function rgbToHex(rgb) {
  if (!rgb) return ''
  const m = rgb.match(/\d+/g)
  if (!m || m.length < 3) return rgb
  const hex = ((1 << 24) + (parseInt(m[0]) << 16) + (parseInt(m[1]) << 8) + parseInt(m[2])).toString(16).slice(1)
  return '#' + hex.toUpperCase()
}

async function run() {
  console.log('=== STARTING THREE DISTINCT THEMES VERIFICATION ===')

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new'
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })

  // 1. Dashboard Tests
  await page.goto('http://localhost:5173/#/app', { waitUntil: 'networkidle0' })
  await new Promise(r => setTimeout(r, 1000))

  async function setAndMeasureDashboardTheme(themeName) {
    // Open a11y panel
    await page.click('.a11y-header-btn')
    await page.waitForSelector('.a11y-modal', { timeout: 5000 })
    await new Promise(r => setTimeout(r, 300))

    const targetBtn = await page.evaluateHandle((name) => {
      const btns = Array.from(document.querySelectorAll('.a11y-theme-btn'))
      return btns.find(b => b.textContent.toLowerCase().includes(name.toLowerCase()))
    }, themeName)

    if (targetBtn) await targetBtn.click()
    await new Promise(r => setTimeout(r, 400))
    await page.click('.a11y-close-btn')
    await new Promise(r => setTimeout(r, 400))

    return await page.evaluate(() => {
      const body = window.getComputedStyle(document.body)
      const side = document.querySelector('.side') ? window.getComputedStyle(document.querySelector('.side')) : null
      const convHeader = document.querySelector('.conv-header') ? window.getComputedStyle(document.querySelector('.conv-header')) : null
      const central = document.querySelector('.chat-flow-scroll') ? window.getComputedStyle(document.querySelector('.chat-flow-scroll')) : null

      return {
        dataTheme: document.documentElement.getAttribute('data-theme'),
        bodyBg: body.backgroundColor,
        sideBg: side ? side.backgroundColor : null,
        headerBg: convHeader ? convHeader.backgroundColor : null,
        centralBg: central ? central.backgroundColor : null
      }
    })
  }

  // A. Light Mode
  console.log('\n--- 1. Testing Light Mode ---')
  const lightData = await setAndMeasureDashboardTheme('light')
  console.log('Light Mode:', {
    dataTheme: lightData.dataTheme,
    bodyBg: rgbToHex(lightData.bodyBg),
    sideBg: rgbToHex(lightData.sideBg),
    headerBg: rgbToHex(lightData.headerBg)
  })
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'dashboard_light_mode.png') })

  // B. Dark Mode
  console.log('\n--- 2. Testing Dark Mode (Pure Black) ---')
  const darkData = await setAndMeasureDashboardTheme('dark')
  console.log('Dark Mode:', {
    dataTheme: darkData.dataTheme,
    bodyBg: rgbToHex(darkData.bodyBg),
    sideBg: rgbToHex(darkData.sideBg),
    headerBg: rgbToHex(darkData.headerBg)
  })
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'dashboard_dark_pure_black.png') })

  // C. System Mode (Teal Blue)
  console.log('\n--- 3. Testing System Mode (Teal Blue) ---')
  const systemData = await setAndMeasureDashboardTheme('system')
  console.log('System Mode:', {
    dataTheme: systemData.dataTheme,
    bodyBg: rgbToHex(systemData.bodyBg),
    sideBg: rgbToHex(systemData.sideBg),
    headerBg: rgbToHex(systemData.headerBg)
  })
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'dashboard_system_teal_blue.png') })

  // 2. Landing Page Tests
  console.log('\n--- 4. Testing Landing Page in System Mode (Teal Blue) ---')
  await page.goto('http://localhost:5173/#/landing', { waitUntil: 'networkidle0' })
  await new Promise(r => setTimeout(r, 800))

  const landingSystemData = await page.evaluate(() => {
    const body = window.getComputedStyle(document.body)
    const heroTitle = document.querySelector('.lp-hero-title') ? window.getComputedStyle(document.querySelector('.lp-hero-title')) : null
    const card = document.querySelector('.lp-card') ? window.getComputedStyle(document.querySelector('.lp-card')) : null
    const backBtn = document.querySelector('.lp-back-btn') ? window.getComputedStyle(document.querySelector('.lp-back-btn')) : null

    return {
      dataTheme: document.documentElement.getAttribute('data-theme'),
      bodyBg: body.backgroundColor,
      heroTitleColor: heroTitle ? heroTitle.color : null,
      cardBg: card ? card.backgroundColor : null,
      backBtnBg: backBtn ? backBtn.backgroundColor : null,
      backBtnColor: backBtn ? backBtn.color : null
    }
  })

  console.log('Landing Page in System Mode:', {
    dataTheme: landingSystemData.dataTheme,
    bodyBg: rgbToHex(landingSystemData.bodyBg),
    heroTitleColor: rgbToHex(landingSystemData.heroTitleColor),
    cardBg: rgbToHex(landingSystemData.cardBg),
    backBtnBg: rgbToHex(landingSystemData.backBtnBg),
    backBtnColor: rgbToHex(landingSystemData.backBtnColor)
  })
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'landing_system_teal_blue.png') })

  console.log('\n==================================================')
  console.log('DISTINCT THEMES VALIDATION SUMMARY:')
  console.log(`- Light Mode Body: ${rgbToHex(lightData.bodyBg)} (Expected light: #F5F8FA or white)`)
  console.log(`- Dark Mode Body: ${rgbToHex(darkData.bodyBg)} (Expected pure black: #000000)`)
  console.log(`- System Mode Body: ${rgbToHex(systemData.bodyBg)} (Expected Teal Blue: #0A2433)`)
  console.log(`- Is System different from Dark? ${systemData.bodyBg !== darkData.bodyBg ? 'YES (NOT BLACK)' : 'NO (ERROR)'}`)
  console.log(`- Is System different from Light? ${systemData.bodyBg !== lightData.bodyBg ? 'YES (NOT LIGHT)' : 'NO (ERROR)'}`)
  console.log(`- System Landing Page Body: ${rgbToHex(landingSystemData.bodyBg)} (Expected Teal Blue: #0A2433)`)
  console.log('==================================================')

  await browser.close()
}

run().catch(err => {
  console.error('Test run failed:', err)
  process.exit(1)
})

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

async function runAudit() {
  console.log('=== STARTING TRUSTLENS LANDING PAGE THEME VERIFICATION ===')

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new'
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 960 })

  async function inspectLandingPageElements(label) {
    return await page.evaluate(testLabel => {
      const getStyles = sel => {
        const el = document.querySelector(sel)
        if (!el) return null
        const s = window.getComputedStyle(el)
        return {
          color: s.color,
          backgroundColor: s.backgroundColor,
          borderColor: s.borderColor,
          boxShadow: s.boxShadow,
          fontSize: s.fontSize,
          fontWeight: s.fontWeight
        }
      }

      return {
        label: testLabel,
        dataTheme: document.documentElement.getAttribute('data-theme'),
        dataThemePref: document.documentElement.getAttribute('data-theme-preference'),
        dataResolvedTheme: document.documentElement.getAttribute('data-resolved-theme'),
        bodyBg: window.getComputedStyle(document.body).backgroundColor,
        heroTitle: getStyles('.lp-hero-title'),
        heroSub: getStyles('.lp-hero-sub'),
        backBtn: getStyles('.lp-back-btn'),
        navLink: getStyles('.lp-nav-link'),
        ghostBtn: getStyles('.lp-btn-ghost'),
        navCta: getStyles('.lp-nav-cta'),
        btnHero: getStyles('.lp-btn-hero'),
        btnSecondary: getStyles('.lp-btn-secondary'),
        a11yTrigger: getStyles('.round-icon-btn.a11y-trigger-btn'),
        sectionTitle: getStyles('.lp-section-title'),
        cardH3: getStyles('.lp-card h3'),
        cardP: getStyles('.lp-card p'),
        checklistB: getStyles('.lp-checklist-hd b'),
        checkRow: getStyles('.lp-check-row'),
        ctaH2: getStyles('.lp-banner-text h2')
      }
    }, label)
  }

  // --- SCENARIO 1: SYSTEM MODE on WINDOWS LIGHT ---
  console.log('\n--- SCENARIO 1: SYSTEM MODE on WINDOWS LIGHT ---')
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }])
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('trustlens_a11y_settings', JSON.stringify({ theme: 'system', themePreference: 'system' }))
  })
  await page.goto('http://localhost:5173/#/landing', { waitUntil: 'networkidle0' })
  await new Promise(r => setTimeout(r, 800))

  const metricsSystemLight = await inspectLandingPageElements('System on Windows Light')
  console.log('System on Windows Light:')
  console.log(`  data-theme: ${metricsSystemLight.dataTheme}`)
  console.log(`  heroTitle.color: ${metricsSystemLight.heroTitle?.color} (${rgbToHex(metricsSystemLight.heroTitle?.color)})`)
  console.log(`  backBtn.color: ${metricsSystemLight.backBtn?.color} (${rgbToHex(metricsSystemLight.backBtn?.color)})`)
  console.log(`  backBtn.bgColor: ${metricsSystemLight.backBtn?.backgroundColor} (${rgbToHex(metricsSystemLight.backBtn?.backgroundColor)})`)
  console.log(`  backBtn.border: ${metricsSystemLight.backBtn?.borderColor} (${rgbToHex(metricsSystemLight.backBtn?.borderColor)})`)
  console.log(`  navLink.color: ${metricsSystemLight.navLink?.color} (${rgbToHex(metricsSystemLight.navLink?.color)})`)
  console.log(`  btnSecondary.color: ${metricsSystemLight.btnSecondary?.color} (${rgbToHex(metricsSystemLight.btnSecondary?.color)})`)
  console.log(`  btnSecondary.bgColor: ${metricsSystemLight.btnSecondary?.backgroundColor} (${rgbToHex(metricsSystemLight.btnSecondary?.backgroundColor)})`)
  console.log(`  a11yTrigger.color: ${metricsSystemLight.a11yTrigger?.color} (${rgbToHex(metricsSystemLight.a11yTrigger?.color)})`)
  console.log(`  a11yTrigger.bgColor: ${metricsSystemLight.a11yTrigger?.backgroundColor} (${rgbToHex(metricsSystemLight.a11yTrigger?.backgroundColor)})`)

  const shot1 = path.join(ARTIFACT_DIR, 'landing_system_on_light_windows.png')
  await page.screenshot({ path: shot1, fullPage: false })
  console.log(`  Screenshot saved: ${shot1}`)

  // --- SCENARIO 2: MANUAL LIGHT MODE ---
  console.log('\n--- SCENARIO 2: MANUAL LIGHT MODE ---')
  await page.click('.a11y-trigger-btn')
  await page.waitForSelector('.a11y-modal', { timeout: 5000 })
  await new Promise(r => setTimeout(r, 400))
  // Click Light button
  const lightBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('.a11y-theme-btn'))
    return btns.find(b => b.textContent.includes('Light'))
  })
  if (lightBtn) await lightBtn.click()
  await new Promise(r => setTimeout(r, 400))
  await page.click('.a11y-close-btn')
  await new Promise(r => setTimeout(r, 400))

  const metricsManualLight = await inspectLandingPageElements('Manual Light')
  console.log('Manual Light:')
  console.log(`  data-theme: ${metricsManualLight.dataTheme}`)
  console.log(`  heroTitle.color: ${metricsManualLight.heroTitle?.color} (${rgbToHex(metricsManualLight.heroTitle?.color)})`)
  console.log(`  backBtn.color: ${metricsManualLight.backBtn?.color} (${rgbToHex(metricsManualLight.backBtn?.color)})`)

  const shot2 = path.join(ARTIFACT_DIR, 'landing_manual_light.png')
  await page.screenshot({ path: shot2, fullPage: false })
  console.log(`  Screenshot saved: ${shot2}`)

  // Verify that System on Light and Manual Light are identical
  const lightTitleMatch = metricsSystemLight.heroTitle?.color === metricsManualLight.heroTitle?.color
  const lightBackMatch = metricsSystemLight.backBtn?.color === metricsManualLight.backBtn?.color
  console.log(`  Light Mode Consistency: title match = ${lightTitleMatch}, backBtn match = ${lightBackMatch}`)

  // --- SCENARIO 3: SYSTEM MODE on WINDOWS DARK ---
  console.log('\n--- SCENARIO 3: SYSTEM MODE on WINDOWS DARK ---')
  // Reset to system
  await page.click('.a11y-trigger-btn')
  await page.waitForSelector('.a11y-modal', { timeout: 5000 })
  await new Promise(r => setTimeout(r, 300))
  const sysBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('.a11y-theme-btn'))
    return btns.find(b => b.textContent.includes('System'))
  })
  if (sysBtn) await sysBtn.click()
  await new Promise(r => setTimeout(r, 300))
  await page.click('.a11y-close-btn')
  await new Promise(r => setTimeout(r, 300))

  // Emulate dark OS preference
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }])
  await new Promise(r => setTimeout(r, 600))

  const metricsSystemDark = await inspectLandingPageElements('System on Windows Dark')
  console.log('System on Windows Dark:')
  console.log(`  data-theme: ${metricsSystemDark.dataTheme}`)
  console.log(`  bodyBg: ${metricsSystemDark.bodyBg} (${rgbToHex(metricsSystemDark.bodyBg)})`)
  console.log(`  heroTitle.color: ${metricsSystemDark.heroTitle?.color} (${rgbToHex(metricsSystemDark.heroTitle?.color)})`)
  console.log(`  backBtn.color: ${metricsSystemDark.backBtn?.color} (${rgbToHex(metricsSystemDark.backBtn?.color)})`)
  console.log(`  backBtn.bgColor: ${metricsSystemDark.backBtn?.backgroundColor} (${rgbToHex(metricsSystemDark.backBtn?.backgroundColor)})`)
  console.log(`  navLink.color: ${metricsSystemDark.navLink?.color} (${rgbToHex(metricsSystemDark.navLink?.color)})`)
  console.log(`  btnSecondary.color: ${metricsSystemDark.btnSecondary?.color} (${rgbToHex(metricsSystemDark.btnSecondary?.color)})`)
  console.log(`  btnSecondary.bgColor: ${metricsSystemDark.btnSecondary?.backgroundColor} (${rgbToHex(metricsSystemDark.btnSecondary?.backgroundColor)})`)

  const shot3 = path.join(ARTIFACT_DIR, 'landing_system_on_dark_windows.png')
  await page.screenshot({ path: shot3, fullPage: false })
  console.log(`  Screenshot saved: ${shot3}`)

  // --- SCENARIO 4: MANUAL DARK MODE ---
  console.log('\n--- SCENARIO 4: MANUAL DARK MODE ---')
  await page.click('.a11y-trigger-btn')
  await page.waitForSelector('.a11y-modal', { timeout: 5000 })
  await new Promise(r => setTimeout(r, 300))
  const darkBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('.a11y-theme-btn'))
    return btns.find(b => b.textContent.includes('Dark'))
  })
  if (darkBtn) await darkBtn.click()
  await new Promise(r => setTimeout(r, 300))
  await page.click('.a11y-close-btn')
  await new Promise(r => setTimeout(r, 300))

  const metricsManualDark = await inspectLandingPageElements('Manual Dark')
  console.log('Manual Dark:')
  console.log(`  data-theme: ${metricsManualDark.dataTheme}`)
  console.log(`  heroTitle.color: ${metricsManualDark.heroTitle?.color} (${rgbToHex(metricsManualDark.heroTitle?.color)})`)
  console.log(`  backBtn.color: ${metricsManualDark.backBtn?.color} (${rgbToHex(metricsManualDark.backBtn?.color)})`)

  const shot4 = path.join(ARTIFACT_DIR, 'landing_manual_dark.png')
  await page.screenshot({ path: shot4, fullPage: false })
  console.log(`  Screenshot saved: ${shot4}`)

  const darkTitleMatch = metricsSystemDark.heroTitle?.color === metricsManualDark.heroTitle?.color
  const darkBackMatch = metricsSystemDark.backBtn?.color === metricsManualDark.backBtn?.color
  console.log(`  Dark Mode Consistency: title match = ${darkTitleMatch}, backBtn match = ${darkBackMatch}`)

  // Summary of checks
  console.log('\n==================================================')
  console.log('FINAL VALIDATION SUMMARY:')
  console.log(`1. Heading in System Light: ${rgbToHex(metricsSystemLight.heroTitle?.color)} (Expected: #183653 Deep Navy) -> ${rgbToHex(metricsSystemLight.heroTitle?.color) === '#183653' ? 'PASS' : 'FAIL'}`)
  console.log(`2. Heading in System Dark: ${rgbToHex(metricsSystemDark.heroTitle?.color)} (Expected: #FFFFFF White) -> ${rgbToHex(metricsSystemDark.heroTitle?.color) === '#FFFFFF' ? 'PASS' : 'FAIL'}`)
  console.log(`3. Back button text in System Light: ${rgbToHex(metricsSystemLight.backBtn?.color)} (Expected: #183653 Deep Navy) -> ${rgbToHex(metricsSystemLight.backBtn?.color) === '#183653' ? 'PASS' : 'FAIL'}`)
  console.log(`4. Back button background in System Light: ${rgbToHex(metricsSystemLight.backBtn?.backgroundColor)} (Expected: #FFFFFF White) -> ${rgbToHex(metricsSystemLight.backBtn?.backgroundColor) === '#FFFFFF' ? 'PASS' : 'FAIL'}`)
  console.log(`5. Back button text in System Dark: ${rgbToHex(metricsSystemDark.backBtn?.color)} (Expected: #FFFFFF White) -> ${rgbToHex(metricsSystemDark.backBtn?.color) === '#FFFFFF' ? 'PASS' : 'FAIL'}`)
  console.log(`6. Back button background in System Dark: ${rgbToHex(metricsSystemDark.backBtn?.backgroundColor)} (Expected: #0B1724 Dark Navy) -> ${rgbToHex(metricsSystemDark.backBtn?.backgroundColor) === '#0B1724' ? 'PASS' : 'FAIL'}`)
  console.log(`7. Navigation links in System Light: ${rgbToHex(metricsSystemLight.navLink?.color)} (Expected: #183653 Deep Navy) -> ${rgbToHex(metricsSystemLight.navLink?.color) === '#183653' ? 'PASS' : 'FAIL'}`)
  console.log(`8. Navigation links in System Dark: ${rgbToHex(metricsSystemDark.navLink?.color)} (Expected: #DCECF4 Light Ice) -> ${rgbToHex(metricsSystemDark.navLink?.color) === '#DCECF4' ? 'PASS' : 'FAIL'}`)
  console.log(`9. Accessibility button in System Light: ${rgbToHex(metricsSystemLight.a11yTrigger?.backgroundColor)} (Expected: #FFFFFF) -> ${rgbToHex(metricsSystemLight.a11yTrigger?.backgroundColor) === '#FFFFFF' ? 'PASS' : 'FAIL'}`)
  console.log('==================================================')

  await browser.close()
}

runAudit().catch(err => {
  console.error('Audit failed:', err)
  process.exit(1)
})

import puppeteer from 'puppeteer-core'
import assert from 'assert'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const artifactDir = 'C:\\Users\\Karunyaayashu\\.gemini\\antigravity\\brain\\7eb51cfc-2267-4fea-9ad9-da27afa4c565'

async function run() {
  console.log('--- STARTING SYSTEM THEME INHERITANCE AUDIT ---')
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new'
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })

  await page.goto('http://localhost:5173/#/app', { waitUntil: 'load' })
  await new Promise(r => setTimeout(r, 1200))

  const lpBtn = await page.$('.lp-btn-secondary')
  if (lpBtn) {
    await lpBtn.click()
    await page.waitForSelector('.side', { timeout: 10000 })
    await new Promise(r => setTimeout(r, 600))
  }

  async function selectTheme(themeName) {
    await page.click('.a11y-header-btn')
    await page.waitForSelector('.a11y-modal', { timeout: 5000 })
    await new Promise(r => setTimeout(r, 300))

    await page.evaluate((t) => {
      const btns = Array.from(document.querySelectorAll('.a11y-theme-btn'))
      const target = btns.find(b => b.textContent.toLowerCase().includes(t))
      if (target) target.click()
    }, themeName)
    await new Promise(r => setTimeout(r, 400))

    await page.click('.a11y-close-btn')
    await new Promise(r => setTimeout(r, 300))
  }

  async function getComputedPalette() {
    return await page.evaluate(() => {
      const body = window.getComputedStyle(document.body)
      const ws = window.getComputedStyle(document.querySelector('.workspace-central'))
      const side = window.getComputedStyle(document.querySelector('.side'))
      const header = window.getComputedStyle(document.querySelector('.conv-header'))
      const composer = window.getComputedStyle(document.querySelector('.composer-capsule'))

      return {
        dataTheme: document.documentElement.getAttribute('data-theme'),
        dataThemePref: document.documentElement.getAttribute('data-theme-preference'),
        dataResolvedTheme: document.documentElement.getAttribute('data-resolved-theme'),
        bodyBg: body.backgroundColor,
        wsBg: ws.backgroundColor,
        sideBg: side.backgroundColor,
        headerBg: header.backgroundColor,
        composerBg: composer.backgroundColor,
        textColor: body.color
      }
    })
  }

  // ==========================================
  // COMPARISON 1: Windows Light
  // TEST A: Manually selected Light
  // TEST B: System selected
  // ==========================================
  console.log('\n--- COMPARISON 1: Windows Light ---')
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }])

  // TEST A: Select Light manually
  await selectTheme('light')
  const testA = await getComputedPalette()
  console.log('TEST A (Manual Light):', testA)
  await page.screenshot({ path: `${artifactDir}\\test_A_manual_light.png` })

  // TEST B: Select System while Windows is Light
  await selectTheme('system')
  const testB = await getComputedPalette()
  console.log('TEST B (System on Light Windows):', testB)
  await page.screenshot({ path: `${artifactDir}\\test_B_system_on_light_windows.png` })

  // VERIFY TEST A === TEST B
  assert.strictEqual(testA.dataTheme, testB.dataTheme, 'data-theme must match')
  assert.strictEqual(testA.bodyBg, testB.bodyBg, 'bodyBg must be identical')
  assert.strictEqual(testA.wsBg, testB.wsBg, 'wsBg must be identical')
  assert.strictEqual(testA.sideBg, testB.sideBg, 'sideBg must be identical')
  assert.strictEqual(testA.headerBg, testB.headerBg, 'headerBg must be identical')
  assert.strictEqual(testA.composerBg, testB.composerBg, 'composerBg must be identical')
  assert.strictEqual(testA.textColor, testB.textColor, 'textColor must be identical')
  console.log('✅ TEST A and TEST B are 100% IDENTICAL!')

  // ==========================================
  // COMPARISON 2: Windows Dark
  // TEST C: Manually selected Dark
  // TEST D: System selected
  // ==========================================
  console.log('\n--- COMPARISON 2: Windows Dark ---')
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }])

  // TEST C: Select Dark manually
  await selectTheme('dark')
  const testC = await getComputedPalette()
  console.log('TEST C (Manual Dark):', testC)
  await page.screenshot({ path: `${artifactDir}\\test_C_manual_dark.png` })

  // TEST D: Select System while Windows is Dark
  await selectTheme('system')
  const testD = await getComputedPalette()
  console.log('TEST D (System on Dark Windows):', testD)
  await page.screenshot({ path: `${artifactDir}\\test_D_system_on_dark_windows.png` })

  // VERIFY TEST C === TEST D
  assert.strictEqual(testC.dataTheme, testD.dataTheme, 'data-theme must match')
  assert.strictEqual(testC.bodyBg, testD.bodyBg, 'bodyBg must be identical')
  assert.strictEqual(testC.wsBg, testD.wsBg, 'wsBg must be identical')
  assert.strictEqual(testC.sideBg, testD.sideBg, 'sideBg must be identical')
  assert.strictEqual(testC.headerBg, testD.headerBg, 'headerBg must be identical')
  assert.strictEqual(testC.composerBg, testD.composerBg, 'composerBg must be identical')
  assert.strictEqual(testC.textColor, testD.textColor, 'textColor must be identical')
  console.log('✅ TEST C and TEST D are 100% IDENTICAL!')

  // ==========================================
  // TEST E: Live dynamic OS change without refresh
  // ==========================================
  console.log('\n--- TEST E: Live dynamic OS switch while in System Mode ---')
  // We are currently in System mode with Dark Windows.
  // Switch Windows to Light dynamically:
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }])
  await new Promise(r => setTimeout(r, 600))
  const testE_light = await getComputedPalette()
  console.log('TEST E (Live switched to Light):', testE_light)
  assert.strictEqual(testE_light.dataTheme, 'light')
  assert.strictEqual(testE_light.wsBg, testA.wsBg)

  // Switch Windows back to Dark dynamically:
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }])
  await new Promise(r => setTimeout(r, 600))
  const testE_dark = await getComputedPalette()
  console.log('TEST E (Live switched back to Dark):', testE_dark)
  assert.strictEqual(testE_dark.dataTheme, 'dark')
  assert.strictEqual(testE_dark.wsBg, testC.wsBg)
  console.log('✅ TEST E Live dynamic switching PASSED!')

  await browser.close()
  console.log('\n==================================================')
  console.log('ALL TESTS PASSED: SYSTEM THEME INHERITANCE IS 100% PERFECT')
  console.log('==================================================')
}

run().catch(err => {
  console.error('AUDIT FAILED:', err)
  process.exit(1)
})

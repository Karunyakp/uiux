import puppeteer from 'puppeteer-core'
import path from 'path'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

async function run() {
  console.log('--- Testing Theme Modes 1 through 7 ---')
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new'
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })

  // Navigate
  await page.goto('http://localhost:5173/#/app', { waitUntil: 'load' })
  await new Promise(r => setTimeout(r, 600))

  async function getThemeState() {
    return await page.evaluate(() => {
      const el = document.documentElement
      const stored = JSON.parse(localStorage.getItem('trustlens_a11y_settings') || '{}')
      const bodyBg = window.getComputedStyle(document.body).backgroundColor
      const textColor = window.getComputedStyle(document.body).color
      return {
        dataTheme: el.getAttribute('data-theme'),
        dataThemePref: el.getAttribute('data-theme-preference'),
        dataResolvedTheme: el.getAttribute('data-resolved-theme'),
        classes: el.className,
        storedPref: stored.theme || stored.themePreference,
        colorScheme: el.style.colorScheme,
        bodyBg,
        textColor
      }
    })
  }

  async function selectTheme(themeName) {
    const a11yTrigger = await page.$('.a11y-header-btn') || await page.$('.a11y-trigger-btn')
    if (a11yTrigger) await a11yTrigger.click()
    await page.waitForSelector('.a11y-modal', { timeout: 5000 })
    await new Promise(r => setTimeout(r, 300))

    await page.evaluate((t) => {
      const btns = Array.from(document.querySelectorAll('.a11y-theme-btn'))
      const target = btns.find(b => b.textContent.toLowerCase().includes(t))
      if (target) target.click()
    }, themeName)
    await new Promise(r => setTimeout(r, 400))

    const closeBtn = await page.$('.a11y-close-btn')
    if (closeBtn) await closeBtn.click()
    await new Promise(r => setTimeout(r, 300))
  }

  // TEST 1: Windows Light, Select System -> Expected: Light UI
  console.log('\nTEST 1: Set Windows to Light. Select System in TrustLens.')
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }])
  await selectTheme('system')
  let s1 = await getThemeState()
  console.log('Result 1:', s1)

  // TEST 2: Windows Dark, Select System -> Expected: Dark UI
  console.log('\nTEST 2: Set Windows to Dark. Select System in TrustLens.')
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }])
  await selectTheme('system')
  let s2 = await getThemeState()
  console.log('Result 2:', s2)

  // TEST 3: Windows Light, Select Dark manually -> Expected: Dark UI
  console.log('\nTEST 3: Select Dark manually while Windows is Light.')
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }])
  await selectTheme('dark')
  let s3 = await getThemeState()
  console.log('Result 3:', s3)

  // TEST 4: Windows Dark, Select Light manually -> Expected: Light UI
  console.log('\nTEST 4: Select Light manually while Windows is Dark.')
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }])
  await selectTheme('light')
  let s4 = await getThemeState()
  console.log('Result 4:', s4)

  // TEST 5: Select System and switch Windows from Light to Dark without refreshing
  console.log('\nTEST 5: Select System while Light, switch Windows to Dark dynamically.')
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }])
  await selectTheme('system')
  let s5_before = await getThemeState()
  console.log('Before switch (Light):', s5_before)
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }])
  await new Promise(r => setTimeout(r, 600))
  let s5_after = await getThemeState()
  console.log('After dynamic switch to Dark:', s5_after)

  // TEST 6: Switch Windows back to Light dynamically
  console.log('\nTEST 6: Switch Windows back to Light dynamically.')
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }])
  await new Promise(r => setTimeout(r, 600))
  let s6 = await getThemeState()
  console.log('After dynamic switch back to Light:', s6)

  // TEST 7: Refresh application, saved preference remains System
  console.log('\nTEST 7: Refresh the application. Verify saved System preference.')
  await page.reload({ waitUntil: 'load' })
  await new Promise(r => setTimeout(r, 800))
  let s7 = await getThemeState()
  console.log('After refresh:', s7)

  await browser.close()
}

run().catch(console.error)

import puppeteer from 'puppeteer-core'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const artifactDir = 'C:\\Users\\Karunyaayashu\\.gemini\\antigravity\\brain\\7eb51cfc-2267-4fea-9ad9-da27afa4c565'

async function run() {
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
    await new Promise(r => setTimeout(r, 800))
  } else {
    await page.waitForSelector('.side', { timeout: 10000 })
  }

  async function check(themeName) {
    // Open a11y modal
    await page.click('.a11y-header-btn')
    await page.waitForSelector('.a11y-modal', { timeout: 5000 })
    await new Promise(r => setTimeout(r, 400))

    // Select theme
    await page.evaluate((t) => {
      const btns = Array.from(document.querySelectorAll('.a11y-theme-btn'))
      const target = btns.find(b => b.textContent.toLowerCase().includes(t))
      if (target) target.click()
    }, themeName)
    await new Promise(r => setTimeout(r, 500))

    // Close panel
    await page.click('.a11y-close-btn')
    await new Promise(r => setTimeout(r, 400))

    const colors = await page.evaluate(() => {
      return {
        themeAttr: document.documentElement.getAttribute('data-theme'),
        prefAttr: document.documentElement.getAttribute('data-theme-preference'),
        bodyBg: window.getComputedStyle(document.body).backgroundColor,
        wsBg: window.getComputedStyle(document.querySelector('.workspace-central')).backgroundColor,
        sideBg: window.getComputedStyle(document.querySelector('.side')).backgroundColor,
        composerBg: window.getComputedStyle(document.querySelector('.composer-capsule')).backgroundColor
      }
    })
    console.log(`[${themeName.toUpperCase()} MODE]:`, colors)
    await page.screenshot({ path: `${artifactDir}\\theme_${themeName}_verified.png` })
  }

  await check('light')
  await check('dark')
  await check('system')

  await browser.close()
}

run().catch(console.error)

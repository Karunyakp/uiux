import puppeteer from 'puppeteer-core'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

async function check() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new'
  })
  const page = await browser.newPage()

  for (const vp of [{ width: 1366, height: 768, name: 'desktop' }, { width: 390, height: 844, name: 'mobile' }]) {
    await page.setViewport(vp)
    await page.goto('http://localhost:5173/#/signin', { waitUntil: 'load' })
    const data = await page.evaluate(() => {
      const nav = document.querySelector('.auth-top-nav-bar')
      const title = document.querySelector('.auth-title')
      const card = document.querySelector('.auth-card')
      const container = document.querySelector('.auth-container')
      const scrollWidth = document.documentElement.scrollWidth
      const clientWidth = document.documentElement.clientWidth
      return {
        hasHorizontalScroll: scrollWidth > clientWidth,
        navBottom: nav ? nav.getBoundingClientRect().bottom : null,
        titleTop: title ? title.getBoundingClientRect().top : null,
        cardTop: card ? card.getBoundingClientRect().top : null,
        cardBottom: card ? card.getBoundingClientRect().bottom : null,
        containerHeight: container ? container.getBoundingClientRect().height : null
      }
    })
    console.log(`[${vp.name}]`, JSON.stringify(data, null, 2))
  }
  await browser.close()
}

check().catch(console.error)

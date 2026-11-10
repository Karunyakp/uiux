import puppeteer from 'puppeteer-core';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'load', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1000));

  // If on landing page, click to open dashboard
  const secondaryBtn = await page.$('.lp-btn-secondary');
  if (secondaryBtn) {
    console.log('Clicking to enter dashboard from landing page...');
    await secondaryBtn.click();
    await page.waitForSelector('.side', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1000));
  }

  // Ensure system theme is applied
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'system');
    const a11y = JSON.parse(localStorage.getItem('trustlens_a11y') || '{}');
    a11y.theme = 'system';
    localStorage.setItem('trustlens_a11y', JSON.stringify(a11y));
  });
  await new Promise(r => setTimeout(r, 600));

  const artifactDir = 'C:\\Users\\Karunyaayashu\\.gemini\\antigravity\\brain\\7eb51cfc-2267-4fea-9ad9-da27afa4c565';

  // 1. Capture Dashboard in System Mode (White & Blue Combo)
  const dashPath = path.join(artifactDir, 'system_mode_white_blue_dashboard.png');
  await page.screenshot({ path: dashPath });
  console.log('Captured Dashboard System Mode:', dashPath);

  // 2. Open Accessibility Modal and capture it
  const a11yBtn = await page.$('.a11y-pill-btn') || await page.$('.a11y-trigger-btn');
  if (a11yBtn) {
    await a11yBtn.click();
    await page.waitForSelector('.a11y-modal', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 500));
    const a11yPath = path.join(artifactDir, 'system_mode_white_blue_a11y.png');
    await page.screenshot({ path: a11yPath });
    console.log('Captured Accessibility Modal System Mode:', a11yPath);
  }

  // 3. Inspect computed colors to verify White and Blue Combo
  const colorReport = await page.evaluate(() => {
    const body = document.body;
    const side = document.querySelector('.side');
    const header = document.querySelector('.conv-header');
    const assistantCard = document.querySelector('.assistant-card');
    const userMsg = document.querySelector('.user-msg-bubble');
    const composer = document.querySelector('.composer-capsule');
    const ev = document.querySelector('.ev');

    const getColors = (el) => {
      if (!el) return null;
      const s = window.getComputedStyle(el);
      return {
        bg: s.backgroundColor,
        color: s.color,
        border: s.borderColor
      };
    };

    return {
      body: getColors(body),
      side: getColors(side),
      header: getColors(header),
      assistantCard: getColors(assistantCard),
      userMsg: getColors(userMsg),
      composer: getColors(composer),
      ev: getColors(ev)
    };
  });

  console.log('Computed Colors in System Mode:');
  console.log(JSON.stringify(colorReport, null, 2));

  await browser.close();
})();

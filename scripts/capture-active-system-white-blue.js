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

  await page.goto('http://localhost:5173', { waitUntil: 'load', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1000));

  const secondaryBtn = await page.$('.lp-btn-secondary');
  if (secondaryBtn) {
    await secondaryBtn.click();
    await page.waitForSelector('.side', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1000));
  }

  // Ensure system theme
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'system');
    const a11y = JSON.parse(localStorage.getItem('trustlens_a11y') || '{}');
    a11y.theme = 'system';
    localStorage.setItem('trustlens_a11y', JSON.stringify(a11y));
  });
  await new Promise(r => setTimeout(r, 500));

  // Click the first starter card if available to see active chat
  const starter = await page.$('.starter-card-item');
  if (starter) {
    console.log('Clicking starter prompt...');
    await starter.click();
    await new Promise(r => setTimeout(r, 3500)); // wait for response
  }

  const artifactDir = 'C:\\Users\\Karunyaayashu\\.gemini\\antigravity\\brain\\7eb51cfc-2267-4fea-9ad9-da27afa4c565';
  const chatPath = path.join(artifactDir, 'system_mode_white_blue_active_chat.png');
  await page.screenshot({ path: chatPath });
  console.log('Captured Active Chat System Mode (White & Blue):', chatPath);

  // Also capture Accessibility Modal open over active chat
  const a11yBtn = await page.$('.a11y-pill-btn') || await page.$('.a11y-trigger-btn');
  if (a11yBtn) {
    await a11yBtn.click();
    await page.waitForSelector('.a11y-modal', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 500));
    const a11yPath = path.join(artifactDir, 'system_mode_white_blue_a11y_modal.png');
    await page.screenshot({ path: a11yPath });
    console.log('Captured A11y Modal (White & Blue):', a11yPath);
  }

  await browser.close();
})();

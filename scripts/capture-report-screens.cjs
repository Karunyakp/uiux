const puppeteer = require('puppeteer-core');
const path = require('path');
const os = require('os');
const fs = require('fs');

(async () => {
  console.log('--- Launching Browser for Report Screen Captures ---');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    defaultViewport: { width: 1440, height: 960 },
    userDataDir: path.join(os.tmpdir(), 'puppeteer_edge_screens_' + Date.now()),
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // If on landing page, click guest button
  const guestBtn = await page.$('.btn-guest');
  if (guestBtn) {
    console.log('Clicking guest button...');
    await guestBtn.click();
    await new Promise(r => setTimeout(r, 2500));
  }

  // Check if we need to send a message
  let assistantMsg = await page.$('.assistant-msg-card');
  if (!assistantMsg) {
    console.log('Typing query into composer...');
    await page.waitForSelector('.chat-input-textarea', { timeout: 10000 });
    await page.type('.chat-input-textarea', 'What are the eligibility criteria and key deadlines for the GATE 2026 examination?');
    const sendBtn = await page.$('.chat-submit-btn');
    await sendBtn.click();
    console.log('Waiting for assistant message...');
    await page.waitForSelector('.assistant-msg-card', { timeout: 45000 });
    await new Promise(r => setTimeout(r, 3000));
  }

  const brainDir = 'C:/Users/Karunyaayashu/.gemini/antigravity/brain/7eb51cfc-2267-4fea-9ad9-da27afa4c565';

  // 1. Overview / Answer + Cited Sources shelf
  console.log('Capturing screen 1: Answer + Sources shelf');
  await page.screenshot({ path: path.join(brainDir, 'report_fig1_workspace.png') });

  // 2. Claim Intelligence Tab
  console.log('Capturing screen 2: Claim Intelligence Tab');
  const tabs = await page.$$('.section-tab-pill');
  if (tabs.length >= 6) {
    await tabs[0].click(); // Claim Intelligence
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(brainDir, 'report_fig2_claim_intelligence.png') });

    // 3. Trust Reasoning Rubric Tab
    console.log('Capturing screen 3: Trust Reasoning Rubric Tab');
    await tabs[1].click(); // Trust Reasoning
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(brainDir, 'report_fig3_trust_reasoning.png') });

    // 4. Human Verification Mode Tab
    console.log('Capturing screen 4: Human Verification Mode Tab');
    await tabs[5].click(); // Human Verification
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(brainDir, 'report_fig4_human_verification.png') });
  }

  // 5. Open Trust Receipt Modal
  console.log('Capturing screen 5: Trust Receipt Modal');
  const receiptBtn = await page.$('.act-btn.is-receipt');
  if (receiptBtn) {
    await receiptBtn.click();
    await page.waitForSelector('.receipt-modal-backdrop', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(brainDir, 'report_fig5_trust_receipt.png') });

    // Close modal
    const closeBtn = await page.$('.receipt-close-btn');
    if (closeBtn) await closeBtn.click();
    await new Promise(r => setTimeout(r, 600));
  }

  // 6. Switch to Pure Dark Mode
  console.log('Capturing screen 6: Pure Dark Mode');
  // Click theme selector or set localStorage
  await page.evaluate(() => {
    localStorage.setItem('trustlens_theme_preference', 'dark');
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    window.dispatchEvent(new Event('storage'));
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(brainDir, 'report_fig6_pure_dark_mode.png') });

  console.log('--- ALL REPORT SCREENS CAPTURED SUCCESSFULLY ---');
  await browser.close();
})();

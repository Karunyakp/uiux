import puppeteer from 'puppeteer-core';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new'
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('--- TEST 1: System Mode with OS prefers-color-scheme: light ---');
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('trustlens_a11y_settings', JSON.stringify({ theme: 'system', themePreference: 'system' }));
  });
  await page.goto('http://localhost:5173/#/landing', { waitUntil: 'networkidle0' });

  const inspectLight = await page.evaluate(() => {
    const rootTheme = document.documentElement.getAttribute('data-theme');
    const heroTitle = document.querySelector('.lp-hero-title');
    const backBtn = document.querySelector('.lp-back-btn');
    const navLink = document.querySelector('.lp-nav-link');
    const secTitle = document.querySelector('.lp-section-title');
    const heroSub = document.querySelector('.lp-hero-sub');
    const btnSecondary = document.querySelector('.lp-btn-secondary');

    const getColors = el => {
      if (!el) return null;
      const s = window.getComputedStyle(el);
      return {
        color: s.color,
        backgroundColor: s.backgroundColor,
        borderColor: s.borderColor
      };
    };

    return {
      rootTheme,
      heroTitle: getColors(heroTitle),
      backBtn: getColors(backBtn),
      navLink: getColors(navLink),
      secTitle: getColors(secTitle),
      heroSub: getColors(heroSub),
      btnSecondary: getColors(btnSecondary)
    };
  });

  console.log('Computed styles in System (Light OS):', JSON.stringify(inspectLight, null, 2));

  await page.screenshot({ path: 'test_landing_system_light.png' });

  console.log('\n--- TEST 2: System Mode with OS prefers-color-scheme: dark ---');
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
  await page.goto('http://localhost:5173/#/landing', { waitUntil: 'networkidle0' });

  const inspectDark = await page.evaluate(() => {
    const rootTheme = document.documentElement.getAttribute('data-theme');
    const heroTitle = document.querySelector('.lp-hero-title');
    const backBtn = document.querySelector('.lp-back-btn');
    const navLink = document.querySelector('.lp-nav-link');
    const secTitle = document.querySelector('.lp-section-title');
    const heroSub = document.querySelector('.lp-hero-sub');
    const btnSecondary = document.querySelector('.lp-btn-secondary');

    const getColors = el => {
      if (!el) return null;
      const s = window.getComputedStyle(el);
      return {
        color: s.color,
        backgroundColor: s.backgroundColor,
        borderColor: s.borderColor
      };
    };

    return {
      rootTheme,
      heroTitle: getColors(heroTitle),
      backBtn: getColors(backBtn),
      navLink: getColors(navLink),
      secTitle: getColors(secTitle),
      heroSub: getColors(heroSub),
      btnSecondary: getColors(btnSecondary)
    };
  });

  console.log('Computed styles in System (Dark OS):', JSON.stringify(inspectDark, null, 2));
  await page.screenshot({ path: 'test_landing_system_dark.png' });

  await browser.close();
})();

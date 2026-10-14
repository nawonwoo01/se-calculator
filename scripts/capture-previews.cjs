const { chromium } = require('@playwright/test');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
(async () => {
  const root = path.resolve(__dirname, '..');
  const out = path.join(root, 'docs/release/previews'); await fs.mkdir(out, { recursive: true });
  const server = spawn('python', ['-m', 'http.server', '8788', '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  let browser;
  try {
    for (let i = 0; i < 40; i++) {
      try { if ((await fetch('http://127.0.0.1:8788')).ok) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    await page.goto('http://127.0.0.1:8788/www/index.html');
    await page.locator('#wt').fill('60'); await page.locator('#ht').fill('170');
    await page.locator('[data-tab="asm"]').click();
    await page.screenshot({ path: path.join(out, 'phone-asm-browser-preview.png'), fullPage: true });
    await page.locator('[data-tab="scores"]').click();
    await page.screenshot({ path: path.join(out, 'phone-scores-browser-preview.png'), fullPage: true });
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.locator('[data-tab="sedation"]').click();
    const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (overflows) throw new Error('Tablet layout overflows viewport');
    await page.screenshot({ path: path.join(out, 'tablet-sedation-browser-preview.png'), fullPage: true });
    console.log('Browser previews saved; these are not native store screenshots.');
  } finally { if (browser) await browser.close(); server.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

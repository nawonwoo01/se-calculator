const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests/production', workers: 1,
  use: {
    baseURL: 'https://nawonwoo01.github.io/se-calculator/', viewport: { width: 390, height: 844 },
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] },
    trace: 'retain-on-failure'
  },
  reporter: 'list'
});

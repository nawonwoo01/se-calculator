const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests/ui', fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:8787', viewport: { width: 390, height: 844 },
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] }
  },
  webServer: { command: 'python3 -m http.server 8787 --bind 127.0.0.1', url: 'http://127.0.0.1:8787', reuseExistingServer: false },
  reporter: 'list'
});

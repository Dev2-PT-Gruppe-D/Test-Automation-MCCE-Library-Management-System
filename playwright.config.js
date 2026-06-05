const { defineConfig } = require('@playwright/test');

const BASE_URL = process.env.SUT_BASE_URL || 'http://localhost:3000';

module.exports = defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.e2e.test.js',
  outputDir: 'playwright-output',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/playwright-junit.xml' }]
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'npm run seed && npm start',
    url: 'http://localhost:3000/api-docs.json',
    reuseExistingServer: !process.env.CI,
    timeout: 60000
  }
});

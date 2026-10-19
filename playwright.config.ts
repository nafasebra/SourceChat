import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
    channel: process.env.PLAYWRIGHT_CHANNEL,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' },
    },
  ],
  webServer: {
    command: `node node_modules/next/dist/bin/next ${process.env.PLAYWRIGHT_PRODUCTION ? 'start' : 'dev'} --hostname 127.0.0.1 --port 3100`,
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    env: { MOCK_AI: 'true', NEXT_TELEMETRY_DISABLED: '1' },
    timeout: 120000,
  },
});

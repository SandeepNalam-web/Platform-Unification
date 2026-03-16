// playwright.config.js
import { defineConfig, devices } from '@playwright/test';
import fs from 'fs';

const storageStatePath = './auth/storageState.json';

export default defineConfig({
  use: {
  storageState: fs.existsSync(storageStatePath) ? storageStatePath : undefined,
  baseURL: 'https://platform.interface.ai',
    screenshot: 'on',       // always save screenshot after each test
    trace: 'retain-on-failure',
    video: 'retain-on-failure'
},
  testDir: './tests',
  timeout: 60000,
  expect: {
    timeout: 20000
  },
  
  fullyParallel: false,
  retries: 0,
  reporter : [['html'], ['./reporters/extent-reporter.js']],


  workers : 1,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    { name: '00-Login', testMatch: /00-Pre\.spec\.js/,},

    // Your other specs depend on Login
    { name: '01-Chat', testMatch: /01-admin-console\.spec\.js/, dependencies: ['00-Login'] },
  ],

});

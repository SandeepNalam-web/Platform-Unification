import { test as base, chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const userDataDir = path.resolve(__dirname, '../../auth/sso-session');

const isCI = !!process.env.CI;

export const test = base.extend({
  pContext: [async ({}, use) => {
    const context = await chromium.launchPersistentContext(userDataDir, { headless: isCI });
    await use(context);
    await context.close();
  }, { scope: 'worker' }],

  sharedPage: [async ({ pContext }, use) => {
    const page = pContext.pages()[0] ?? await pContext.newPage();
    await use(page); // don't close; context closes at worker teardown
  }, { scope: 'worker' }],

  freshPage: [async ({}, use) => {
    const browser = await chromium.launch({ headless: isCI });
    const context = await browser.newContext();
    const page = await context.newPage();
    await use(page);
    await context.close();
    await browser.close();
  }, { scope: 'test' }],
});

//re-export expect so specs can `import { test, expect }
export { expect } from '@playwright/test';

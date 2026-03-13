/**
 * Test: Navigate between dashboards and check if iframe changes.
 * Run from FLA: node scripts/advisory-nav-test.mjs
 */
import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const userDataDir = path.resolve(__dirname, '../auth/sso-session');

async function main() {
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1920, height: 1080 },
  });
  const page = context.pages()[0] ?? await context.newPage();

  await page.goto('https://platform.interface.ai/app-platformv5-aacu-chat-dev/advisory/SmartConversion/Overview',
    { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  // Check initial iframe
  let iframe = page.locator('iframe').first();
  let src1 = await iframe.getAttribute('src').catch(() => 'none');
  console.log('=== Smart Conversion ===');
  console.log('Page URL:', page.url());
  console.log('iframe src:', src1?.substring(0, 120));

  // Navigate to Smart Discovery Advisory
  const sdaLink = page.getByRole('link', { name: 'Smart Discovery Advisory', exact: true });
  await sdaLink.waitFor({ state: 'visible', timeout: 15000 });
  console.log('\nClicking Smart Discovery Advisory...');
  await sdaLink.click();
  await page.waitForTimeout(3000);

  // Wait for loading to finish
  await page.waitForFunction(
    () => document.querySelectorAll('.ant-spin-spinning').length === 0,
    null, { timeout: 15000 }
  ).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(5000);

  // Check iframe after navigation
  iframe = page.locator('iframe').first();
  let src2 = await iframe.getAttribute('src').catch(() => 'none');
  console.log('\n=== Smart Discovery Advisory ===');
  console.log('Page URL:', page.url());
  console.log('iframe src:', src2?.substring(0, 120));
  console.log('iframe src changed:', src1 !== src2);

  // Check the first zone aria-label
  const handle = await iframe.elementHandle();
  const frame = handle ? await handle.contentFrame() : null;
  if (frame) {
    const firstZone = await frame.evaluate(() => {
      const zones = [...document.querySelectorAll('[aria-label]')]
        .filter(el => /data visualization/i.test(el.getAttribute('aria-label') || ''))
        .filter(el => { const r = el.getBoundingClientRect(); return r.width > 30 && r.height > 30; });
      return zones.length > 0 ? zones[0].getAttribute('aria-label')?.split('.')[0] : '(none)';
    });
    console.log('First Data Visualization zone:', firstZone);
  }

  await context.close();
}

main().catch(e => { console.error(e); process.exit(1); });

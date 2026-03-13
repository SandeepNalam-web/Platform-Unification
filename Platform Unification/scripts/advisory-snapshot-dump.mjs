/**
 * Dump the FULL ariaSnapshot of the Tableau iframe to see exactly what data
 * is accessible. Run from FLA: node scripts/advisory-snapshot-dump.mjs
 */
import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const userDataDir = path.resolve(__dirname, '../auth/sso-session');
const outFile = path.resolve(__dirname, '../advisory-snapshot-dump.json');

async function main() {
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1920, height: 1080 },
  });
  const page = context.pages()[0] ?? await context.newPage();

  const targetUrl = 'https://platform.interface.ai/app-platformv5-aacu-chat-dev/advisory/SmartConversion/Overview';
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  // Apply Last 30 Days
  try {
    const picker = page.locator('.ant-picker.ant-picker-range');
    await picker.click({ timeout: 10000 });
    await page.waitForTimeout(1000);
    const preset = page.getByText('Last 30 days', { exact: true });
    await preset.click();
    await page.waitForTimeout(500);
    const applyBtn = page.locator('button').filter({ hasText: 'Apply' });
    await applyBtn.click();
    await page.waitForTimeout(3000);
  } catch (e) { console.log('Date range skip:', e.message); }

  // Wait for iframe to load
  const reloadBtn = page.getByRole('button', { name: 'reload' });
  try {
    await reloadBtn.waitFor({ state: 'visible', timeout: 15000 });
    const maxWait = Date.now() + 60000;
    while ((await reloadBtn.isDisabled()) && Date.now() < maxWait) await page.waitForTimeout(500);
  } catch {}
  await page.waitForTimeout(5000);

  // Scroll iframe
  const iframe = page.locator('iframe').first();
  await iframe.waitFor({ state: 'attached', timeout: 30000 });
  const handle = await iframe.elementHandle();
  const frame = handle ? await handle.contentFrame() : null;
  if (!frame) { console.log('No iframe'); await context.close(); return; }

  await frame.evaluate(() => {
    const el = document.scrollingElement || document.body;
    el.scrollTop = el.scrollHeight;
  });
  await page.waitForTimeout(2000);
  await frame.evaluate(() => {
    const el = document.scrollingElement || document.body;
    el.scrollTop = 0;
  });
  await page.waitForTimeout(2000);

  // Take FULL ariaSnapshot of the body
  const bodyLocator = page.frameLocator('iframe').first().locator('body');
  let fullBodySnap = '';
  try {
    fullBodySnap = await bodyLocator.ariaSnapshot({ timeout: 30000 });
  } catch (e) { fullBodySnap = `Error: ${e.message}`; }

  // Per-section ariaSnapshot for first 3 KPI zones
  const sectionSnaps = {};
  const labels = [
    'Total Number of Forms Initiated',
    'Number of Forms Completed',
    'Average Form Completion Time',
  ];
  for (const name of labels) {
    try {
      const loc = frame.locator(`[aria-label*="${name}"][aria-label*="Data Visualization"]`).first();
      await loc.waitFor({ state: 'attached', timeout: 5000 });

      // Zone itself
      let zoneSnap = '';
      try { zoneSnap = await loc.ariaSnapshot({ timeout: 5000 }); } catch {}

      // Parent (one level up)
      let parentSnap = '';
      try { parentSnap = await loc.locator('..').ariaSnapshot({ timeout: 5000 }); } catch {}

      // Grandparent (two levels up)
      let grandparentSnap = '';
      try { grandparentSnap = await loc.locator('..').locator('..').ariaSnapshot({ timeout: 5000 }); } catch {}

      sectionSnaps[name] = {
        zoneSnap: zoneSnap.substring(0, 500),
        parentSnap: parentSnap.substring(0, 500),
        grandparentSnap: grandparentSnap.substring(0, 500),
      };
    } catch (e) {
      sectionSnaps[name] = { error: e.message };
    }
  }

  const result = {
    fullBodySnapLength: fullBodySnap.length,
    fullBodySnap,
    sectionSnaps,
  };
  fs.writeFileSync(outFile, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`Wrote ${outFile} (${fullBodySnap.length} chars body snap)`);
  console.log('Section snapshots:', Object.keys(sectionSnaps));
  await context.close();
}

main().catch(e => { console.error(e); process.exit(1); });

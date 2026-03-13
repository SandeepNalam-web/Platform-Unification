/**
 * Explore Advisory page structure: navigate to Smart Conversion, scroll inside
 * the Tableau iframe to load all sections, then dump aria-labels, headings,
 * and empty-vs-filled section info to JSON for tuning empty-section detection.
 *
 * Run from FLA dir: node scripts/advisory-explore-structure.mjs
 * Requires logged-in session: auth/sso-session (run advisory-audit once or login manually).
 */
import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const userDataDir = path.resolve(__dirname, '../auth/sso-session');
const outFile = path.resolve(__dirname, '../advisory-structure-explore.json');

async function main() {
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1920, height: 1080 },
  });
  const page = context.pages()[0] ?? await context.newPage();

  // Go directly to Smart Conversion Overview (or set ADVISORY_URL env to override)
  const targetUrl =
    process.env.ADVISORY_URL ||
    'https://platform.interface.ai/app-platformv5-aacu-chat-dev/advisory/SmartConversion/Overview';
  console.log('Navigating to', targetUrl);
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  // If we're on the app, optionally apply Last 30 Days
  const startDate = page.getByPlaceholder('Start date / time');
  if (await startDate.isVisible().catch(() => false)) {
    try {
      await startDate.click({ timeout: 10000 });
      await page.waitForTimeout(500);
      const last30 = page.getByText('Last 30 days', { exact: true });
      await last30.waitFor({ state: 'visible', timeout: 10000 });
      await last30.click();
      const applyBtn = page.getByRole('button', { name: 'Apply' });
      await applyBtn.waitFor({ state: 'visible', timeout: 10000 });
      await applyBtn.click();
      await page.waitForTimeout(3000);
    } catch (e) {
      console.log('Date filter skipped:', e.message);
    }
  }

  const reloadBtn = page.locator("button[aria-label='reload']").first();
  try {
    await reloadBtn.waitFor({ state: 'visible', timeout: 15000 });
    const maxWait = Date.now() + 45000;
    while ((await reloadBtn.isDisabled()) && Date.now() < maxWait) {
      await page.waitForTimeout(500);
    }
  } catch {}
  await page.waitForTimeout(2000);

  const iframe = page.locator('iframe').first();
  await iframe.waitFor({ state: 'attached', timeout: 30000 });
  const handle = await iframe.elementHandle();
  const frame = handle ? await handle.contentFrame() : null;
  if (!frame) {
    console.log('Could not get iframe content frame');
    await context.close();
    return;
  }

  // Scroll inside the iframe to load all sections (Tableau often virtualizes or lazy-renders)
  await frame.evaluate(() => {
    const scrollable = document.scrollingElement || document.documentElement || document.body;
    const maxScroll = Math.max(
      scrollable.scrollHeight - window.innerHeight,
      document.body.scrollHeight - window.innerHeight,
      0
    );
    scrollable.scrollTop = 0;
  });
  await page.waitForTimeout(800);
  const scrollSteps = await frame.evaluate(() => {
    const el = document.scrollingElement || document.documentElement || document.body;
    const maxScroll = Math.max(el.scrollHeight - window.innerHeight, 0);
    return Math.ceil(maxScroll / 400) || 1;
  });
  for (let i = 0; i < scrollSteps; i++) {
    await frame.evaluate((step) => {
      const el = document.scrollingElement || document.documentElement || document.body;
      el.scrollTop = Math.min(step * 400, el.scrollHeight - window.innerHeight);
    }, i);
    await page.waitForTimeout(300);
  }
  await frame.evaluate(() => {
    const el = document.scrollingElement || document.documentElement || document.body;
    el.scrollTop = el.scrollHeight;
  });
  await page.waitForTimeout(1500);

  // Dump structure: aria-label zones and heading-based sections
  const structure = await frame.evaluate(() => {
    const zones = [...document.querySelectorAll('[aria-label]')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 20 && r.height > 20;
      })
      .map((el) => {
        const label = el.getAttribute('aria-label') || '';
        const text = (el.innerText || '').trim().substring(0, 300);
        const gridcellText = [...el.querySelectorAll('[role="gridcell"]')]
          .map((c) => (c.textContent || '').trim())
          .join(' ');
        const statusText = [...el.querySelectorAll('[role="status"]')]
          .map((s) => (s.textContent || '').trim())
          .join(' ');
        return {
          label,
          textLength: text.length,
          textSample: text.substring(0, 80),
          gridcellLength: gridcellText.length,
          statusLength: statusText.length,
          hasCanvas: !!el.querySelector('canvas'),
          hasTable: !!el.querySelector('table,[role="grid"],[role="table"]'),
          hasSvg: !!el.querySelector('svg path,svg rect,svg circle,svg line'),
          rect: { w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) },
        };
      })
      .filter((z) => z.label.length > 0);

    const headings = [];
    for (const h of document.querySelectorAll('h2, h3, [role="heading"]')) {
      const name = (h.textContent || '').trim();
      if (!name || name.length > 200) continue;
      const parent = h.parentElement;
      if (!parent) continue;
      const content = h.nextElementSibling || parent;
      const hasCanvas = !!content.querySelector?.('canvas');
      const hasTable = !!content.querySelector?.('table,[role="grid"],[role="table"]');
      const hasSvg = !!content.querySelector?.('svg path,svg rect,svg circle,svg line');
      const text = (content.innerText || content.textContent || '').trim().replace(/\s+/g, ' ');
      headings.push({
        name,
        hasCanvas,
        hasTable,
        hasSvg,
        textLength: text.length,
        textSample: text.substring(0, 80),
        isEmpty: !hasCanvas && !hasTable && !hasSvg && text.length === 0,
      });
    }

    return {
      zonesCount: zones.length,
      zones,
      headingsCount: headings.length,
      headings,
      scrollHeight: (document.scrollingElement || document.body).scrollHeight,
      innerHeight: window.innerHeight,
    };
  });

  fs.writeFileSync(outFile, JSON.stringify(structure, null, 2), 'utf-8');
  console.log('Wrote', outFile);
  console.log('Zones (aria-label):', structure.zonesCount);
  console.log('Headings:', structure.headingsCount);
  const emptyZones = structure.zones.filter(
    (z) => !z.hasCanvas && !z.hasTable && !z.hasSvg && z.textLength === 0 && z.gridcellLength === 0 && z.statusLength === 0
  );
  const emptyHeadings = structure.headings.filter((h) => h.isEmpty);
  console.log('Zones with no content (empty container):', emptyZones.length);
  emptyZones.forEach((z) => console.log('  -', z.label));
  console.log('Headings with empty content area:', emptyHeadings.length);
  emptyHeadings.forEach((h) => console.log('  -', h.name));

  await context.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

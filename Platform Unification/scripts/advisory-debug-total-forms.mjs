/**
 * Debug: Smart Discovery Advisory > Conversation Volume > "Total Number of Forms Initiated".
 * Find where the value (e.g. 58) is represented in the iframe and what our validation sees.
 * Run from FLA: node scripts/advisory-debug-total-forms.mjs
 */
import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const userDataDir = path.resolve(__dirname, '../auth/sso-session');
const outFile = path.resolve(__dirname, '../advisory-debug-total-forms.json');

async function main() {
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1920, height: 1080 },
  });
  const page = context.pages()[0] ?? await context.newPage();

  await page.goto('https://platform.interface.ai', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);

  const advisoryLink = page.locator("//h2[text()='Advisory']").or(page.locator("//span[text()='Advisory']")).first();
  await advisoryLink.waitFor({ state: 'visible', timeout: 20000 });
  await advisoryLink.click();
  await page.waitForTimeout(5000);

  const smartDiscoveryLink = page.getByRole('link', { name: 'Smart Discovery Advisory', exact: true });
  await smartDiscoveryLink.waitFor({ state: 'visible', timeout: 15000 });
  await smartDiscoveryLink.click();
  await page.waitForTimeout(4000);

  const conversationVolumeTab = page.locator('[role="tab"]').filter({ hasText: 'Conversation Volume' });
  await conversationVolumeTab.waitFor({ state: 'visible', timeout: 10000 });
  await conversationVolumeTab.click();
  await page.waitForTimeout(5000);

  const reloadBtn = page.locator("button[aria-label='reload']").first();
  try {
    await reloadBtn.waitFor({ state: 'visible', timeout: 15000 });
    const maxWait = Date.now() + 60000;
    while ((await reloadBtn.isDisabled()) && Date.now() < maxWait) await page.waitForTimeout(500);
  } catch {}
  await page.waitForTimeout(3000);

  const iframe = page.locator('iframe').first();
  await iframe.waitFor({ state: 'attached', timeout: 30000 });
  const handle = await iframe.elementHandle();
  const frame = handle ? await handle.contentFrame() : null;
  if (!frame) {
    console.log('No iframe');
    await context.close();
    return;
  }

  await frame.evaluate(() => {
    const el = document.scrollingElement || document.body;
    el.scrollTop = 0;
  });
  await page.waitForTimeout(500);

  const searchLabel = 'Total Number of Forms Initiated';
  const zoneInfo = await frame.evaluate((search) => {
    const zones = [...document.querySelectorAll('[aria-label]')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 20 && r.height > 20;
    });
    const matching = zones.filter((el) => (el.getAttribute('aria-label') || '').includes(search));
    return matching.map((el) => {
      const label = el.getAttribute('aria-label') || '';
      const text = (el.innerText || '').trim();
      const textContent = (el.textContent || '').trim();
      const gridcells = [...el.querySelectorAll('[role="gridcell"]')].map((c) => c.textContent?.trim() || '');
      const status = [...el.querySelectorAll('[role="status"]')].map((s) => s.textContent?.trim() || '');
      const canvases = el.querySelectorAll('canvas');
      return {
        label: label.substring(0, 120),
        innerTextLength: text.length,
        innerTextSample: text.substring(0, 100),
        textContentLength: textContent.length,
        textContentSample: textContent.substring(0, 100),
        gridcellCount: gridcells.length,
        gridcells,
        statusCount: status.length,
        status,
        canvasCount: canvases.length,
        hasCanvas: canvases.length > 0,
        rect: { w: el.getBoundingClientRect().width, h: el.getBoundingClientRect().height },
      };
    });
  }, searchLabel);

  let ariaSnapshot = '';
  try {
    const loc = frame.locator('[aria-label*="Total Number of Forms Initiated"]').first();
    await loc.waitFor({ state: 'visible', timeout: 5000 });
    const parent = loc.locator('..');
    ariaSnapshot = await parent.ariaSnapshot({ timeout: 5000 });
  } catch (e) {
    ariaSnapshot = `Error: ${e.message}`;
  }

  const fullPageAria = await frame.evaluate(() => {
    function snapshot(node, depth = 0) {
      if (depth > 15) return null;
      const role = node.getAttribute?.('role') || node.ariaRole || '';
      const name = node.getAttribute?.('aria-label') || node.ariaLabel || '';
      const value = node.getAttribute?.('aria-valuetext') || node.innerText?.trim().substring(0, 80) || '';
      const text = (node.textContent || '').trim().substring(0, 150);
      const hasNum = /\d+/.test(text);
      const children = [...(node.children || [])].map((c) => snapshot(c, depth + 1)).filter(Boolean);
      if (name.includes('Total Number of Forms') || (hasNum && text.length < 50)) {
        return { role, name, value, text, hasNum, children: children.slice(0, 3) };
      }
      return null;
    }
    const walk = (n) => {
      const out = [];
      if (!n || n.nodeType !== 1) return out;
      const s = snapshot(n);
      if (s) out.push(s);
      for (const c of n.children || []) out.push(...walk(c));
      return out;
    };
    return walk(document.body);
  });

  const result = {
    zoneInfo,
    ariaSnapshotSample: ariaSnapshot.substring(0, 2000),
    fullPageAriaSnippets: fullPageAria,
  };
  fs.writeFileSync(outFile, JSON.stringify(result, null, 2), 'utf-8');
  console.log('Wrote', outFile);
  console.log('Zones matching "Total Number of Forms Initiated":', zoneInfo.length);
  zoneInfo.forEach((z, i) => {
    console.log(`  [${i}] hasCanvas=${z.hasCanvas} innerTextLen=${z.innerTextLength} gridcells=${z.gridcellCount} status=${z.statusCount}`);
    console.log('      innerText:', z.innerTextSample || '(empty)');
    console.log('      gridcells:', z.gridcells?.join(' | ') || '(none)');
  });
  console.log('Aria snapshot contains "58" or numbers:', /\b58\b|\d+/.test(ariaSnapshot));
  await context.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

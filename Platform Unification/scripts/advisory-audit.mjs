import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const userDataDir = path.resolve(__dirname, '../auth/sso-session');
const outDir = path.resolve(__dirname, '../audit-screenshots');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const context = await chromium.launchPersistentContext(userDataDir, { headless: false, viewport: { width: 1920, height: 1080 } });
  const page = context.pages()[0] ?? await context.newPage();

  await page.goto('https://platform.interface.ai', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Navigate to Advisory
  const advisoryLink = page.locator("//span[text()='Advisory']").first();
  try {
    await advisoryLink.waitFor({ state: 'visible', timeout: 15000 });
    await advisoryLink.click();
  } catch {
    console.log('Advisory link not found, trying direct URL');
  }
  await page.waitForTimeout(5000);

  // Apply Last 30 Days filter
  const startDate = page.getByPlaceholder('Start date / time');
  try {
    await startDate.click({ timeout: 10000 });
    const last30 = page.getByText('Last 30 days');
    await last30.waitFor({ state: 'visible', timeout: 10000 });
    await last30.click();
    const applyBtn = page.getByRole('button', { name: 'Apply' });
    await applyBtn.waitFor({ state: 'visible', timeout: 10000 });
    await applyBtn.click();
  } catch (e) {
    console.log('Date filter failed:', e.message);
  }

  // Wait for dashboard reload
  const reloadBtn = page.locator("//button[@aria-label='reload']").or(page.locator("button img[alt='reload']").locator('..'));
  try {
    await reloadBtn.first().waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(1000);
    const maxWait = Date.now() + 60000;
    while (await reloadBtn.first().isDisabled() && Date.now() < maxWait) {
      await page.waitForTimeout(500);
    }
  } catch {}

  const iframe = page.frameLocator('iframe[name="tableau-viz-AIPoweredPhoneBanking"]');
  const tabs = page.locator("//div[@role='tab']");
  const tabCount = await tabs.count();
  console.log(`Found ${tabCount} tabs`);

  const tabSections = {
    'Call Volume': ['Total Calls', 'Total After Hours Calls', 'Calls transferred to Contact Center', 'Average Call Handling Time of AI', 'Total AI usage', 'Blank Calls'],
    'Top Experiences': ['Top Experiences', 'Top After Hours Experiences', 'Top Transferred Experiences'],
    'Experience Usage': ['Triggered vs. Automated Count'],
    'Caller Details': ['Unique Callers', 'All Calls'],
    'Language': ['Total Calls', 'Calls in English', 'Calls in Spanish', 'Key Metrics'],
    'Next Best Experiences': ['Top Unsupported Intents', 'Top 10 Unimplemented Intents'],
    'Authentication': ['No. Of Triggers', 'No. Of Successes', 'Success Rate'],
  };

  const auditResults = {};

  for (let i = 0; i < tabCount; i++) {
    const tab = tabs.nth(i);
    const tabName = (await tab.textContent()).trim();
    console.log(`\n=== TAB: ${tabName} ===`);
    await tab.click();

    // Wait for reload
    try {
      await reloadBtn.first().waitFor({ state: 'visible', timeout: 10000 });
      await page.waitForTimeout(1000);
      const maxWait = Date.now() + 60000;
      while (await reloadBtn.first().isDisabled() && Date.now() < maxWait) {
        await page.waitForTimeout(500);
      }
    } catch {}
    await page.waitForTimeout(2000);

    // Full page screenshot of this tab
    await page.screenshot({ path: path.join(outDir, `tab-${i}-${tabName.replace(/\s+/g, '_')}.png`), fullPage: false });

    const expected = tabSections[tabName] || [];
    const sectionAudit = [];

    for (const section of expected) {
      try {
        const el = iframe.getByText(section, { exact: false }).first();
        await el.waitFor({ state: 'visible', timeout: 15000 });
        const box = await el.boundingBox();

        // Take a screenshot of the area below heading for analysis
        if (box) {
          const vw = page.viewportSize()?.width || 1920;
          const vh = page.viewportSize()?.height || 1080;
          const cx = Math.max(0, Math.round(box.x));
          const cy = Math.max(0, Math.round(box.y + box.height));
          const cw = Math.min(400, vw - cx);
          const ch = Math.min(150, vh - cy);
          if (cw > 20 && ch > 20) {
            const buf = await page.screenshot({ clip: { x: cx, y: cy, width: cw, height: ch } });
            const fname = `section-${tabName.replace(/\s+/g, '_')}-${section.replace(/[\s.]+/g, '_')}.png`;
            fs.writeFileSync(path.join(outDir, fname), buf);
            console.log(`  ${section}: FOUND (box: ${Math.round(box.x)},${Math.round(box.y)} ${Math.round(box.width)}x${Math.round(box.height)}) screenshot=${buf.length} bytes`);
            sectionAudit.push({ section, found: true, bytes: buf.length, box });
          } else {
            console.log(`  ${section}: FOUND but clip invalid`);
            sectionAudit.push({ section, found: true, bytes: -1, box });
          }
        } else {
          console.log(`  ${section}: FOUND but no bounding box`);
          sectionAudit.push({ section, found: true, bytes: -1, box: null });
        }
      } catch {
        console.log(`  ${section}: NOT FOUND (timeout)`);
        sectionAudit.push({ section, found: false, bytes: 0, box: null });
      }
    }
    auditResults[tabName] = sectionAudit;
  }

  // Write audit results
  fs.writeFileSync(path.join(outDir, 'audit-results.json'), JSON.stringify(auditResults, null, 2));
  console.log('\n\n=== AUDIT SUMMARY ===');
  for (const [tab, sections] of Object.entries(auditResults)) {
    console.log(`\n[${tab}]`);
    for (const s of sections) {
      console.log(`  ${s.found ? '✓' : '✗'} ${s.section} — bytes=${s.bytes}`);
    }
  }

  await context.close();
})();

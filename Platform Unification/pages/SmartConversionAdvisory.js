import { getTestData } from '../utils/excelReader.js';
import path from 'path';
import fs from 'fs';
import LoginPage from './LoginPage.js';

class SmartConversionAdvisory {

    constructor(page) {
        const dataFile = path.resolve('./data/testData.xlsx');
        const testData = getTestData(dataFile);

        this.CUname = (process.env.PU_CUNAME || testData.Cuname || '').toString().trim();
        this.Envname = (process.env.ENVNAME || testData.Env || '').toString().trim();
        this.page = page;

        // Landing → Chat AI env selection
        this.ChatAIEnvSelection = this.page.locator(
            `//div[h2[text()="Chat AI"]]/following-sibling::div//p[translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz")="${this.Envname.toLowerCase()}"]`
        );

        // App-select page → Advisory card
        this.AdvisoryCard = this.page.locator("//h2[text()='Advisory']");

        // Sidebar dashboard links (each link wraps an h4 heading)
        this.SidebarLinks = this.page.locator('a').filter({ has: this.page.locator('h4') });

        // Dashboard heading
        this.DashboardHeading = this.page.locator('h3');

        // Tabs
        this.Tabs = this.page.locator('[role="tablist"] [role="tab"]');

        // Date picker
        this.StartDateInput = this.page.getByPlaceholder('Start date / time');
        this.EndDateInput = this.page.getByPlaceholder('End date / time');
        this.ApplyBtn = this.page.locator('button').filter({ hasText: 'Apply' });
        this.DatePickerPresets = this.page.locator('.ant-picker-presets li');
        this.Last30DaysPreset = this.page.getByText('Last 30 days');

        // Action buttons (inside the nested main within tab panel)
        this.ReloadBtn = this.page.getByRole('button', { name: 'reload' });
        this.DownloadBtn = this.page.getByRole('button', { name: 'download' });

        // Tableau iframe — use _getActiveIframeIndex() to find the right one
        this.TableauIframe = this.page.locator('iframe').first();
    }

    /**
     * Find the index of the currently visible Tableau iframe.
     * The app may keep old iframes in the DOM when switching dashboards;
     * we need the visible/active one (typically the last one added).
     */
    async _getActiveIframeIndex() {
        const allIframes = this.page.locator('iframe');
        const count = await allIframes.count();
        if (count <= 1) return 0;

        for (let i = count - 1; i >= 0; i--) {
            const visible = await allIframes.nth(i).isVisible().catch(() => false);
            if (visible) return i;
        }
        return count - 1;
    }

    /**
     * Get a locator for the currently active Tableau iframe.
     */
    async _getActiveIframeLocator() {
        const idx = await this._getActiveIframeIndex();
        return this.page.locator('iframe').nth(idx);
    }

    /**
     * Get the contentFrame of the currently active Tableau iframe.
     */
    async _getActiveFrame() {
        const iframe = await this._getActiveIframeLocator();
        const handle = await iframe.elementHandle();
        return handle ? await handle.contentFrame() : null;
    }

    async goToLandingAndSelectAdvisory() {
        const url = this.page.url();
        if (!url.includes('/landing') && !url.includes('/select')) {
            await this.page.goto('https://platform.interface.ai/landing');
            await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
            await this.page.waitForTimeout(2000);
        }

        try {
            await this.ChatAIEnvSelection.waitFor({ state: 'visible', timeout: 30000 });
        } catch {
            console.log(`[Advisory] Env "${this.Envname}" not visible — reloading and re-selecting CU "${this.CUname}"…`);
            await this.page.goto('https://platform.interface.ai/landing');
            await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
            await this.page.waitForTimeout(2000);

            await this.page.getByPlaceholder('Search Workspace').fill(this.CUname);
            const cuItem = this.page.locator('.CuItem_cuListItemIconWrapper__1zIvu p');
            await cuItem.first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
            const count = await cuItem.count();
            for (let i = 0; i < count; i++) {
                const name = (await cuItem.nth(i).innerText()).trim();
                if (name.toLowerCase() === this.CUname.toLowerCase()) {
                    await cuItem.nth(i).click();
                    await this.page.waitForTimeout(3000);
                    break;
                }
            }

            await this.ChatAIEnvSelection.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {
                throw new Error(`Chat AI environment "${this.Envname}" not found for CU "${this.CUname}" after retry`);
            });
        }

        await this.ChatAIEnvSelection.click();
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForTimeout(2000);
        await this.AdvisoryCard.waitFor({ state: 'visible', timeout: 30000 });
        await this.AdvisoryCard.click();
        await this.page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
        await this.page.waitForTimeout(3000);
    }

    async getSidebarDashboards() {
        const count = await this.SidebarLinks.count();
        const dashboards = [];
        for (let i = 0; i < count; i++) {
            const link = this.SidebarLinks.nth(i);
            const name = (await link.textContent()).trim();
            const href = await link.getAttribute('href');
            dashboards.push({ name, href });
        }
        return dashboards;
    }

    async isDashboardAvailable(dashboardName) {
        const link = this.page.getByRole('link', { name: dashboardName, exact: true });
        return await link.isVisible().catch(() => false);
    }

    async navigateToDashboard(dashboardName) {
        const currentUrl = this.page.url();

        const link = this.page.getByRole('link', { name: dashboardName, exact: true });
        await link.waitFor({ state: 'visible', timeout: 15000 });
        await link.click();

        try {
            await this.page.waitForURL((url) => url.href !== currentUrl, { timeout: 10000 });
        } catch { /* already on this dashboard */ }

        await this.page.waitForTimeout(3000);
        await this._waitForIframeReload();
    }

    async getTabNames() {
        await this.Tabs.first().waitFor({ state: 'visible', timeout: 30000 });
        const count = await this.Tabs.count();
        const names = [];
        for (let i = 0; i < count; i++) {
            names.push((await this.Tabs.nth(i).textContent()).trim());
        }
        return names;
    }

    async clickTab(tabName) {
        const currentUrl = this.page.url();
        const tab = this.Tabs.filter({ hasText: tabName });
        await tab.waitFor({ state: 'visible', timeout: 15000 });
        await tab.click();

        try {
            await this.page.waitForURL((url) => url.href !== currentUrl, { timeout: 10000 });
        } catch { /* URL might not change */ }

        await this.page.waitForTimeout(3000);
        await this._waitForIframeReload();
    }

    /**
     * Wait for the Tableau iframe to fully load (or reload) with content.
     * Handles both fresh load and content switch scenarios.
     */
    async _waitForIframeReload() {
        await this.page.waitForFunction(
            () => document.querySelectorAll('.ant-spin-spinning').length === 0,
            null, { timeout: 15000 }
        ).catch(() => {});

        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

        await this.page.locator('iframe').first().waitFor({ state: 'attached', timeout: 20000 }).catch(() => {});

        try {
            const frame = await this._getActiveFrame();
            if (frame) {
                await frame.waitForLoadState('load', { timeout: 20000 }).catch(() => {});
                await frame.waitForSelector('canvas', { state: 'visible', timeout: 20000 }).catch(() => {});
                await this.page.waitForTimeout(2000);
            }
        } catch { /* proceed if canvas not available */ }
    }

    async isIframeLoaded() {
        try {
            const iframe = await this._getActiveIframeLocator();
            await iframe.waitFor({ state: 'attached', timeout: 30000 });
            const src = await iframe.getAttribute('src').catch(() => null);
            return { visible: true, src };
        } catch {
            return { visible: false, src: null };
        }
    }

    async applyDateRange(presetText) {
        await this.waitForReloadEnabled(60000);
        await this.page.waitForTimeout(1000);

        const pickerWrapper = this.page.locator('.ant-picker.ant-picker-range');
        for (let attempt = 0; attempt < 3; attempt++) {
            await pickerWrapper.click({ timeout: 15000 });
            await this.page.waitForTimeout(1500);
            const presetExact = this.page.getByText(presetText, { exact: true });
            const presetLoose = this.page.locator(`text=${presetText}`);
            const found = await presetExact.isVisible().catch(() => false)
                || await presetLoose.isVisible().catch(() => false);
            if (found) break;
            await this.page.keyboard.press('Escape');
            await this.page.waitForTimeout(500);
        }

        let preset = this.page.getByText(presetText, { exact: true });
        let visible = await preset.isVisible().catch(() => false);
        if (!visible) {
            preset = this.page.locator(`text=${presetText}`);
        }
        await preset.waitFor({ state: 'visible', timeout: 15000 });
        await preset.click();
        await this.page.waitForTimeout(500);
        await this.ApplyBtn.waitFor({ state: 'visible', timeout: 10000 });
        await this.ApplyBtn.click();
        await this._waitForIframeReload();
    }

    async isReloadEnabled() {
        const visible = await this.ReloadBtn.isVisible().catch(() => false);
        if (!visible) return false;
        const disabled = await this.ReloadBtn.isDisabled().catch(() => true);
        return !disabled;
    }

    async waitForReloadEnabled(timeoutMs = 60000) {
        const maxWait = Date.now() + timeoutMs;
        while (Date.now() < maxWait) {
            if (await this.isReloadEnabled()) return;
            await this.page.waitForTimeout(500);
        }
    }

    /**
     * Scroll inside the Tableau iframe so all sections are in view / rendered
     * (Tableau may virtualize or lazy-render content below the fold).
     */
    async _scrollIframeToLoadAllSections() {
        const frame = await this._getActiveFrame();
        if (!frame) return;
        await frame.evaluate(() => {
            const el = document.scrollingElement || document.documentElement || document.body;
            el.scrollTop = 0;
        });
        await this.page.waitForTimeout(500);
        const scrollSteps = await frame.evaluate(() => {
            const el = document.scrollingElement || document.documentElement || document.body;
            const maxScroll = Math.max(el.scrollHeight - window.innerHeight, 0);
            return Math.min(Math.ceil(maxScroll / 400) + 1, 25);
        });
        for (let i = 0; i < scrollSteps; i++) {
            await frame.evaluate((step) => {
                const el = document.scrollingElement || document.documentElement || document.body;
                el.scrollTop = Math.min(step * 400, el.scrollHeight - window.innerHeight);
            }, i);
            await this.page.waitForTimeout(200);
        }
        await frame.evaluate(() => {
            const el = document.scrollingElement || document.documentElement || document.body;
            el.scrollTop = el.scrollHeight;
        });
        await this.page.waitForTimeout(800);
    }

    /**
     * Check if the Tableau iframe has rendered meaningful content.
     * Returns true if iframe has canvas elements visible.
     */
    async hasIframeContent() {
        try {
            const frame = await this._getActiveFrame();
            if (!frame) return false;
            const hasCanvas = await frame.evaluate(
                () => !!document.querySelector('canvas')
            );
            return hasCanvas;
        } catch {
            return false;
        }
    }

    /**
     * If the current dashboard view has no Tableau content (empty for today),
     * switch to "Last 30 days" and re-check.
     * Returns true if data is available after the check.
     */
    async ensureDataAvailable() {
        const hasContent = await this.hasIframeContent();
        if (hasContent) return true;

        console.log('No data for today, switching to Last 30 days...');
        await this.applyDateRange('Last 30 days');
        await this.page.waitForTimeout(3000);
        return await this.hasIframeContent();
    }

    /**
     * Deep inspection of the Tableau iframe sections using ariaSnapshot.
     *
     * Tableau renders KPI values and chart data OUTSIDE the aria-label zone elements,
     * making direct DOM checks unreliable. Instead:
     *  1. Discover named section zones via aria-label attributes (DOM)
     *  2. Take ariaSnapshot of the full iframe body (accessibility tree)
     *  3. Map section names to their accessible data values
     *  4. Flag sections with no data or all-zero values
     */
    async _validateCurrentTabSections() {
        const iframeIdx = await this._getActiveIframeIndex();
        const iframeEl = this.page.locator('iframe').nth(iframeIdx);
        await iframeEl.waitFor({ state: 'attached', timeout: 30000 });
        const iframeSrc = await iframeEl.getAttribute('src').catch(() => '(unknown)');
        const frame = await this._getActiveFrame();
        if (!frame) return { failures: ['Could not access iframe content'], sections: [] };

        const hasContent = await frame.evaluate(() => {
            return !!document.querySelector('canvas') || (document.body?.innerText?.trim().length || 0) > 0;
        });
        if (!hasContent) return { failures: ['Tab content is completely empty'], sections: [] };

        // Pass 1: Discover named Data Visualization sections from aria-label zones
        const zones = await frame.evaluate(() => {
            return [...document.querySelectorAll('[aria-label]')]
                .filter(el => {
                    const r = el.getBoundingClientRect();
                    return r.width > 30 && r.height > 30;
                })
                .map(el => el.getAttribute('aria-label') || '')
                .filter(lbl => lbl.length > 0 && /data visualization/i.test(lbl));
        });

        // Extract named user-facing sections (skip Title, technical/margin labels, duplicates)
        const namedSections = [];
        const seen = new Set();
        for (const lbl of zones) {
            if (seen.has(lbl)) continue;
            seen.add(lbl);

            if (/^Title:\s*/i.test(lbl)) continue;
            const sectionName = lbl.split('.')[0].trim();
            if (sectionName.length < 3) continue;
            const isTechnical = /,\s*margin$/i.test(sectionName) ||
                /^margin$/i.test(sectionName) ||
                /IFNULL|Metrics Reactive Queries/i.test(sectionName) ||
                /^This is a drill-down viz$/i.test(sectionName);
            if (isTechnical) continue;

            const hasNoData = /no data to visualize/i.test(lbl);
            namedSections.push({ sectionName, fullLabel: lbl, hasNoData });
        }

        // Pass 2: Full-body ariaSnapshot (single fast call).
        // Tableau renders KPI values on canvas (invisible to ariaSnapshot), but
        // chart data appears as treegrid rows. By checking what's BETWEEN section
        // headings in the snapshot, we can detect empty chart sections.
        let fullSnapshot = '';
        try {
            const bodyLocator = this.page.frameLocator('iframe').nth(iframeIdx).locator('body');
            fullSnapshot = await bodyLocator.ariaSnapshot({ timeout: 20000 });
        } catch { /* ariaSnapshot may fail */ }

        const failures = [];
        const sections = [];
        const pageUrl = this.page.url();
        const activeTab = await this.page.locator('[role="tab"][aria-selected="true"]').textContent().catch(() => '(unknown)');
        const heading = await this.page.locator('h3').first().textContent().catch(() => '(unknown)');
        const totalIframes = await this.page.locator('iframe').count();
        const diagLines = [
            `--- page: ${pageUrl} | heading: ${heading.trim()} | tab: ${activeTab.trim()} ---`,
            `--- iframes: ${totalIframes}, using idx: ${iframeIdx} | src: ${iframeSrc} ---`,
            `--- Sections: ${namedSections.length}, Snap: ${fullSnapshot.length}c ---`,
        ];

        // Build a map: for each "Title:" section heading, extract content until the next "Title:" heading.
        // Only "Title:" headings mark section boundaries; legend/chart headings are part of the section content.
        const snapshotLines = fullSnapshot.split('\n');
        const sectionContentMap = new Map();
        for (let i = 0; i < snapshotLines.length; i++) {
            const line = snapshotLines[i];
            const titleMatch = line.match(/heading\s+["']Title:\s*(.+?)\.?["']/i);
            if (!titleMatch) continue;
            const headingName = titleMatch[1].trim();

            // Gather ALL lines until the NEXT "Title:" heading
            const contentLines = [];
            for (let j = i + 1; j < snapshotLines.length; j++) {
                if (/heading\s+["']Title:/i.test(snapshotLines[j])) break;
                contentLines.push(snapshotLines[j]);
            }
            const content = contentLines.join('\n');
            sectionContentMap.set(headingName, content);
        }

        for (const { sectionName, fullLabel, hasNoData } of namedSections) {
            const isChart = /bar chart|line chart|area chart|pie chart/i.test(fullLabel);
            const isTextTable = /text table/i.test(fullLabel);
            sections.push({ label: sectionName, fullLabel, hasNoData });

            if (hasNoData) {
                failures.push(`"${sectionName}" — No data to visualize`);
                diagLines.push(`EMPTY: "${sectionName}" — No data to visualize (aria-label)`);
                continue;
            }

            // Look up this section's content from two sources:
            // 1. Content between its "Title:" heading and the next (for treegrids, status)
            // 2. The entire snapshot for legends (Tableau places legends separately from charts)
            const titleContent = sectionContentMap.get(sectionName) || '';
            const hasTreegrid = /treegrid/i.test(titleContent);
            const hasGridcell = /gridcell/i.test(titleContent);
            const hasStatus = /status/i.test(titleContent);

            // Check for legend data for this section across the ENTIRE snapshot
            const escapedName = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const legendRegex = new RegExp(`Color legend for ${escapedName}[\\s\\S]*?(?=\\n\\s*-\\s*(?:button|heading "Title:)|$)`, 'i');
            const legendMatch = fullSnapshot.match(legendRegex);
            const legendContent = legendMatch ? legendMatch[0] : '';
            const hasLegendOptions = /option\s+["']/i.test(legendContent);
            const hasListbox = /listbox/i.test(legendContent);

            // Extract gridcell data (filter out pure axis labels like "Count 0 1 2 3")
            const gridcellMatches = [...titleContent.matchAll(/gridcell\s+["']([^"']+)["']/gi)].map(m => m[1]);
            const dataGridcells = gridcellMatches.filter(g => !/^Count\s+[\d\s]+$/i.test(g));

            let status = 'unknown';
            let reason = '';

            if (isChart) {
                // For chart sections: check treegrid data rows, legend options
                if (hasTreegrid && dataGridcells.length > 0) {
                    status = 'has_data';
                    reason = `treegrid with ${dataGridcells.length} data cell(s)`;
                } else if (hasLegendOptions) {
                    status = 'has_data';
                    reason = 'legend with data options';
                } else if (hasListbox && !hasLegendOptions) {
                    status = 'empty';
                    reason = 'legend present but no data options';
                } else if (!hasTreegrid && !hasGridcell) {
                    status = 'empty';
                    reason = 'no chart data found';
                } else {
                    status = 'empty';
                    reason = 'only axis labels, no data rows';
                }
            } else if (isTextTable) {
                // KPI (Text Table) sections: Tableau renders values on canvas.
                // The snapshot only shows "region: status" which is always empty.
                // We can only flag these if they have NO status region at all.
                if (!hasStatus && titleContent.trim().length === 0) {
                    status = 'empty';
                    reason = 'no content in snapshot';
                } else {
                    // Has status region — canvas-rendered value, can't verify from snapshot
                    status = 'has_data';
                    reason = 'KPI with status region (canvas-rendered)';
                }
            } else {
                // Generic visualization — check for any data indicators
                if (hasTreegrid && dataGridcells.length > 0) {
                    status = 'has_data';
                    reason = `treegrid with data`;
                } else if (hasLegendOptions) {
                    status = 'has_data';
                    reason = 'legend with options';
                } else if (hasStatus) {
                    status = 'has_data';
                    reason = 'has status region';
                } else if (titleContent.trim().length === 0) {
                    status = 'empty';
                    reason = 'no content in snapshot';
                } else {
                    status = 'has_data';
                    reason = 'has some content';
                }
            }

            diagLines.push(`Section: "${sectionName}" | chart=${isChart} tt=${isTextTable} legend=${hasListbox}/${hasLegendOptions} status=${status} reason="${reason}"`);

            if (status === 'empty') {
                failures.push(`"${sectionName}" — section has no data`);
            }
        }

        if (namedSections.length === 0) {
            failures.push('No sections detected in the Tableau iframe');
        }

        try {
            fs.appendFileSync(path.resolve('./advisory-diag.log'), diagLines.join('\n') + '\n\n', 'utf-8');
        } catch {}

        return { failures, sections };
    }

    /**
     * Navigate through all tabs of the current dashboard.
     * For each tab: verify iframe loads, deep-inspect Tableau sections,
     * and collect failures/screenshots for alerting.
     */
    async navigateAllTabsAndVerify() {
        const tabNames = await this.getTabNames();
        const allResults = [];
        const allFailures = [];
        const alertScreenshots = [];

        for (const tabName of tabNames) {
            const isFirst = tabNames.indexOf(tabName) === 0;
            if (!isFirst) {
                await this.clickTab(tabName);
            }

            const { visible, src } = await this.isIframeLoaded();
            await this._scrollIframeToLoadAllSections();
            const { failures, sections } = await this._validateCurrentTabSections();
            const prefixed = failures.map(f => `[${tabName}] ${f}`);

            allResults.push({
                tabName,
                iframeVisible: visible,
                src,
                sectionCount: sections.length,
                failures: prefixed,
                sections,
            });
            allFailures.push(...prefixed);

            if (prefixed.length > 0) {
                const screenshot = await this.page.screenshot();
                alertScreenshots.push({ tabName, buffer: screenshot });
            }
        }

        return { tabNames, allResults, allFailures, alertScreenshots };
    }
}

export default SmartConversionAdvisory;

import { test, expect } from '../fixtures/persistent-shared.js';
import SmartConversionAdvisory from '../../pages/SmartConversionAdvisory.js';

// All known dashboards — tests will skip dynamically if a dashboard is absent for the CU
const ALL_DASHBOARDS = [
    'Smart Conversion',
    'Smart Discovery Advisory',
    'Smart Discovery Advisory (Glia)',
    'Smart Discovery Advisory Internal',
    'Smart Discovery V2',
];

let advisoryAvailable = false;
let discoveredDashboards = [];
let dateRangeApplied = false;

test.describe.serial('Chat AI Advisory (SmartConversion)', () => {

    // ─── Navigation ─────────────────────────────────────────────────────

    test('Advisory: Navigate to Advisory', async ({ sharedPage }) => {
        test.setTimeout(120000);
        const adv = new SmartConversionAdvisory(sharedPage);
        await adv.goToLandingAndSelectAdvisory();

        const heading = adv.DashboardHeading;
        await heading.waitFor({ state: 'visible', timeout: 30000 });
        advisoryAvailable = true;
        console.log('Advisory page loaded');
    });

    test('Advisory: Verify Sidebar Dashboards', async ({ sharedPage }) => {
        test.skip(!advisoryAvailable, 'Advisory not available');
        const adv = new SmartConversionAdvisory(sharedPage);
        discoveredDashboards = await adv.getSidebarDashboards();

        expect(discoveredDashboards.length).toBeGreaterThan(0);
        console.log(`Found ${discoveredDashboards.length} dashboard(s):`);
        discoveredDashboards.forEach((d, i) => console.log(`  ${i + 1}. ${d.name}`));
    });

    test('Advisory: Date Picker Visible', async ({ sharedPage }) => {
        test.skip(!advisoryAvailable, 'Advisory not available');
        const adv = new SmartConversionAdvisory(sharedPage);
        await expect(adv.StartDateInput).toBeVisible();
        await expect(adv.EndDateInput).toBeVisible();
        await expect(adv.ApplyBtn).toBeVisible();
        console.log('Date picker is visible with Apply button');
    });

    test('Advisory: Apply Last 30 Days', async ({ sharedPage }) => {
        test.skip(!advisoryAvailable, 'Advisory not available');
        test.setTimeout(90000);
        const adv = new SmartConversionAdvisory(sharedPage);
        await adv.applyDateRange('Last 30 days');
        dateRangeApplied = true;

        const startVal = await adv.StartDateInput.inputValue().catch(() => '');
        const endVal = await adv.EndDateInput.inputValue().catch(() => '');
        console.log(`Date range applied: ${startVal} to ${endVal}`);
    });

    // ─── Per-Dashboard Tests ────────────────────────────────────────────

    for (const dashboardName of ALL_DASHBOARDS) {
        const prefix = dashboardName.replace(/[()]/g, '').replace(/\s+/g, ' ');

        test(`${prefix}: Navigate & Verify Heading`, async ({ sharedPage }) => {
            test.skip(!advisoryAvailable, 'Advisory not available');
            test.setTimeout(90000);
            const adv = new SmartConversionAdvisory(sharedPage);

            const available = await adv.isDashboardAvailable(dashboardName);
            if (!available) {
                console.log(`Dashboard "${dashboardName}" not available for this CU, skipping`);
                test.skip(true, `${dashboardName} not available for this CU`);
            }

            await adv.navigateToDashboard(dashboardName);
            const headingText = await adv.DashboardHeading.textContent();
            expect(headingText.trim()).toBe(dashboardName);
            console.log(`Navigated to "${dashboardName}"`);
        });

        test(`${prefix}: Tabs Present`, async ({ sharedPage }) => {
            test.skip(!advisoryAvailable, 'Advisory not available');
            const adv = new SmartConversionAdvisory(sharedPage);

            const available = await adv.isDashboardAvailable(dashboardName);
            if (!available) test.skip(true, `${dashboardName} not available`);

            const tabNames = await adv.getTabNames();
            expect(tabNames.length).toBeGreaterThan(0);
            console.log(`"${dashboardName}" tabs (${tabNames.length}): ${tabNames.join(', ')}`);
        });

        test(`${prefix}: Tableau Iframe Loaded`, async ({ sharedPage }) => {
            test.skip(!advisoryAvailable, 'Advisory not available');
            const adv = new SmartConversionAdvisory(sharedPage);

            const available = await adv.isDashboardAvailable(dashboardName);
            if (!available) test.skip(true, `${dashboardName} not available`);

            const { visible, src } = await adv.isIframeLoaded();
            expect(visible).toBe(true);
            expect(src).toBeTruthy();
            console.log(`Iframe loaded for "${dashboardName}"`);
        });

        test(`${prefix}: Reload & Download Buttons`, async ({ sharedPage }) => {
            test.skip(!advisoryAvailable, 'Advisory not available');
            test.setTimeout(60000);
            const adv = new SmartConversionAdvisory(sharedPage);

            const available = await adv.isDashboardAvailable(dashboardName);
            if (!available) test.skip(true, `${dashboardName} not available`);

            await adv.waitForReloadEnabled(30000);
            const reloadVisible = await adv.ReloadBtn.isVisible().catch(() => false);
            const downloadVisible = await adv.DownloadBtn.isVisible().catch(() => false);
            expect(reloadVisible || downloadVisible).toBe(true);
            console.log(`Reload: ${reloadVisible}, Download: ${downloadVisible}`);
        });

        test(`${prefix}: Tab Navigation & Data Check`, async ({ sharedPage }) => {
            test.skip(!advisoryAvailable, 'Advisory not available');
            test.setTimeout(300000);
            const adv = new SmartConversionAdvisory(sharedPage);

            const available = await adv.isDashboardAvailable(dashboardName);
            if (!available) test.skip(true, `${dashboardName} not available`);

            if (!dateRangeApplied) {
                await adv.applyDateRange('Last 30 days');
                dateRangeApplied = true;
            }

            const { tabNames, allResults, allFailures, alertScreenshots } =
                await adv.navigateAllTabsAndVerify();

            for (const r of allResults) {
                expect(r.iframeVisible).toBe(true);
                expect(r.src).toBeTruthy();
                console.log(`  [${r.tabName}] Sections: ${r.sectionCount}, Alerts: ${r.failures.length}`);
                for (const f of r.failures) console.log(`    ALERT: ${f}`);
            }

            if (allFailures.length > 0) {
                console.warn(`  WARNING: ${allFailures.length} alert(s) in "${dashboardName}":`);
                for (const f of allFailures) console.warn(`    ${f}`);

                test.info().annotations.push({
                    type: 'warning',
                    description: `[${dashboardName}] ${allFailures.join(' | ')}`,
                });

                for (const s of alertScreenshots) {
                    await test.info().attach(`Alert - ${dashboardName} - ${s.tabName}`, {
                        body: s.buffer,
                        contentType: 'image/png',
                    });
                }
            }

            console.log(`"${dashboardName}": ${tabNames.length} tab(s) verified, ${allFailures.length} alert(s)`);
        });
    }
});

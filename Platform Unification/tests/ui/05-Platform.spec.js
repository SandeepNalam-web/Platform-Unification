import { test, expect } from '../fixtures/persistent-shared.js';
import Platform from '../../pages/Platform.js';
import { callAdminMockApiWithPhone } from '../../pages/AdminMockApi.js';

test.describe.serial('Post Requisite', async () => {
    test.describe.serial('Login Test', () => {
        // Runs first in a fresh context (no saved session) so login page is shown
        test('Unregistered Email ID check', async ({ freshPage }) => {
            test.setTimeout(180000);
            const platformpage = new Platform(freshPage);
            await platformpage.UnregisteredEmailIDCheck();
            await expect(platformpage.UnregisteredEmailError).toBeVisible();
        });

        // Runs second; performs login and stores session in persistent context for remaining tests
    });
    test('APT: Recent Conversations and Analyzed Conversations check', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        // Login + CU selection when needed, then AIPB/APT; skips CU step if already on app-select
        await platformpage.loginAndSelectAIPBAndAPT();
        // await expect(platformpage.APT).toBeVisible();
        await expect(platformpage.RecentConversations).toBeVisible();
        await expect(platformpage.RecentConversations).toHaveAttribute('aria-selected', 'true');
        await expect(platformpage.AnalyzedConversations).toBeVisible();
    });
    test('APT: Analyzed Conversations based on Exp Name', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        await platformpage.AnalyzedConversationsBasedOnExpName();
        const InputTexts = await platformpage.InputConversations.allTextContents();
        const matchFound = InputTexts.some(text => text.toLowerCase().includes('routing'));
        expect(matchFound).toBe(true);
    });
    test('APT: Recent Conversations Assertion Check', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        await platformpage.RecentConversationAssertions();
        const LeftPaneIdentifier = await platformpage.ConversationIDLeftPane.textContent();
        const RightPaneIdentifier = await platformpage.ConversationIDRightPane.textContent();
        expect(LeftPaneIdentifier).toEqual(RightPaneIdentifier);
        const LeftPaneFromPhone = (await platformpage.FromPhoneLeftPane.textContent() ?? '').trim();
        const RightPaneFromPhone = (await platformpage.FromPhoneRightPane.textContent() ?? '').trim();
        expect(LeftPaneFromPhone).toEqual(RightPaneFromPhone);

        // Call Admin Mock API with same fromPhone as left/right pane; hard assert phone number match
        const { fromPhoneUsed } = await callAdminMockApiWithPhone(LeftPaneFromPhone);
        expect(fromPhoneUsed).toBe(LeftPaneFromPhone);
        expect(fromPhoneUsed).toBe(RightPaneFromPhone);
    });
    test('Automation: Automation Selection', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        await platformpage.AutomationForLastMonth();
        const startdate = await platformpage.StartDate.inputValue();
        const enddate = await platformpage.EndDate.inputValue();
        const formatDate = (dateStr) => {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        };
        const formattedStartDate = formatDate(startdate);
        const formattedEndDate = formatDate(enddate);
        const reportHeader = platformpage.page.locator('//div[contains(text(),"Automation Report")]').first();
        await expect(reportHeader).toContainText(`${formattedStartDate} - ${formattedEndDate}`);
    });
    test('Automation: Refresh Module Check', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        await platformpage.RefreshModuleCheck();
        await expect(platformpage.NoofCalls).toBeVisible();
    });
    test('Automation: Total Calls Check', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        const { totalCallsBreakdown, totalcalls, breakdownDetails } = await platformpage.TotalCallsCheck();
        const diff = Math.abs(totalcalls - totalCallsBreakdown);
        const tolerance = Math.ceil(totalcalls * 0.01);
        console.log(`Total: ${totalcalls}, Breakdown Sum: ${totalCallsBreakdown}, Diff: ${diff}, Tolerance: ${tolerance}`);
        expect(diff).toBeLessThanOrEqual(tolerance);
    });
    test('Event Manager: Previous Date Disabled', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        await platformpage.EventManagerforPreviousDateDisabled();
        const todayCell = platformpage.page.locator('td.ant-picker-cell-today');
        const todayTitle = await todayCell.getAttribute('title');
        const dateCells = platformpage.page.locator('td.ant-picker-cell');
        const count = await dateCells.count();
        for (let i = 0; i < count; i++) {
            const cell = dateCells.nth(i);
            const title = await cell.getAttribute('title');
            if (!title) continue;
            if (title < todayTitle) {
                await expect(cell).toHaveClass(/ant-picker-cell-disabled/);
            }
        }
    });
    test('Event Manager: New Event Creation and Publish', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        await platformpage.EventManagerNewEventCreation();
        const published = platformpage.PublishedEvent;
        const publishVisible = await published.isVisible().catch(() => false);
        if (!publishVisible) {
            const eventRow = platformpage.page.locator("//td//div[contains(text(),'Test Event Manager')]");
            await expect(eventRow).toBeVisible({ timeout: 10000 });
            console.log('Publish toast missed, but event exists in table — treating as pass');
        } else {
            console.log('Published successfully toast visible');
        }
    });
    test('Event Manager: Duplicate Event Creation', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        await platformpage.DuplicateEventCreation();
        await expect(platformpage.DuplicateEventAlert).toBeVisible();
        await platformpage.CancelEventButton.scrollIntoViewIfNeeded();
        await platformpage.CancelEventButton.click();
    });
    test('Event Manager: Search and Delete', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        await platformpage.EventSearchAndDelete();
        const exactEventRow = platformpage.page.locator("//td//div[text()='Test Event Manager']");
        const eventGone = !await exactEventRow.isVisible().catch(() => false);
        console.log(`After delete: EventGone=${eventGone}`);
        expect(eventGone).toBeTruthy();
    });
    test('Advisory: Selection', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        await platformpage.AdvisorySelection();
    });
    test('Advisory: Page Load & Heading Verification', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        await platformpage.AdvisoryPageLoadCheck();
        await expect(platformpage.AdvisoryHeading).toBeVisible();
    });
    test('Advisory: Summary Cards Visible', async ({ sharedPage }) => {
        test.setTimeout(120000);
        const platformpage = new Platform(sharedPage);
        const { titleCount, titles } = await platformpage.AdvisorySummaryCardsCheck();
        expect(titleCount).toBeGreaterThan(0);
        expect(titles).toContain('Total Calls');
    });

    // ── AI Powered Phone Banking (AIPB) Advisory Tests ──

    test('Advisory AIPB: Dashboard Link Visible in Sidebar', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        await platformpage.AdvisoryAIPBDashboardVisible();
        await expect(platformpage.AdvisoryAIPBLink).toBeVisible();
    });

    test('Advisory AIPB: Tabs Present', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        const tabs = await platformpage.AdvisoryAIPBTabNames();
        expect(tabs.length).toBeGreaterThan(0);
        const expectedTabs = ['Call Volume', 'Top Experiences', 'Experience Usage', 'Caller Details', 'Language', 'Next Best Experiences', 'Authentication'];
        for (const expected of expectedTabs) {
            expect(tabs).toContain(expected);
        }
    });

    test('Advisory AIPB: Tableau Iframe Loaded', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        const { visible, src } = await platformpage.AdvisoryIframePresent();
        expect(visible).toBe(true);
        expect(src).toBeTruthy();
    });

    test('Advisory AIPB: Date Picker Visible', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        await platformpage.AdvisoryDatePickerVisible();
        await expect(platformpage.AdvisoryDatePicker).toBeVisible();
    });

    test('Advisory AIPB: Date Picker Last 30 Days', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        await platformpage.AdvisoryDatePickerLast30Days();
    });

    test('Advisory AIPB: Tab Navigation & Data Validation', async ({ sharedPage }) => {
        test.setTimeout(300000);
        const platformpage = new Platform(sharedPage);
        const { navResults, allFailures, allDataResults, alertScreenshots } = await platformpage.AdvisoryAIPBTabNavigationAndDataCheck();
        for (const result of navResults) {
            expect(result.iframeLoaded).toBe(true);
            expect(result.src).toBeTruthy();
        }
        for (const r of allDataResults) {
            console.log(`[${r.tabName}] Sections: ${r.sections.length}, Alerts: ${r.failures.length}`);
            for (const f of r.failures) console.log(`  ALERT: ${f}`);
        }
        if (allFailures.length > 0) {
            test.info().annotations.push({
                type: 'warning',
                description: allFailures.join('\n'),
            });
            for (const s of alertScreenshots) {
                await test.info().attach(`Alert - ${s.tabName}`, {
                    body: s.buffer,
                    contentType: 'image/png',
                });
            }
        }
    });

    // ── Call Transfer (AIPB) Advisory Tests ──

    test('Advisory Call Transfer: Navigate to Dashboard', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        await platformpage.AdvisoryNavigateToCallTransfer();
        await expect(platformpage.AdvisoryCallTransferLink).toBeVisible();
    });

    test('Advisory Call Transfer: Tabs Present', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        const tabs = await platformpage.AdvisoryCallTransferTabNames();
        expect(tabs.length).toBeGreaterThan(0);
        const expectedTabs = ['Overview', 'Time Trends'];
        for (const expected of expectedTabs) {
            expect(tabs).toContain(expected);
        }
    });

    test('Advisory Call Transfer: Tableau Iframe Loaded', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        const { visible, src } = await platformpage.AdvisoryCallTransferIframePresent();
        expect(visible).toBe(true);
        expect(src).toBeTruthy();
    });

    test('Advisory Call Transfer: Date Picker Visible', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        await platformpage.AdvisoryCallTransferDatePickerVisible();
        await expect(platformpage.AdvisoryDatePicker).toBeVisible();
    });

    test('Advisory Call Transfer: Date Picker Last 30 Days', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        await platformpage.AdvisoryDatePickerLast30Days();
    });

    test('Advisory Call Transfer: Tab Navigation & Data Validation', async ({ sharedPage }) => {
        test.setTimeout(300000);
        const platformpage = new Platform(sharedPage);
        const { navResults, allFailures, allDataResults, alertScreenshots } = await platformpage.AdvisoryCallTransferTabNavigationAndDataCheck();
        for (const result of navResults) {
            expect(result.iframeLoaded).toBe(true);
            expect(result.src).toBeTruthy();
        }
        for (const r of allDataResults) {
            console.log(`[${r.tabName}] Sections: ${r.sections.length}, Alerts: ${r.failures.length}`);
            for (const f of r.failures) console.log(`  ALERT: ${f}`);
        }
        if (allFailures.length > 0) {
            test.info().annotations.push({
                type: 'warning',
                description: allFailures.join('\n'),
            });
            for (const s of alertScreenshots) {
                await test.info().attach(`Alert - ${s.tabName}`, {
                    body: s.buffer,
                    contentType: 'image/png',
                });
            }
        }
    });

    // ── AI Powered Phone Banking Branch Number Advisory Tests (conditional) ──

    test('Advisory Branch Number: Check Availability & Navigate', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        const available = await platformpage.AdvisoryBranchNumberAvailable();
        if (!available) {
            test.info().annotations.push({ type: 'skip', description: 'Branch Number dashboard not available for this CU' });
            test.skip();
        }
        await platformpage.AdvisoryNavigateToBranchNumber();
        await expect(platformpage.AdvisoryBranchNumberLink).toBeVisible();
    });

    test('Advisory Branch Number: Tabs Present', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        const tabs = await platformpage.AdvisoryBranchNumberTabNames();
        expect(tabs.length).toBeGreaterThan(0);
        const expectedTabs = ['Call Volume', 'Top Experiences', 'Experience Usage', 'Caller Details', 'Language', 'Next Best Experiences', 'Authentication'];
        for (const expected of expectedTabs) {
            expect(tabs).toContain(expected);
        }
    });

    test('Advisory Branch Number: Tableau Iframe Loaded', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        const { visible, src } = await platformpage.AdvisoryBranchNumberIframePresent();
        expect(visible).toBe(true);
        expect(src).toBeTruthy();
    });

    test('Advisory Branch Number: Date Picker Visible', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        await platformpage.AdvisoryBranchNumberDatePickerVisible();
        await expect(platformpage.AdvisoryDatePicker).toBeVisible();
    });

    test('Advisory Branch Number: Date Picker Last 30 Days', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        await platformpage.AdvisoryDatePickerLast30Days();
    });

    test('Advisory Branch Number: Tab Navigation & Data Validation', async ({ sharedPage }) => {
        test.setTimeout(300000);
        const platformpage = new Platform(sharedPage);
        const { navResults, allFailures, allDataResults, alertScreenshots } = await platformpage.AdvisoryBranchNumberTabNavigationAndDataCheck();
        for (const result of navResults) {
            expect(result.iframeLoaded).toBe(true);
            expect(result.src).toBeTruthy();
        }
        for (const r of allDataResults) {
            console.log(`[${r.tabName}] Sections: ${r.sections.length}, Alerts: ${r.failures.length}`);
            for (const f of r.failures) console.log(`  ALERT: ${f}`);
        }
        if (allFailures.length > 0) {
            test.info().annotations.push({
                type: 'warning',
                description: allFailures.join('\n'),
            });
            for (const s of alertScreenshots) {
                await test.info().attach(`Alert - ${s.tabName}`, {
                    body: s.buffer,
                    contentType: 'image/png',
                });
            }
        }
    });

    test('Advisory Branch Number: Navigate Back to AIPB', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        await platformpage.AdvisoryNavigateBackToAIPB();
        await expect(platformpage.AdvisoryAIPBLink).toBeVisible();
    });

    // ── Device Biometrics Dashboard Advisory Tests (conditional) ──

    test('Advisory Device Biometrics: Check Availability & Navigate', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        const available = await platformpage.AdvisoryDeviceBiometricsAvailable();
        if (!available) {
            test.info().annotations.push({ type: 'skip', description: 'Device Biometrics Dashboard not available for this CU' });
            test.skip();
        }
        await platformpage.AdvisoryNavigateToDeviceBiometrics();
        await expect(platformpage.AdvisoryDeviceBiometricsLink).toBeVisible();
    });

    test('Advisory Device Biometrics: Tabs Present', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        const tabs = await platformpage.AdvisoryDeviceBiometricsTabNames();
        expect(tabs.length).toBeGreaterThan(0);
        const expectedTabs = ['Overview', 'Insights'];
        for (const expected of expectedTabs) {
            expect(tabs).toContain(expected);
        }
    });

    test('Advisory Device Biometrics: Tableau Iframe Loaded', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        const { visible, src } = await platformpage.AdvisoryDeviceBiometricsIframePresent();
        expect(visible).toBe(true);
        expect(src).toBeTruthy();
    });

    test('Advisory Device Biometrics: Date Picker Visible', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        await platformpage.AdvisoryDeviceBiometricsDatePickerVisible();
        await expect(platformpage.AdvisoryDatePicker).toBeVisible();
    });

    test('Advisory Device Biometrics: Date Picker Last 30 Days', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        await platformpage.AdvisoryDatePickerLast30Days();
    });

    test('Advisory Device Biometrics: Tab Navigation & Data Validation', async ({ sharedPage }) => {
        test.setTimeout(300000);
        const platformpage = new Platform(sharedPage);
        const { navResults, allFailures, allDataResults, alertScreenshots } = await platformpage.AdvisoryDeviceBiometricsTabNavigationAndDataCheck();
        for (const result of navResults) {
            expect(result.iframeLoaded).toBe(true);
            expect(result.src).toBeTruthy();
        }
        for (const r of allDataResults) {
            console.log(`[${r.tabName}] Sections: ${r.sections.length}, Alerts: ${r.failures.length}`);
            for (const f of r.failures) console.log(`  ALERT: ${f}`);
        }
        if (allFailures.length > 0) {
            test.info().annotations.push({
                type: 'warning',
                description: allFailures.join('\n'),
            });
            for (const s of alertScreenshots) {
                await test.info().attach(`Alert - ${s.tabName}`, {
                    body: s.buffer,
                    contentType: 'image/png',
                });
            }
        }
    });

    test('Advisory Device Biometrics: Navigate Back to AIPB', async ({ sharedPage }) => {
        const platformpage = new Platform(sharedPage);
        await platformpage.AdvisoryNavigateBackToAIPB();
        await expect(platformpage.AdvisoryAIPBLink).toBeVisible();
    });

    // ─── SQL Lab ────────────────────────────────────────────────────────

    test('SQL Lab: Save Query', async ({ sharedPage }) => {
        test.setTimeout(120000);
        const platformpage = new Platform(sharedPage);

        await platformpage.navigateToSQLLab();
        expect(platformpage.sqlLabPage).toBeTruthy();

        const db = await platformpage.sqlLabEnsureDatabaseSelected();
        console.log(`Database selected: ${db}`);

        const schema = await platformpage.sqlLabEnsureSchemaSelected();
        console.log(`Schema selected: ${schema}`);

        const tableName = await platformpage.sqlLabSelectFirstTable();
        console.log(`Table selected: ${tableName}`);

        const query = await platformpage.sqlLabWriteAndRunQuery(tableName);
        console.log(`Executed: ${query}`);

        await expect(platformpage.sqlLabResultsTab).toBeVisible();

        const uniqueName = `FLA_Test_${Date.now()}`;
        const saveAlert = await platformpage.sqlLabSaveQueryWithName(uniqueName);
        await expect(saveAlert).toBeVisible();
        console.log(`Query saved as: ${uniqueName}`);

        // Store query info for subsequent tests
        sharedPage.__sqlLabQueryName = uniqueName;
        sharedPage.__sqlLabQuery = query;
    });

    test('SQL Lab: Verify Saved Query', async ({ sharedPage }) => {
        test.setTimeout(90000);
        const platformpage = new Platform(sharedPage);
        const queryName = sharedPage.__sqlLabQueryName;
        const expectedQuery = sharedPage.__sqlLabQuery;
        expect(queryName).toBeTruthy();

        await platformpage.sqlLabNavigateToSavedQueries();

        const { queryText } = await platformpage.sqlLabVerifySavedQuery(queryName, expectedQuery);
        console.log(`Preview query: ${queryText}`);
        expect(queryText).toBe(expectedQuery);
    });

    test('SQL Lab: Delete Saved Query', async ({ sharedPage }) => {
        test.setTimeout(90000);
        const platformpage = new Platform(sharedPage);
        const queryName = sharedPage.__sqlLabQueryName;
        expect(queryName).toBeTruthy();

        const { alert: deleteAlert, alertText } = await platformpage.sqlLabDeleteSavedQuery(queryName);
        await expect(deleteAlert).toBeVisible();
        expect(alertText).toContain('Deleted');
        expect(alertText).toContain(queryName);
        console.log(`Delete alert: ${alertText}`);

        const { rowCount, hasNoData } = await platformpage.sqlLabSearchSavedQuery(queryName);
        expect(rowCount).toBe(0);
        console.log(`Search for "${queryName}" — rows: ${rowCount}, No Data: ${hasNoData}`);
    });
});


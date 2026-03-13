import { test, expect } from '../fixtures/persistent-shared.js';
import PlatformSD from '../../pages/PlatformSD.js';

test.describe.serial('Platform SD Tests', async () => {
    test('SD: Navigate and Select SD', async ({ sharedPage }) => {
        const sdPage = new PlatformSD(sharedPage);
        await sdPage.goToLandingAndSelectSD();
        await expect(sdPage.SDSelection).toBeVisible();
    });
    test('SD: Select APT and Recent Conversations Check', async ({ sharedPage }) => {
        const sdPage = new PlatformSD(sharedPage);
        await sdPage.selectAPT();
        await expect(sdPage.APT).toBeVisible();
        await sdPage.APT.click();
        await expect(sdPage.RecentConversations).toBeVisible();
        await expect(sdPage.RecentConversations).toHaveAttribute('aria-selected', 'true');
    });

    test('SD: Widget API Call and Conversation Title Match', async ({ sharedPage }) => {
        test.setTimeout(90000);
        const sdPage = new PlatformSD(sharedPage);

        const { apiStatus } = await sdPage.callWidgetApiAndLoadConversations();
        expect(apiStatus).toBe(200);

        const leftTitle = (await sdPage.ConversationTitleLeftPane.textContent()).trim();
        const rightTitle = (await sdPage.ConversationTitleRightPane.textContent()).trim();
        console.log(`Left pane title: ${leftTitle}`);
        console.log(`Right pane title: ${rightTitle}`);
        expect(leftTitle).toEqual(rightTitle);
    });

    test('SD: Analyzed Conversations with Routing Keyword', async ({ sharedPage }) => {
        test.setTimeout(90000);
        const sdPage = new PlatformSD(sharedPage);

        await sdPage.analyzedConversationsWithRouting();

        await expect(sdPage.ResultsCount).toBeVisible();
        const countText = await sdPage.ResultsCount.textContent();
        const match = countText.match(/of\s+(\d+)/);
        expect(match).toBeTruthy();
        expect(Number(match[1])).toBeGreaterThan(0);
        console.log(`Analyzed results for "Routing": ${countText}`);

        await sdPage.ConversationTitleLeftPane.waitFor({ state: 'visible', timeout: 10000 });
        await sdPage.CallerIdentifier.click();
        await sdPage.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await sdPage.page.waitForTimeout(1500);

        const chatContent = await sdPage.page.evaluate(() => {
            const area = document.querySelector('.Conversations_mainComponent__3wNWB');
            return area ? area.innerText.toLowerCase() : '';
        });
        const hasRouting = chatContent.includes('routing');
        console.log(`Conversation contains "routing": ${hasRouting}`);
        expect(hasRouting).toBe(true);
    });

    test('SD: Date Range is Valid', async ({ sharedPage }) => {
        const sdPage = new PlatformSD(sharedPage);

        await expect(sdPage.StartDate).toBeVisible();
        await expect(sdPage.EndDate).toBeVisible();

        const start = await sdPage.StartDate.inputValue();
        const end = await sdPage.EndDate.inputValue();
        console.log(`Date range: ${start} to ${end}`);

        expect(start).toBeTruthy();
        expect(end).toBeTruthy();
        expect(new Date(start).getTime()).toBeLessThanOrEqual(new Date(end).getTime());
    });

    test('SD: Switch to Recent and Verify Results Count', async ({ sharedPage }) => {
        test.setTimeout(90000);
        const sdPage = new PlatformSD(sharedPage);

        await sdPage.switchToRecent();

        await expect(sdPage.ResultsCount).toBeVisible();
        const countText = await sdPage.ResultsCount.textContent();
        console.log(`Results: ${countText}`);
        const match = countText.match(/Showing\s+\d+\s*-\s*\d+\s+of\s+(\d+)/);
        expect(match).toBeTruthy();
        expect(Number(match[1])).toBeGreaterThan(0);
    });

    test('SD: Pagination Navigation', async ({ sharedPage }) => {
        const sdPage = new PlatformSD(sharedPage);

        const hasNext = await sdPage.PaginationNext.isVisible().catch(() => false);
        if (!hasNext) {
            console.log('No pagination on this page — skipping navigation');
            return;
        }

        const countBefore = await sdPage.ConversationListItems.count();
        expect(countBefore).toBeGreaterThan(0);

        await sdPage.PaginationNext.click();
        await sdPage.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await sdPage.page.waitForTimeout(1000);

        const countAfter = await sdPage.ConversationListItems.count();
        console.log(`Page 1: ${countBefore} items, Page 2: ${countAfter} items`);
        expect(countAfter).toBeGreaterThan(0);

        await sdPage.PaginationPrev.click();
        await sdPage.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    });

    test('SD: Conversation Details Sections Visible', async ({ sharedPage }) => {
        const sdPage = new PlatformSD(sharedPage);

        await sdPage.ConversationTitleLeftPane.waitFor({ state: 'visible', timeout: 10000 });
        await sdPage.CallerIdentifier.click();
        await sdPage.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await sdPage.page.waitForTimeout(1000);

        await expect(sdPage.ConversationDetails).toBeVisible();
        await expect(sdPage.AuthenticationDetails).toBeVisible();

        const durationLabel = sdPage.page.locator("//p[text()='Duration']");
        await expect(durationLabel).toBeVisible();
        console.log('Conversation Details, Duration, and Authentication Details sections are visible');
    });

    test('SD: Search Conversation by Interface ID', async ({ sharedPage }) => {
        test.setTimeout(60000);
        const sdPage = new PlatformSD(sharedPage);

        const firstTitle = (await sdPage.ConversationTitleLeftPane.textContent()).trim();
        console.log(`Searching for: ${firstTitle}`);

        await sdPage.SearchBox.click();
        await sdPage.SearchBox.clear();
        await sdPage.SearchBox.fill(firstTitle);
        await sdPage.SearchBox.press('Enter');
        await sdPage.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await sdPage.page.waitForTimeout(3000);

        let count = await sdPage.ConversationListItems.count();

        if (count === 0) {
            console.log('First search returned 0, retrying with View Conversations...');
            const viewBtn = sdPage.ViewConversations;
            if (await viewBtn.isVisible().catch(() => false)) {
                await viewBtn.click();
                await sdPage.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
                await sdPage.page.waitForTimeout(3000);
                count = await sdPage.ConversationListItems.count();
            }
        }

        if (count === 0) {
            console.log('Still 0 results, retrying search...');
            await sdPage.SearchBox.clear();
            await sdPage.page.waitForTimeout(1000);
            await sdPage.SearchBox.fill(firstTitle);
            await sdPage.page.keyboard.press('Enter');
            await sdPage.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
            await sdPage.page.waitForTimeout(3000);
            count = await sdPage.ConversationListItems.count();
        }

        console.log(`Search results: ${count}`);
        expect(count).toBeGreaterThan(0);

        const resultTitle = (await sdPage.ConversationTitleLeftPane.textContent()).trim();
        expect(resultTitle).toContain(firstTitle);
    });
});

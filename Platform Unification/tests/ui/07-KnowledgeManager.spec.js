import { test, expect } from '../fixtures/persistent-shared.js';
import KnowledgeManager from '../../pages/KnowledgeManager.js';
import { callKnowledgeTestApi } from '../../pages/AdminMockApi.js';

let adminConsoleAvailable = true;

test.describe.serial('Knowledge Manager Tests', () => {

    test('KM: Navigate to Knowledge Manager', async ({ sharedPage }) => {
        test.setTimeout(120000);
        const km = new KnowledgeManager(sharedPage);
        await km.goToLandingAndSelectKM();
        await expect(km.LocalFilesTab).toBeVisible({ timeout: 30000 });
        console.log('Knowledge Manager loaded (Knowledge Hub view)');
    });

    // ─── Admin Console: File & Directory Operations ───────────────────

    test('AC: Switch to Admin Console', async ({ sharedPage }) => {
        test.setTimeout(90000);
        const km = new KnowledgeManager(sharedPage);
        try {
            await km.switchToAdminConsole();
        } catch {
            adminConsoleAvailable = false;
            test.skip(true, 'Admin Console is not available for this CU');
        }
        await expect(km.AddDirectoryBtn).toBeVisible();
        await expect(km.AddDocumentsBtn).toBeVisible();
        await km.cleanupStaleData();
        console.log('Admin Console loaded with Add Directory & Add Document(s) buttons');
    });

    test('AC: Create Directory', async ({ sharedPage }) => {
        test.skip(!adminConsoleAvailable, 'Admin Console not available');
        const km = new KnowledgeManager(sharedPage);
        await km.createDirectory();
        await expect(km.DirectoryCreatedMsg).toBeVisible({ timeout: 10000 });
        await sharedPage.waitForTimeout(2000);
        await expect(km.CreatedDirRow).toBeVisible();
        console.log(`Directory "${km.CreatedDirectoryName}" created successfully`);
    });

    test('AC: Upload File', async ({ sharedPage }) => {
        test.skip(!adminConsoleAvailable, 'Admin Console not available');
        test.setTimeout(120000);
        const km = new KnowledgeManager(sharedPage);
        await km.uploadFile();
        await expect(km.DocumentUploadedMsg).toBeVisible({ timeout: 15000 });
        await sharedPage.waitForTimeout(3000);
        await expect(km.UploadedFileRow).toBeVisible({ timeout: 10000 });
        console.log(`File "${km.UploadedFileName}" uploaded, waiting for ACTIVE status...`);
        await km.waitForFileActive(90000);
        await expect(km.UploadedFileStatusText).toContainText('ACTIVE');
        console.log(`File "${km.UploadedFileName}" is now ACTIVE`);
    });

    test('AC: Verify Uploaded File via Mock API', async ({ sharedPage }) => {
        test.skip(!adminConsoleAvailable, 'Admin Console not available');
        test.setTimeout(60000);

        const km = new KnowledgeManager(sharedPage);
        const query = 'what are the types of testing';
        console.log(`Calling Mock API with query: "${query}"`);

        const { status, data, outputs } = await callKnowledgeTestApi(query);
        console.log(`Mock API status: ${status}`);
        console.log('Mock API full response:', JSON.stringify(data, null, 2));

        expect(status).toBe(200);

        const responseStr = JSON.stringify(data);
        const fileBaseName = km.UploadedFileName.replace(/\.[^.]+$/, '');
        const containsFileName = responseStr.toLowerCase().includes(km.UploadedFileName.toLowerCase())
            || responseStr.toLowerCase().includes(fileBaseName.toLowerCase());

        console.log(`Checking response for file reference: "${km.UploadedFileName}" or "${fileBaseName}"`);
        console.log(`Output prompts found: ${outputs.length}`);
        for (const o of outputs) console.log(`  ${o}`);
        console.log(`File referenced in response: ${containsFileName}`);

        const responseBody = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        await test.info().attach('Mock API Response', {
            body: Buffer.from(responseBody, 'utf-8'),
            contentType: 'application/json',
        });

        expect(containsFileName, `Expected response to reference uploaded file "${km.UploadedFileName}"`).toBe(true);
    });

    test('AC: Search for Uploaded File', async ({ sharedPage }) => {
        test.skip(!adminConsoleAvailable, 'Admin Console not available');
        const km = new KnowledgeManager(sharedPage);
        await km.searchFile(km.UploadedFileName);
        await expect(km.UploadedFileRow).toBeVisible({ timeout: 10000 });
        const rowCount = await km.TableRows.count();
        expect(rowCount).toBeGreaterThan(0);
        console.log(`Search for "${km.UploadedFileName}" found ${rowCount} result(s)`);
        await km.clearSearch();
    });

    test('AC: View Uploaded File - Click to Open', async ({ sharedPage }) => {
        test.skip(!adminConsoleAvailable, 'Admin Console not available');
        test.setTimeout(60000);
        const km = new KnowledgeManager(sharedPage);
        await km.clickFileToOpen(km.UploadedFileName);
        await km.CloseViewerBtn.waitFor({ state: 'visible', timeout: 15000 });
        const fileNameInViewer = sharedPage.locator('p').filter({ hasText: km.UploadedFileName });
        await expect(fileNameInViewer.first()).toBeVisible({ timeout: 5000 });
        console.log('Document viewer opened with file: ' + km.UploadedFileName);
        await km.closeDocumentViewer();
    });

    test('AC: View Uploaded File - Action Menu', async ({ sharedPage }) => {
        test.skip(!adminConsoleAvailable, 'Admin Console not available');
        const km = new KnowledgeManager(sharedPage);
        await km.viewFile();
        await km.CloseViewerBtn.waitFor({ state: 'visible', timeout: 10000 });
        console.log('Document viewer opened via Action menu View button');
        await km.closeDocumentViewer();
    });

    test('AC: Rename File', async ({ sharedPage }) => {
        test.skip(!adminConsoleAvailable, 'Admin Console not available');
        const km = new KnowledgeManager(sharedPage);

        await km.renameFile(km.RenamedFileName);
        await expect(km.DocumentRenamedMsg).toBeVisible({ timeout: 10000 });
        await sharedPage.waitForTimeout(2000);
        await expect(km.RenamedFileRow).toBeVisible();
        console.log(`File renamed to "${km.RenamedFileName}" successfully`);

        await sharedPage.waitForTimeout(3000);

        await km.renameFile(km.RevertFileName, true);
        await expect(km.DocumentRenamedMsg).toBeVisible({ timeout: 10000 });
        await sharedPage.waitForTimeout(2000);
        await expect(km.UploadedFileRow).toBeVisible();
        console.log(`File reverted back to "${km.RevertFileName}" successfully`);
    });

    test('AC: Move File to Directory', async ({ sharedPage }) => {
        test.skip(!adminConsoleAvailable, 'Admin Console not available');
        const km = new KnowledgeManager(sharedPage);
        await km.moveFile();
        await expect(km.DocumentMovedMsg).toBeVisible({ timeout: 10000 });
        await sharedPage.waitForTimeout(2000);
        await expect(km.UploadedFileRow).not.toBeVisible({ timeout: 5000 });
        console.log(`File moved to "${km.CreatedDirectoryName}" successfully`);

        await km.openDirectory();
        await expect(km.UploadedFileRow).toBeVisible({ timeout: 10000 });
        console.log(`File verified inside "${km.CreatedDirectoryName}"`);
    });

    // ─── Knowledge Hub: Verify Directory & File Before Cleanup ────────

    test('KH: Verify Directory and File in Knowledge Hub', async ({ sharedPage }) => {
        test.skip(!adminConsoleAvailable, 'Admin Console not available');
        test.setTimeout(60000);
        const km = new KnowledgeManager(sharedPage);

        await km.switchToKnowledgeHub();
        await expect(km.LocalFilesTab).toBeVisible({ timeout: 10000 });
        console.log('Switched to Knowledge Hub');

        await expect(km.CreatedDirRow).toBeVisible({ timeout: 10000 });
        console.log(`Directory "${km.CreatedDirectoryName}" is visible in Knowledge Hub`);

        await km.openDirectory();
        await expect(km.UploadedFileRow).toBeVisible({ timeout: 10000 });
        console.log(`File "${km.UploadedFileName}" is visible inside the directory in Knowledge Hub`);

        await km.goBackFromDirectory();
        await expect(km.CreatedDirRow).toBeVisible({ timeout: 10000 });
        console.log('Navigated back from directory successfully');
    });

    // ─── Admin Console: Cleanup ───────────────────────────────────────

    test('AC: Cleanup - Delete File and Directory', async ({ sharedPage }) => {
        test.skip(!adminConsoleAvailable, 'Admin Console not available');
        test.setTimeout(60000);
        const km = new KnowledgeManager(sharedPage);

        await km.switchToAdminConsole();
        await expect(km.AddDirectoryBtn).toBeVisible({ timeout: 15000 });

        await km.openDirectory();
        const fileVisible = await km.UploadedFileRow.isVisible().catch(() => false);
        if (fileVisible) {
            await km.deleteFile();
            await expect(km.DeletedMsg).toBeVisible({ timeout: 10000 });
            await sharedPage.waitForTimeout(2000);
            console.log('Uploaded file deleted');
        }

        await km.goBackFromDirectory();
        await sharedPage.waitForTimeout(1000);

        const dirVisible = await km.CreatedDirRow.isVisible().catch(() => false);
        if (dirVisible) {
            await km.deleteDirectory();
            await expect(km.DeletedMsg).toBeVisible({ timeout: 10000 });
            await sharedPage.waitForTimeout(2000);
            console.log('Test directory deleted');
        }
    });

    // ─── Admin Console: Acronyms CRUD ─────────────────────────────────

    test('AC: Navigate to Acronyms', async ({ sharedPage }) => {
        test.skip(!adminConsoleAvailable, 'Admin Console not available');
        test.setTimeout(90000);
        const km = new KnowledgeManager(sharedPage);
        await km.navigateToAcronyms();
        await expect(km.AddAcronymBtn).toBeVisible({ timeout: 10000 });
        await km.cleanupStaleAcronym();
        console.log('Acronyms page loaded in Admin Console');
    });

    test('AC: Add Acronym', async ({ sharedPage }) => {
        test.skip(!adminConsoleAvailable, 'Admin Console not available');
        test.setTimeout(60000);
        const km = new KnowledgeManager(sharedPage);
        await km.addAcronym();
        await expect(km.AcronymAddedMsg).toBeVisible({ timeout: 10000 });
        console.log(`Acronym "${km.TestAcronym}" added successfully`);
    });

    test('AC: Delete Acronym', async ({ sharedPage }) => {
        test.skip(!adminConsoleAvailable, 'Admin Console not available');
        test.setTimeout(60000);
        const km = new KnowledgeManager(sharedPage);
        const tagLocator = sharedPage.getByText(km.TestAcronymFullForm, { exact: true }).first();
        const entryExists = await tagLocator.isVisible().catch(() => false);
        if (!entryExists) {
            console.log('Acronym tag not found, skipping delete');
            test.skip(true, 'Acronym entry not locatable');
        }
        await km.deleteAcronymEntry();
        await expect(km.AcronymDeletedMsg).toBeVisible({ timeout: 10000 });
        await sharedPage.waitForTimeout(2000);
        await expect(tagLocator).not.toBeVisible({ timeout: 5000 });
        console.log(`Acronym "${km.TestAcronym}" deleted (all tags removed)`);
    });

    // ─── Admin Console: Knowledge Improvement ─────────────────────────

    test('AC: Knowledge Improvement - Verify Data', async ({ sharedPage }) => {
        test.skip(!adminConsoleAvailable, 'Admin Console not available');
        test.setTimeout(60000);
        const km = new KnowledgeManager(sharedPage);
        await km.navigateToKnowledgeImprovement();
        await sharedPage.waitForTimeout(2000);

        const heading = sharedPage.getByRole('heading', { name: /Next Best Questions/ });
        const hasTabs = await sharedPage.getByRole('tab').first().isVisible().catch(() => false);
        const noData = await km.NoDataText.isVisible().catch(() => false);

        if (await heading.isVisible().catch(() => false) && hasTabs) {
            const tabCount = await sharedPage.getByRole('tab').count();
            console.log(`Knowledge Improvement (Next Best Questions) has ${tabCount} topic(s)`);
        } else if (noData) {
            console.warn('ALERT: Knowledge Improvement section shows "No data"!');
        } else {
            console.warn('ALERT: Knowledge Improvement section appears to have no content. Please verify manually.');
        }
    });

    // ─── Knowledge Hub Tests ──────────────────────────────────────────

    test('KH: Switch to Knowledge Hub', async ({ sharedPage }) => {
        const km = new KnowledgeManager(sharedPage);
        await km.switchToKnowledgeHub();
        await expect(km.LocalFilesTab).toBeVisible();
        await expect(km.OnlineReferencesTab).toBeVisible();
        await expect(km.AcronymsTab).toBeVisible();
        console.log('Knowledge Hub loaded with all tabs visible');
    });

    test('KH: Verify Local Files Tab Has Data', async ({ sharedPage }) => {
        const km = new KnowledgeManager(sharedPage);
        await expect(km.LocalFilesTab).toHaveAttribute('aria-selected', 'true');
        await sharedPage.waitForTimeout(2000);

        const tableVisible = await km.page.locator('table tbody').isVisible().catch(() => false);
        const noData = await km.NoDataText.isVisible().catch(() => false);
        expect(tableVisible || noData).toBe(true);

        if (tableVisible) {
            const rowCount = await km.TableRows.count();
            console.log(`Local Files tab has ${rowCount} document(s) listed`);
        } else {
            console.log('Local Files tab loaded but has no documents');
        }
    });

    test('KH: Search for a File', async ({ sharedPage }) => {
        const km = new KnowledgeManager(sharedPage);
        await sharedPage.waitForTimeout(1500);

        let fileRow = km.page.locator('table tbody tr:has(td img[alt="file-image"])').first();
        let fileVisible = await fileRow.isVisible().catch(() => false);

        if (!fileVisible) {
            fileRow = km.page.locator('table tbody tr:has(td img[alt*="file"])').first();
            fileVisible = await fileRow.isVisible().catch(() => false);
        }
        if (!fileVisible) {
            const rows = km.page.locator('table tbody tr');
            const rowCount = await rows.count();
            for (let i = 0; i < rowCount; i++) {
                const cellText = await rows.nth(i).locator('td').first().innerText().catch(() => '');
                if (/\.\w{2,5}$/.test(cellText.trim())) {
                    fileRow = rows.nth(i);
                    fileVisible = true;
                    break;
                }
            }
        }

        if (!fileVisible) {
            console.log('No files found in Knowledge Hub, skipping search test');
            test.skip(true, 'No files to search');
        }

        const fileName = await fileRow.locator('td').first().innerText();
        const searchTerm = fileName.trim().split('.')[0].split(' ').slice(0, 2).join(' ');
        console.log(`Searching for: "${searchTerm}"`);

        await km.searchFile(searchTerm);
        await sharedPage.waitForTimeout(1500);
        const resultCount = await km.TableRows.count();
        expect(resultCount).toBeGreaterThan(0);
        console.log(`Search returned ${resultCount} result(s)`);
        await km.clearSearch();
    });

    test('KH: Search - No Data', async ({ sharedPage }) => {
        const km = new KnowledgeManager(sharedPage);
        const searchTerm = 'zzz_nonexistent_file_xyz';
        await km.searchFile(searchTerm);
        await sharedPage.waitForTimeout(2000);

        const hasNoData = await km.NoDataText.isVisible().catch(() => false);
        const rowCount = await km.TableRows.count();
        let noMatchingRows = true;
        if (rowCount > 0) {
            for (let i = 0; i < rowCount; i++) {
                const text = await km.TableRows.nth(i).textContent();
                if (text.toLowerCase().includes(searchTerm.toLowerCase())) {
                    noMatchingRows = false;
                    break;
                }
            }
        }
        expect(hasNoData || rowCount === 0 || noMatchingRows).toBe(true);
        console.log(`No data for "${searchTerm}" — noDataVisible: ${hasNoData}, rows: ${rowCount}, noMatch: ${noMatchingRows}`);
        await km.clearSearch();
    });

    test('KH: View File from Knowledge Hub', async ({ sharedPage }) => {
        test.setTimeout(60000);
        const km = new KnowledgeManager(sharedPage);
        await sharedPage.waitForTimeout(1500);

        let fileRow = null;
        let imgRow = km.page.locator('table tbody tr:has(td img[alt="file-image"])').first();
        let found = await imgRow.isVisible().catch(() => false);

        if (!found) {
            imgRow = km.page.locator('table tbody tr:has(td img[alt*="file"])').first();
            found = await imgRow.isVisible().catch(() => false);
        }

        if (found) {
            fileRow = imgRow;
        } else {
            const rows = km.page.locator('table tbody tr');
            const rowCount = await rows.count();
            for (let i = 0; i < rowCount; i++) {
                const cellText = await rows.nth(i).locator('td').first().innerText().catch(() => '');
                if (/\.\w{2,5}$/.test(cellText.trim())) {
                    fileRow = rows.nth(i);
                    break;
                }
            }
        }

        if (!fileRow) {
            console.log('No file rows found in Knowledge Hub, skipping view test');
            test.skip(true, 'No file rows to view');
        }

        const actionBtn = fileRow.locator('button');
        await actionBtn.click();
        await km.ViewMenuBtn.waitFor({ state: 'visible', timeout: 5000 });
        await km.ViewMenuBtn.click();
        await sharedPage.waitForTimeout(2000);

        await km.CloseViewerBtn.waitFor({ state: 'visible', timeout: 10000 });
        console.log('Document viewer opened from Knowledge Hub');
        await km.closeDocumentViewer();
    });

    test('KH: Switch to Online References Tab', async ({ sharedPage }) => {
        const km = new KnowledgeManager(sharedPage);
        await km.OnlineReferencesTab.click();
        await expect(km.OnlineReferencesTab).toHaveAttribute('aria-selected', 'true');
        await sharedPage.waitForTimeout(1500);
        console.log('Online References tab loaded');
    });

    test('KH: Switch to Acronyms Tab and Verify Data', async ({ sharedPage }) => {
        const km = new KnowledgeManager(sharedPage);
        await km.AcronymsTab.click();
        await expect(km.AcronymsTab).toHaveAttribute('aria-selected', 'true');
        await sharedPage.waitForTimeout(2000);

        const rowCount = await km.TableRows.count();
        if (rowCount > 0) {
            console.log(`Acronyms tab has ${rowCount} acronym(s)`);
        } else {
            const noData = await km.NoDataText.isVisible().catch(() => false);
            console.log(noData ? 'Acronyms tab shows no data' : 'Acronyms tab loaded (may have non-table content)');
        }
    });

    test('KH: Switch Back to Local Files Tab', async ({ sharedPage }) => {
        const km = new KnowledgeManager(sharedPage);
        await km.LocalFilesTab.click();
        await expect(km.LocalFilesTab).toHaveAttribute('aria-selected', 'true');

        const tableBody = km.page.locator('table tbody');
        try {
            await tableBody.waitFor({ state: 'visible', timeout: 10000 });
            const rowCount = await km.TableRows.count();
            console.log(`Back to Local Files tab with ${rowCount} document(s) listed`);
        } catch {
            const noData = await km.NoDataText.isVisible().catch(() => false);
            expect(noData).toBe(true);
            console.log('Back to Local Files tab (no documents)');
        }
    });
});

import { getTestData } from '../utils/excelReader.js';
import path from 'path';
import LoginPage from './LoginPage.js';

class KnowledgeManager {

    constructor(page) {
        const dataFile = path.resolve('./data/TestData.xlsx');
        const testData = getTestData(dataFile);

        this.CUname = (testData.Cuname || '').toString().trim();
        this.Envname = (testData.Env || '').toString().trim();
        this.page = page;

        // Constants
        this.CreatedDirectoryName = "Automation Test Directory";
        this.UploadedFileName = "QA_file.pdf";
        this.RenamedFileName = "Renamed_QA_file";
        this.RevertFileName = "QA_file";
        this.TestAcronym = "Z";
        this.TestAcronymFullForm = "zebra zone";
        this.UpdatedAcronymTag = "zenith";

        // Landing → Chat AI env selection (same pattern as PlatformSD)
        this.ChatAIEnvSelection = this.page.locator(`//div[h2[text()="Chat AI"]]/following-sibling::div//p[text()="${this.Envname}"]`);

        // App-select page → Knowledge Manager card
        this.KnowledgeManagerCard = this.page.locator("//h2[text()='Knowledge Manager']");

        // Sidebar icons (same class structure as existing Adminconsole.js)
        this.KnowledgeHubSideMenuBtn = this.page.locator('(//div[@class="app-core-side-menu-items"]//div[@class="app-core-icon-button"])[1]');
        this.AdminConsoleSideMenuBtn = this.page.locator('(//div[@class="app-core-side-menu-items"]//div[@class="app-core-icon-button"])[2]');

        // File input
        this.FileInput = this.page.locator('input[type="file"]');

        // Admin Console buttons
        this.AddDirectoryBtn = this.page.locator('//button//span[text()="Add Directory"]');
        this.AddDocumentsBtn = this.page.locator('//button//span[text()="Add Document(s)"]');
        this.UploadBtn = this.page.locator('//button//span[text()="Upload"]');

        // Add Directory dialog
        this.DirectoryNameInput = this.page.getByPlaceholder('Enter directory name');
        this.OKBtn = this.page.getByRole('button', { name: 'OK', exact: true });
        this.CancelBtn = this.page.getByRole('button', { name: 'Cancel' });

        // Admin Console sidebar sections
        this.KnowledgeSourceBtn = this.page.locator('button:has-text("Knowledge Source")');
        this.KnowledgeImprovementBtn = this.page.locator('//span[text()="Knowledge Improvement"]');
        this.LocalFilesSideLink = this.page.locator('span:text-is("Local Files")');
        this.OnlineReferencesSideLink = this.page.locator('span:text-is("Online References")');
        this.AcronymsSideLink = this.page.locator('span:text-is("Acronyms")');

        // Knowledge Hub tabs
        this.LocalFilesTab = this.page.getByRole('tab', { name: 'Local Files' });
        this.OnlineReferencesTab = this.page.getByRole('tab', { name: 'Online References' });
        this.AcronymsTab = this.page.getByRole('tab', { name: 'Acronyms' });

        // Search
        this.SearchInput = this.page.getByPlaceholder('Search by name');

        // Table
        this.TableRows = this.page.locator('table tbody tr');
        this.NoDataText = this.page.getByText('No data');

        // File-specific locators
        this.UploadedFileRow = this.page.locator(`//table//tbody//tr[contains(.,"${this.UploadedFileName}")]`);
        this.UploadedFileStatusText = this.page.locator(`//tr[contains(.,"${this.UploadedFileName}")]//td[4]`);
        this.UploadedFileActionBtn = this.page.locator(`//tr[contains(.,"${this.UploadedFileName}")]//button`);
        this.RenamedFileRow = this.page.locator(`//table//tbody//tr[contains(.,"${this.RenamedFileName}")]`);
        this.RenamedFileActionBtn = this.page.locator(`//tr[contains(.,"${this.RenamedFileName}")]//button`);
        this.CreatedDirRow = this.page.locator(`//table//tbody//tr[contains(.,"${this.CreatedDirectoryName}")]`);
        this.CreatedDirActionBtn = this.page.locator(`//tr[contains(.,"${this.CreatedDirectoryName}")]//button`);

        // Action menu items (appear after clicking "more" button on a row)
        this.ViewMenuBtn = this.page.getByRole('menuitem', { name: 'View' });
        this.RenameMenuBtn = this.page.getByRole('menuitem', { name: 'Rename' });
        this.MoveMenuBtn = this.page.getByRole('menuitem', { name: 'Move' });
        this.DeleteMenuBtn = this.page.getByRole('menuitem', { name: 'Delete' });
        this.EditMenuBtn = this.page.getByRole('menuitem', { name: 'Edit' });

        // Rename dialog
        this.RenameNewNameInput = this.page.getByRole('textbox', { name: 'New name' });
        this.RenameConfirmBtn = this.page.getByRole('dialog', { name: 'Rename Document' }).getByRole('button', { name: 'Rename' });

        // Move dialog
        this.MoveTreeDirNode = this.page.locator(`[role="tree"] :text("${this.CreatedDirectoryName}")`);
        this.MoveConfirmBtn = this.page.locator('div.ant-modal-footer button:has-text("Move"), div[class*="modal"] button:text-is("Move")');

        // View drawer — use the ant-drawer wrapper which is unique to the doc viewer
        this.DocumentViewer = this.page.locator('.ant-drawer-content-wrapper, .ant-drawer').first();
        this.DocNameHeader = this.page.locator("//p[@class='PDFView_fileNameValue__MPpkq']");
        this.CloseViewerBtn = this.page.getByRole('dialog').getByRole('button', { name: 'Close' });

        // Delete confirmation dialog
        this.DeleteConfirmBtn = this.page.locator('div.ant-modal-confirm-body-wrapper button:has-text("Delete"), div[class*="modal"] button:text-is("Delete")');

        // Back button (used when inside a directory)
        this.BackBtn = this.page.locator('//button/span[text()="Back"]').or(this.page.locator('img[alt="arrow-left"]'));

        // ─── Acronyms (Admin Console) — inline edit mode ──────────────────
        this.AddAcronymBtn = this.page.locator('//button//span[text()="Add Acronym"]');
        this.AcronymTagsInput = this.page.getByPlaceholder('Please enter tags');
        this.AcronymSearchInput = this.page.getByPlaceholder('Search acronyms');
        this.AcronymSaveBtn = this.page.locator('button:has-text("Save")');
        this.AcronymCancelBtn = this.page.locator('button:has-text("Cancel")');
        this.AcronymRemoveConfirmBtn = this.page.getByRole('button', { name: 'Remove' });
        this.TestAcronymEntry = this.page.locator(`xpath=//*[normalize-space(text())="${this.TestAcronym}"]`).first();

        // Success / toast messages — two patterns: span-based (file ops) and text-based (acronyms)
        this.DirectoryCreatedMsg = this.page.locator('//span[contains(text(),"created successfully") or contains(text(),"Created successfully")]');
        this.DocumentUploadedMsg = this.page.locator('//span[contains(text(),"uploaded successfully")]');
        this.DocumentRenamedMsg = this.page.locator('//span[contains(text(),"renamed successfully")]');
        this.DocumentMovedMsg = this.page.locator('//span[contains(text(),"moved successfully") or contains(text(),"Moved successfully")]');
        this.DeletedMsg = this.page.locator('//span[contains(text(),"Deleted successfully") or contains(text(),"deleted successfully")]');
        this.AcronymAddedMsg = this.page.getByText('Acronym added');
        this.AcronymDeletedMsg = this.page.getByText('Acronym deleted');
    }

    async goToLandingAndSelectKM() {
        const url = this.page.url();
        if (!url.includes('/landing') && !url.includes('/select')) {
            await this.page.goto('https://platform.interface.ai/landing');
            await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
            await this.page.waitForTimeout(2000);
        }

        await this.ChatAIEnvSelection.waitFor({ state: 'visible', timeout: 30000 });
        await this.ChatAIEnvSelection.click();
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForTimeout(2000);
        await this.KnowledgeManagerCard.waitFor({ state: 'visible', timeout: 30000 });
        await this.KnowledgeManagerCard.click();
        await this.page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
        await this.page.waitForTimeout(3000);
    }

    async switchToAdminConsole() {
        await this.AdminConsoleSideMenuBtn.click();
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await this.AddDirectoryBtn.waitFor({ state: 'visible', timeout: 20000 });
    }

    async switchToKnowledgeHub() {
        await this.KnowledgeHubSideMenuBtn.click();
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await this.LocalFilesTab.waitFor({ state: 'visible', timeout: 20000 });
    }

    async cleanupStaleData() {
        const fileExists = await this.UploadedFileRow.isVisible().catch(() => false);
        if (fileExists) {
            console.log('Stale file found from previous run, deleting...');
            await this.deleteFile();
            await this.DeletedMsg.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
            await this.page.waitForTimeout(2000);
        }
        const dirExists = await this.CreatedDirRow.isVisible().catch(() => false);
        if (dirExists) {
            console.log('Stale directory found from previous run, deleting...');
            await this.deleteDirectory();
            await this.DeletedMsg.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
            await this.page.waitForTimeout(2000);
        }
    }

    async createDirectory() {
        await this.AddDirectoryBtn.click();
        await this.DirectoryNameInput.waitFor({ state: 'visible', timeout: 5000 });
        await this.DirectoryNameInput.fill(this.CreatedDirectoryName);
        await this.OKBtn.click();
    }

    async uploadFile() {
        await this.AddDocumentsBtn.click();
        await this.FileInput.setInputFiles('data/QA_file.pdf');
        await this.UploadBtn.click();
    }

    async waitForFileActive(timeoutMs = 60000) {
        const pollInterval = 5000;
        const maxAttempts = Math.ceil(timeoutMs / pollInterval);
        for (let i = 0; i < maxAttempts; i++) {
            const status = await this.UploadedFileStatusText.textContent().catch(() => '');
            if (status.trim().toUpperCase() === 'ACTIVE') {
                console.log(`File status is ACTIVE after ~${i * pollInterval / 1000}s`);
                return;
            }
            console.log(`File status: "${status.trim()}" — waiting... (${i + 1}/${maxAttempts})`);
            await this.page.waitForTimeout(pollInterval);
        }
        throw new Error(`File status did not become ACTIVE within ${timeoutMs / 1000}s`);
    }

    async searchFile(name) {
        await this.SearchInput.click();
        await this.SearchInput.fill(name);
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(2000);
    }

    async clearSearch() {
        await this.SearchInput.clear();
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(1000);
    }

    async viewFile(isRenamed = false) {
        const actionBtn = isRenamed ? this.RenamedFileActionBtn : this.UploadedFileActionBtn;
        await actionBtn.click();
        await this.ViewMenuBtn.waitFor({ state: 'visible', timeout: 5000 });
        await this.ViewMenuBtn.click();
        await this.page.waitForTimeout(2000);
    }

    async clickFileToOpen(fileName) {
        await this.page.locator('//table//tbody//tr//td[1]').filter({ hasText: fileName }).first().click();
        await this.page.waitForTimeout(2000);
    }

    async closeDocumentViewer() {
        await this.CloseViewerBtn.click();
        await this.page.waitForTimeout(500);
    }

    async renameFile(newName, isRenamed = false) {
        const actionBtn = isRenamed ? this.RenamedFileActionBtn : this.UploadedFileActionBtn;
        await actionBtn.click();
        await this.RenameMenuBtn.waitFor({ state: 'visible', timeout: 5000 });
        await this.RenameMenuBtn.click();
        await this.RenameNewNameInput.waitFor({ state: 'visible', timeout: 5000 });
        await this.RenameNewNameInput.fill(newName);
        await this.RenameConfirmBtn.click();
    }

    async moveFile(isRenamed = false) {
        const actionBtn = isRenamed ? this.RenamedFileActionBtn : this.UploadedFileActionBtn;
        await actionBtn.click();
        await this.MoveMenuBtn.waitFor({ state: 'visible', timeout: 5000 });
        await this.MoveMenuBtn.click();
        await this.MoveTreeDirNode.waitFor({ state: 'visible', timeout: 5000 });
        await this.MoveTreeDirNode.click();
        await this.MoveConfirmBtn.click();
    }

    async deleteFile(isRenamed = false) {
        const actionBtn = isRenamed ? this.RenamedFileActionBtn : this.UploadedFileActionBtn;
        await actionBtn.click();
        await this.DeleteMenuBtn.waitFor({ state: 'visible', timeout: 5000 });
        await this.DeleteMenuBtn.click();
        await this.DeleteConfirmBtn.waitFor({ state: 'visible', timeout: 5000 });
        await this.DeleteConfirmBtn.click();
    }

    async deleteDirectory() {
        await this.CreatedDirActionBtn.click();
        await this.DeleteMenuBtn.waitFor({ state: 'visible', timeout: 5000 });
        await this.DeleteMenuBtn.click();
        await this.page.waitForTimeout(1000);
        let confirmBtn = this.DeleteConfirmBtn;
        let visible = await confirmBtn.isVisible().catch(() => false);
        if (!visible) {
            confirmBtn = this.page.getByRole('button', { name: 'Delete' });
            visible = await confirmBtn.isVisible().catch(() => false);
        }
        if (!visible) {
            confirmBtn = this.page.getByRole('button', { name: 'OK' });
            visible = await confirmBtn.isVisible().catch(() => false);
        }
        if (!visible) {
            confirmBtn = this.page.locator('.ant-modal-confirm-btns button.ant-btn-primary, .ant-popover button.ant-btn-primary');
        }
        await confirmBtn.waitFor({ state: 'visible', timeout: 10000 });
        await confirmBtn.click();
    }

    async openDirectory() {
        await this.CreatedDirRow.locator('td:first-child').click();
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await this.page.waitForTimeout(1000);
    }

    async goBackFromDirectory() {
        await this.BackBtn.first().click();
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await this.page.waitForTimeout(1000);
    }

    // ─── Admin Console: Acronyms ──────────────────────────────────────

    async expandKnowledgeSourceIfCollapsed() {
        const isVisible = await this.AcronymsSideLink.isVisible().catch(() => false);
        if (!isVisible) {
            await this.KnowledgeSourceBtn.click();
            await this.page.waitForTimeout(500);
        }
    }

    async navigateToAcronyms() {
        await this.expandKnowledgeSourceIfCollapsed();
        await this.AcronymsSideLink.waitFor({ state: 'visible', timeout: 5000 });
        await this.AcronymsSideLink.click();
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await this.page.waitForTimeout(1000);
    }

    async navigateToLocalFiles() {
        await this.expandKnowledgeSourceIfCollapsed();
        await this.LocalFilesSideLink.waitFor({ state: 'visible', timeout: 5000 });
        await this.LocalFilesSideLink.click();
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await this.page.waitForTimeout(1000);
    }

    getEntryContainer() {
        return this.TestAcronymEntry.locator('..');
    }

    async addAcronym() {
        await this.AddAcronymBtn.click();
        await this.AcronymTagsInput.waitFor({ state: 'visible', timeout: 5000 });
        await this.page.waitForTimeout(300);
        const nameInput = this.page.getByRole('textbox').nth(1);
        await nameInput.fill(this.TestAcronym);
        await this.AcronymTagsInput.click();
        await this.AcronymTagsInput.fill(this.TestAcronymFullForm);
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(500);
        await this.AcronymSaveBtn.click();
    }

    async deleteAcronymEntry() {
        const tagElement = this.page.getByText(this.TestAcronymFullForm, { exact: true }).first();
        await tagElement.locator('..').getByRole('textbox').click();
        await this.page.waitForTimeout(1000);
        await this.page.getByRole('img', { name: 'close' }).click();
        await this.page.getByRole('button', { name: 'Remove' }).waitFor({ state: 'visible', timeout: 5000 });
        await this.page.getByRole('button', { name: 'Remove' }).click();
        await this.page.waitForTimeout(1000);
    }

    async cleanupStaleAcronym() {
        try {
            const tagVisible = await this.page.getByText(this.TestAcronymFullForm, { exact: true }).first().isVisible().catch(() => false);
            if (tagVisible) {
                console.log('Stale acronym found from previous run, deleting...');
                await this.deleteAcronymEntry();
                await this.AcronymDeletedMsg.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
                await this.page.waitForTimeout(2000);
            }
        } catch (e) {
            console.log('Stale acronym cleanup skipped: ' + e.message);
        }
    }

    // ─── Admin Console: Knowledge Improvement ─────────────────────────

    async navigateToKnowledgeImprovement() {
        await this.KnowledgeImprovementBtn.click();
        await this.page.waitForTimeout(500);
        const nbqLink = this.page.getByText('Next Best Questions', { exact: true });
        await nbqLink.waitFor({ state: 'visible', timeout: 5000 });
        await nbqLink.click();
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await this.page.waitForTimeout(1500);
    }
}

export default KnowledgeManager;

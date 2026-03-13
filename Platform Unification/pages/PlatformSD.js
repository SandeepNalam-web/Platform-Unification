import test from "@playwright/test";
import { getTestData } from "../utils/excelReader";
import path from 'path';
import LoginPage from "./LoginPage.js";
import { callWidgetMockApi } from "./AdminMockApi.js";


class PlatformSD{
    constructor(page){  
        const dataFile = path.resolve('./data/TestData.xlsx');
        const testData = getTestData(dataFile);

        this.CUname = testData.Cuname;
        this.Envname = testData.Env;
        this.page = page;
        this.baseURL = "https://platform.interface.ai/login";
        this.CuHeaderName = testData.CuHeader;

        // Locators
        this.SDSelection = this.page.locator(`//div[h2[text()="Chat AI"]]/following-sibling::div//p[text()="${this.Envname}"]`);
        this.APT = this.page.locator("//div[@class='AppSelectBlock_appSelectBlockTitle__2AFfr']//h2[text()='APT']");
        // CU header on app-select page (to verify correct CU is selected)
        this.CuSelectedHeader = this.page.locator(`//div//h2[text()="${this.CuHeaderName}"]`);
        this.RecentConversations = this.page.locator("//div[text()='Recent Conversations']");
        this.ViewConversations = this.page.getByRole('button', { name: 'View Conversations' });
        this.ConversationTitleLeftPane = this.page.locator("//div[@class='ConversationList_conversationTitle__1OYDj']//p").first();
        this.ChatIdentifierBtn = this.page.locator("//p[text()='Chat Identifier']");
        this.ConversationTitleRightPane = this.page.locator("//div[@class='Profile_interfaceIdValue__3A9ig']//p");
        this.CallerIdentifier = this.page.locator("//div[@class='ConversationList_conversationTitle__1OYDj']").first();
        this.RecentDropdown = this.page.locator(".ant-select-selector").first();
        this.AnalyzedOption = this.page.locator("//div[text()='Analyzed']");
        this.FilterIcon = this.page.locator(".SearchWithFilter_filterIcon__2QdE4");
        this.FilterKeywordInput = this.page.getByPlaceholder('Type Keywords (Optional)');
        this.InputConversations = this.page.locator("//div[@style='text-align: left;']//div[@class='text-template']//span");
        this.ResultsCount = this.page.locator("//p[contains(text(),'Showing')]");
        this.ConversationListItems = this.page.locator("//div[@class='ConversationList_conversationTitle__1OYDj']");
        this.PaginationNext = this.page.locator("li[title='Next Page'] button");
        this.PaginationPrev = this.page.locator("li[title='Previous Page'] button");
        this.SearchBox = this.page.getByPlaceholder('Search by interface id / live chat id');
        this.StartDate = this.page.getByPlaceholder('Start date');
        this.EndDate = this.page.getByPlaceholder('End date');
        this.ConversationDetails = this.page.locator("//p[text()='Conversation Details']");
        this.AuthenticationDetails = this.page.locator("//p[text()='Authentication Details']");
        this.DurationValue = this.page.locator("//p[text()='Duration']/following-sibling::p");
        this.ClearAllFilters = this.page.locator("text=Clear All Filters");
        this.RecentOption = this.page.locator("//div[text()='Recent']");
        this.NoResultsFound = this.page.locator("text=No results found");
    }

    async goToLandingAndSelectSD(){
        const url = this.page.url();
        if (!url.includes('/landing') && !url.includes('/select')) {
            await this.page.goto('https://platform.interface.ai/landing');
            await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
            await this.page.waitForTimeout(2000);
        }
        await this.SDSelection.waitFor({ state: 'visible', timeout: 30000 });
        await this.SDSelection.click();
    }
    async selectAPT(){
        await this.page.waitForLoadState('domcontentloaded');
        await this.APT.waitFor({ state: 'visible', timeout: 60000 });
    }

    async callWidgetApiAndLoadConversations() {
        const { status, data } = await callWidgetMockApi();
        console.log('Widget Mock API response:', status, data);
        await this.ViewConversations.waitFor({ state: 'visible', timeout: 15000 });
        await this.ViewConversations.click();
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await this.ConversationTitleLeftPane.waitFor({ state: 'visible', timeout: 15000 });
        await this.CallerIdentifier.click();
        await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await this.page.waitForTimeout(2000);

        await this.ChatIdentifierBtn.waitFor({ state: 'visible', timeout: 15000 });
        await this.ChatIdentifierBtn.click();
        await this.page.waitForTimeout(1000);
        await this.ConversationTitleRightPane.waitFor({ state: 'visible', timeout: 10000 });

        return { apiStatus: status, apiData: data };
    }

    async switchToRecent() {
        await this.RecentDropdown.click();
        await this.RecentOption.waitFor({ state: 'visible', timeout: 10000 });
        await this.RecentOption.click();
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

        const clearVisible = await this.ClearAllFilters.isVisible().catch(() => false);
        if (clearVisible) await this.ClearAllFilters.click();

        await this.ViewConversations.click({ force: true });
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await this.page.waitForTimeout(1000);
    }

    async analyzedConversationsWithRouting() {
        await this.RecentDropdown.click();
        await this.AnalyzedOption.waitFor({ state: 'visible', timeout: 10000 });
        await this.AnalyzedOption.click();
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

        await this.FilterIcon.waitFor({ state: 'visible', timeout: 10000 });
        await this.FilterIcon.click();
        await this.page.waitForTimeout(500);

        await this.FilterKeywordInput.waitFor({ state: 'visible', timeout: 10000 });
        await this.FilterKeywordInput.fill('Routing');
        await this.page.waitForTimeout(500);

        await this.ViewConversations.waitFor({ state: 'visible', timeout: 10000 });
        await this.ViewConversations.click();
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await this.page.waitForTimeout(2000);
    }
}

export default PlatformSD;

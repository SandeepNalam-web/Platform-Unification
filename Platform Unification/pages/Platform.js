import test from "@playwright/test";
import { getTestData } from "../utils/excelReader";
import path from 'path';
import LoginPage from "./LoginPage.js";
import { callAdminMockApi } from "./AdminMockApi.js";


class Platform{
    constructor(page){  
        const dataFile = path.resolve('./data/TestData.xlsx'); // adjust path
        const testData = getTestData(dataFile);

this.CUname = testData.Cuname ;
this.Envname  = testData.Env;
this.page = page;
this.baseURL= "https://platform.interface.ai/login";
this.CuHeaderName= testData.CuHeader;

//Buttons
this.AIPBSelection = this.page.locator(`//div[h2[text()="Voice AI"]]/following-sibling::div//p[text()="${this.Envname}"]`);
this.APT = this.page.locator("//div[@class='AppSelectBlock_appSelectBlockTitle__2AFfr']//h2[text()='APT']");
this.Automation = this.page.locator("//div[@class='AppSelectBlock_appSelectBlockTitle__2AFfr']//h2[text()='Automation']");
this.EventManager = this.page.locator("//div[@class='AppSelectBlock_appSelectBlockTitle__2AFfr']//h2[text()='Event Manager']");
this.Advisory = this.page.locator("//div[@class='AppSelectBlock_appSelectBlockTitle__2AFfr']//h2[text()='Advisory']");
this.EnvSelector = this.page.locator("a[href='/app/select']");
this.ConversationsList = this.page.locator(".ant-select-selection-item").first();
this.RecentConversationsList = this.page.locator("//div[text()='Recent']");
this.ViewConversationBtn = this.page.locator("//span[text()='View Conversations']");
this.RecentConversations = this.page.locator("//div[text()='Recent Conversations']");
this.AnalyzedConversations = this.page.locator("//div[@data-node-key='analyzed_conversations']");
this.ExpNameFilter = this.page.locator("//div[@class='SearchWithFilter_filterOptionsOpen__35afl']//div[3]//input");
// Ant-select combobox scoped to the experience filter (3rd div in filter options)
this.ExpNameCombobox = this.page.locator("//div[@class='SearchWithFilter_filterOptionsOpen__35afl']//div[3]").locator('input.ant-select-selection-search-input[role="combobox"]');
this.ExpList = this.page.locator(".rc-virtual-list-holder-inner");
this.ExpSelection = this.page.locator("//div[text()='Routing Number']");
this.SearchConversationsBtn = this.page.locator(".ConversationDetail_conversationSearchContainer__3Q51-");
this.SearchInput = this.page.locator("#searchInput");
this.ConversationWindow = this.page.locator("#chatlist");
this.InputConversations = this.page.locator("//div[@style='text-align: left;']//div[@class='text-template']//span");
this.ConversationIDLeftPane = this.page.locator("//div[@class='ConversationList_conversationTitle__1OYDj']//p").first();
this.CallerIdentifier = this.page.locator("//p[text()='Call Identifier']");
this.ConversationIDRightPane = this.page.locator("//div[@class='Profile_interfaceIdValue__3A9ig']//p");
this.FromPhoneLeftPane = this.page.locator("//div[@class='ConversationList_conversationDescription__MBILI']//p").first();
this.FromPhoneRightPane = this.page.locator("//div[@class='panel_rowValue__1sU-C']//p").first();
this.AutomationDatePicker = this.page.locator(".ant-picker.ant-picker-range");
this.AutomationforLastmonth = this.page.locator("//span[text()='Last month']");
this.AdminDropdown = this.page.locator("//span[@title='Admin'] | //span[text()='Admin']").first();
this.AutomationDropdownOption = this.page.locator("//div[text()='Automation'] | //div[@title='Automation']").first();
this.StartDate = this.page.getByPlaceholder('Start date');
this.EndDate = this.page.getByPlaceholder('End date');
this.refreshbutton = this.page.locator("//div[@class='AutomationReport_container_reportButton__29DRf'][1]");
this.NoofCalls = this.page.locator(".SummaryBlock_summaryBlockContainer__2BG-F h1").first();
this.NewEventButton = this.page.locator("//span[text()='Add Event']");
this.EventName = this.page.locator("#name");
this.HolidayMessageEnglish = this.page.locator("//textarea[@id='holidayGreetingMessage']");
this.HolidayMessageSpanish = this.page.locator("//textarea[@id='holidaySpanishGreetingMessage']");
this.HolidayDateRange = this.page.locator("#holidayGreetingMessageDateRange");
this.TodaysDateinDatePicker = this.page.locator(".ant-picker-cell.ant-picker-cell-in-view.ant-picker-cell-today");
this.OkButtoninDatePicker = this.page.locator(".ant-btn.ant-btn-primary.ant-btn-sm");
this.SaveEventButton = this.page.locator("//button[@type='submit']");
this.CancelEventButton = this.page.locator("//span[text()='Cancel']");
this.PublishEventButton = this.page.locator("//span[text()='Publish']");
this.PublishedEvent = this.page.locator("//span[text()='Published successfully.']");
this.EventNamePostSearch = this.page.locator("//td[@class='ant-table-cell']//div").first();
this.EventDeleteButton = this.page.locator("//span[@aria-label='delete']").first();
this.ConfirmDeleteButton = this.page.locator("//span[text()='Delete']");
this.NoEventFound = this.page.locator("//div[text()='No data']");
this.TotalCalls = this.page.locator("//p[text()='Total Calls']/preceding-sibling::h1");
// Scope to "Total Call Breakdown" section only (not "Automation Breakdown")
this.TotalCallBreakdownSection = this.page.locator('div').filter({ hasText: /^Total Call Breakdown$/ }).locator('..');
this.Callswithquestion = this.TotalCallBreakdownSection.locator("div.AutomationReport_count__3sbK5 > a[href*='filter=included']").first();
this.Callswithoutquestion = this.TotalCallBreakdownSection.locator("div.AutomationReport_count__3sbK5 > a[href*='filter=no_banking']").first();
// All breakdown count links within Total Call Breakdown (handles single or multiple columns)
this.AllBreakdownCounts = this.TotalCallBreakdownSection.locator("div.AutomationReport_count__3sbK5 > a");
// Login page (for Unregistered Email ID check - no session)
this.LoginEmailInput = this.page.getByPlaceholder("Enter your work email address");
this.LoginContinueBtn = this.page.locator("//span[text()='Continue']");
this.UnregisteredEmailError = this.page.locator("//div//span[text()='No account found with this email address. Please enter a valid email address.']");
this.DuplicateEventAlert = this.page.locator("//span[contains(text(),'Duplicate event')]");

// Advisory page locators (CU-agnostic) — card content lives inside an iframe
this.AdvisoryHeading = this.page.locator('h2').filter({ hasText: /Advisory/i }).first();
this.AdvisoryIframe = this.page.frameLocator('iframe[name="tableau-viz-AIPoweredPhoneBanking"]');
this.AdvisoryCardTitles = this.AdvisoryIframe.locator("//span[text()='Total Calls'] | //span[text()='Total After Hours Calls'] | //span[text()='Calls transferred to Contact Center'] | //span[text()='Average Call Handling Time of AI'] | //span[text()='Total AI usage'] | //span[text()='Blank Calls']");
this.AdvisoryCardCanvases = this.AdvisoryIframe.locator('canvas');
this.AdvisoryStartDate = this.page.getByPlaceholder('Start date / time');
this.AdvisoryLast30Days = this.page.getByText('Last 30 days');
this.AdvisoryApplyBtn = this.page.locator("//button[contains(.,'Apply')]");
this.AdvisoryTabs = this.page.locator('[role="tablist"] [role="tab"]');

// Advisory sidebar dashboard links
this.AdvisorySidebarLinks = this.page.locator('list >> link');
this.AdvisoryAIPBLink = this.page.getByRole('link', { name: 'AI Powered Phone Banking', exact: true });
this.AdvisoryCallTransferLink = this.page.getByRole('link', { name: 'Call Transfer (AIPB)', exact: true });
this.AdvisoryBranchNumberLink = this.page.getByRole('link', { name: 'AI Powered Phone Banking Branch Number', exact: true });
this.AdvisoryDeviceBiometricsLink = this.page.getByRole('link', { name: 'Device Biometrics Dashboard', exact: true });

// Advisory — generic iframe (picks up whichever Tableau viz is currently loaded)
this.AdvisoryActiveIframe = this.page.locator('iframe').first();

// Advisory reload / download buttons
this.AdvisoryReloadBtn = this.page.locator('button').filter({ has: this.page.locator('img[alt="reload"]') });
this.AdvisoryDownloadBtn = this.page.locator('button').filter({ has: this.page.locator('img[alt="download"]') });

// Advisory date picker
this.AdvisoryDatePicker = this.page.locator('.ant-picker.ant-picker-range');

// SQL Lab — card on app selector (same pattern as Advisory / APT / etc.)
this.SQLLab = this.page.locator("//div[@class='AppSelectBlock_appSelectBlockTitle__2AFfr']//h2[text()='SQL Lab']");
this.sqlLabPage = this.page.__sqlLabPage || null;
if (this.sqlLabPage) this._initSqlLabLocators();
}
async UnregisteredEmailIDCheck()
{
    await this.page.goto(this.baseURL, { timeout: 120000 });
    await this.LoginEmailInput.waitFor({ state: 'visible', timeout: 60000 });
    await this.LoginEmailInput.fill('nalamsai.sandeep@interface.com');
    await this.LoginContinueBtn.click();
}
async goToLandingAndSelectAIPB(){
    const url = this.page.url();
    if (!url.includes('/landing') && !url.includes('/select')) {
        await this.page.goto('https://platform.interface.ai/landing');
        await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
        await this.page.waitForTimeout(2000);
    }
    await this.AIPBSelection.waitFor({ state: 'visible', timeout: 15000 });
    await this.AIPBSelection.click();
}

/** Same as LoginPage.Login_CU_Selection: goto, wait loader/landing, select CU. */
async Login_CU_Selection(){
    const loginPage = new LoginPage(this.page);
    await loginPage.Login_CU_Selection();
}

/** Select AIPB and APT when already on landing (no navigation). Use after Login_CU_Selection. */
async selectAIPBAndAPT(){
    await this.AIPBSelection.waitFor({ state: 'visible', timeout: 30000 });
    await this.AIPBSelection.click();
    await this.APT.waitFor({ state: 'visible', timeout: 60000 });
    await this.APT.click();
}

/** Navigate to landing (if needed) and select AIPB + APT. Login/CU handled by 00-Login.spec.js */
async loginAndSelectAIPBAndAPT(){
    const url = this.page.url();
    if (!url.includes('/landing') && !url.includes('/select')) {
        await this.page.goto('https://platform.interface.ai/landing');
        await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
        await this.page.waitForTimeout(2000);
    }
    await this.selectAIPBAndAPT();
}

async AIPBAPTSelection(){
    await this.goToLandingAndSelectAIPB();
    await this.APT.waitFor({ state: 'visible', timeout: 15000 });
    await this.APT.click();
}
async RecentConversationAssertions(){
    // Call Admin Mock API before loading conversations
    const { status, data } = await callAdminMockApi();
    console.log('Admin Mock API response:', status, data);
    await this.ConversationsList.click();
    await this.RecentConversationsList.click();
    await this.page.waitForLoadState('load');
    await this.ConversationIDLeftPane.first().waitFor({ state: 'visible', timeout: 10000 });
    await this.CallerIdentifier.click();
}
async AnalyzedConversationsBasedOnExpName(){
    // Wait for any loading spinner to disappear
    const spinner = this.page.locator('.ant-spin-spinning, .ant-spin-dot');
    await spinner.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.AnalyzedConversations.waitFor({ state: 'visible', timeout: 30000 });
    await this.AnalyzedConversations.click();
    // Click the ant-select combobox to open the dropdown (not the wrapper input)
    await this.ExpNameCombobox.click();
    // Wait for dropdown list to load its options
    await this.ExpList.waitFor({ state: 'visible', timeout: 15000 });
    // Type slowly so ant-select registers keystrokes and filters (fill often gets ignored)
    await this.ExpNameCombobox.pressSequentially('Routing', { delay: 100 });
    // Wait for filtered option to appear then click
    await this.ExpSelection.waitFor({ state: 'visible', timeout: 20000 });
    await this.ExpSelection.click({ timeout: 10000 });
    await this.ViewConversationBtn.click();
    await this.SearchConversationsBtn.click();
    await this.SearchConversationsBtn.click();
    await this.SearchInput.fill("routing");
    await this.SearchInput.press("Enter");
    await this.page.waitForLoadState('networkidle');
}
async selectAutomationReportType(){
    const adminDropdown = this.AdminDropdown;
    try {
        await adminDropdown.waitFor({ state: 'visible', timeout: 15000 });
    } catch {
        console.log('Admin dropdown not found — already on Automation or no dropdown present');
        return;
    }
    console.log('Admin dropdown found — clicking to switch to Automation');
    await adminDropdown.click();
    await this.page.waitForTimeout(1000);
    await this.AutomationDropdownOption.waitFor({ state: 'visible', timeout: 5000 });
    await this.AutomationDropdownOption.click();
    await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await this.page.waitForTimeout(3000);
    console.log('Switched report type to Automation');
}

async AutomationForLastMonth(){
    await this.goToLandingAndSelectAIPB();
    await this.Automation.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(5000);

    await this.selectAutomationReportType();

    await this.AutomationDatePicker.click();
    await this.AutomationforLastmonth.click();
}
async RefreshModuleCheck(){
    await this.refreshbutton.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
}
async TotalCallsCheck(){
  const parseNum = (str) => Number((str ?? '0').replace(/[^0-9.-]/g, ''));
  const totalcalls = parseNum(await this.TotalCalls.textContent());

  const breakdownLinks = await this.AllBreakdownCounts.all();
  let totalCallsBreakdown = 0;
  const breakdownDetails = [];
  for (const link of breakdownLinks) {
    const raw = (await link.textContent() ?? '0').trim();
    const value = parseNum(raw);
    totalCallsBreakdown += value;
    breakdownDetails.push({ raw, value });
  }
  console.log('Breakdown columns:', breakdownDetails, 'Sum:', totalCallsBreakdown, 'Total:', totalcalls);
  return { totalCallsBreakdown, totalcalls, breakdownDetails };
}
async EventManagerforPreviousDateDisabled(){
    await this.goToLandingAndSelectAIPB();
    await this.EventManager.click();
    await this.page.waitForLoadState('networkidle');
    await this.NewEventButton.click();
    await this.EventName.fill("Test Event");
    await this.HolidayMessageEnglish.fill("We are testing Event Manager");
    await this.HolidayMessageSpanish.fill("We are testing Event Manager");
    await this.HolidayDateRange.click();
}
async EventManagerNewEventCreation(){
    await this.goToLandingAndSelectAIPB();
    await this.EventManager.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);

    // Clean up any leftover "Test Event Manager" from a previous run
    const searchBox = this.page.getByPlaceholder("Enter name or message");
    await searchBox.fill("Test Event Manager");
    await searchBox.press("Enter");
    await this.page.waitForTimeout(2000);
    for (let i = 0; i < 5; i++) {
        const deleteBtn = this.page.locator("//span[@aria-label='delete']").first();
        if (!await deleteBtn.isVisible().catch(() => false)) break;
        await deleteBtn.click();
        await this.page.waitForTimeout(1000);
        const confirmBtn = this.page.locator(".ant-modal-confirm-btns button.ant-btn-primary, //span[text()='Delete']/parent::button");
        await confirmBtn.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        await confirmBtn.first().click().catch(() => {});
        await this.page.waitForTimeout(2000);
        await this.page.waitForLoadState('networkidle').catch(() => {});
        console.log('Deleted leftover Test Event Manager');
    }
    await searchBox.clear();
    await searchBox.press("Enter");
    await this.page.waitForTimeout(1000);

    await this.NewEventButton.click();
    await this.EventName.fill("Test Event Manager");
    await this.HolidayMessageEnglish.fill("We are testing Event Manager");
    await this.HolidayMessageSpanish.fill("We are testing Event Manager");
    await this.HolidayDateRange.click();
    await this.TodaysDateinDatePicker.click();
    await this.OkButtoninDatePicker.click();
    await this.page.locator('.ant-picker-time-panel-column')
    .nth(0)
    .getByText('23', { exact: true })
    .click();
  await this.page.locator('.ant-picker-time-panel-column')
    .nth(1)
    .getByText('59', { exact: true })
    .click();
    await this.OkButtoninDatePicker.click();
    await this.SaveEventButton.click();
    await this.page.waitForTimeout(3000);
    await this.PublishEventButton.click();
    await this.page.waitForLoadState('networkidle');
}
async DuplicateEventCreation(){
  // await this.goToLandingAndSelectAIPB();
  //   await this.EventManager.click();
  //   await this.page.waitForLoadState('networkidle');
    await this.NewEventButton.click();
    await this.EventName.fill("Test Event Manager");
    await this.HolidayMessageEnglish.fill("We are testing Event Manager");
    await this.HolidayMessageSpanish.fill("We are testing Event Manager");
    await this.HolidayDateRange.click();
    await this.TodaysDateinDatePicker.click();
    await this.OkButtoninDatePicker.click();
    await this.page.locator('.ant-picker-time-panel-column')
    .nth(0)
    .getByText('23', { exact: true })
    .click();
  await this.page.locator('.ant-picker-time-panel-column')
    .nth(1)
    .getByText('59', { exact: true })
    .click();
    await this.OkButtoninDatePicker.click();
    await this.SaveEventButton.click();
}
async EventSearchAndDelete(){
  const searchBox = this.page.getByPlaceholder("Enter name or message");
  await searchBox.fill("Test Event Manager");
  await searchBox.press("Enter");
  await this.page.waitForTimeout(2000);
  await this.EventDeleteButton.click();
  await this.page.waitForTimeout(1000);
  const confirmBtn = this.page.locator(".ant-modal-confirm-btns button.ant-btn-primary, .ant-popover button.ant-btn-primary").first();
  const confirmVisible = await confirmBtn.isVisible().catch(() => false);
  if (confirmVisible) {
    await confirmBtn.click();
  } else {
    await this.ConfirmDeleteButton.click();
  }
  await this.page.waitForLoadState('networkidle');
  await this.page.waitForTimeout(2000);
  await searchBox.clear();
  await searchBox.fill("Test Event Manager");
  await searchBox.press("Enter");
  await this.page.waitForTimeout(2000);
}
async AdvisorySelection(){
  await this.goToLandingAndSelectAIPB();
  await this.Advisory.click();
  await this._waitForTableauReady();
}

/**
 * Reusable wait: ensures the page is network-idle, any Ant Design spinner
 * is gone, the Tableau iframe is attached, and its canvas has rendered.
 */
async _waitForTableauReady() {
  await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await this.page.waitForFunction(
    () => document.querySelectorAll('.ant-spin-spinning').length === 0,
    null, { timeout: 10000 }
  ).catch(() => {});
  const iframe = this.page.locator('iframe').first();
  await iframe.waitFor({ state: 'attached', timeout: 30000 });
  try {
    const handle = await iframe.elementHandle();
    const frame = handle ? await handle.contentFrame() : null;
    if (frame) {
      await frame.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
      await frame.waitForSelector('canvas', { state: 'visible', timeout: 30000 });
    }
  } catch { /* proceed if canvas not available for this view */ }
}

/**
 * Lightweight wait for tab switches within the same dashboard.
 * Skips networkidle and frame load (iframe is already attached);
 * only waits for the spinner to vanish and the canvas to re-render.
 */
async _waitForTabSwitch() {
  await this.page.waitForFunction(
    () => document.querySelectorAll('.ant-spin-spinning').length === 0,
    null, { timeout: 8000 }
  ).catch(() => {});
  const iframe = this.page.locator('iframe').first();
  try {
    const handle = await iframe.elementHandle();
    const frame = handle ? await handle.contentFrame() : null;
    if (frame) {
      await frame.waitForSelector('canvas', { state: 'visible', timeout: 20000 });
    }
  } catch { /* proceed if canvas not available for this view */ }
}

async AdvisoryPageLoadCheck(){
  await this.AdvisoryHeading.waitFor({ state: 'visible', timeout: 15000 });
}

async AdvisorySummaryCardsCheck(){
  await this.AdvisoryCardTitles.first().waitFor({ state: 'visible', timeout: 60000 });
  const titleCount = await this.AdvisoryCardTitles.count();
  const titles = [];
  for (let i = 0; i < titleCount; i++) {
    titles.push(await this.AdvisoryCardTitles.nth(i).textContent());
  }
  return { titleCount, titles };
}

async AdvisoryDatePickerLast30Days(){
  await this.AdvisoryStartDate.click();
  await this.AdvisoryLast30Days.waitFor({ state: 'visible', timeout: 15000 });
  await this.AdvisoryLast30Days.click();
  await this.AdvisoryApplyBtn.waitFor({ state: 'visible', timeout: 10000 });
  await this.AdvisoryApplyBtn.click();
  await this._waitForTableauReady();
}

// ── AI Powered Phone Banking (AIPB) Tests ──

/** Verify the AIPB dashboard is active in the sidebar */
async AdvisoryAIPBDashboardVisible(){
  await this.AdvisoryAIPBLink.waitFor({ state: 'visible', timeout: 15000 });
}

/** Return the list of tab names shown under AIPB */
async AdvisoryAIPBTabNames(){
  await this.AdvisoryTabs.first().waitFor({ state: 'visible', timeout: 30000 });
  const count = await this.AdvisoryTabs.count();
  const names = [];
  for (let i = 0; i < count; i++) {
    names.push((await this.AdvisoryTabs.nth(i).textContent()).trim());
  }
  return names;
}

/** Click a specific tab by its visible name and wait for Tableau content to render */
async AdvisoryClickTab(tabName){
  const tab = this.page.locator('[role="tablist"] [role="tab"]').filter({ hasText: tabName });
  await tab.waitFor({ state: 'visible', timeout: 15000 });
  await tab.click();
  await this._waitForTabSwitch();
}

/** Verify the Tableau iframe is present and rendered for the current tab */
async AdvisoryIframePresent(){
  const iframe = this.page.locator('iframe').first();
  await iframe.waitFor({ state: 'attached', timeout: 30000 });
  const src = await iframe.getAttribute('src');
  return { visible: true, src };
}

/** Verify the date picker component is visible on the page */
async AdvisoryDatePickerVisible(){
  await this.AdvisoryDatePicker.waitFor({ state: 'visible', timeout: 15000 });
}

/** Check that reload and download buttons are visible */
async AdvisoryActionButtonsVisible(){
  const reloadVisible = await this.AdvisoryReloadBtn.isVisible();
  const downloadVisible = await this.AdvisoryDownloadBtn.isVisible();
  return { reloadVisible, downloadVisible };
}

/** Click each AIPB tab, confirm iframe loads, and validate section data in a single pass */
async AdvisoryAIPBTabNavigationAndDataCheck(){
  const tabs = await this.AdvisoryAIPBTabNames();
  const navResults = [];
  const allFailures = [];
  const allDataResults = [];
  const alertScreenshots = [];
  for (const tabName of tabs) {
    await this.AdvisoryClickTab(tabName);
    const { visible, src } = await this.AdvisoryIframePresent();
    navResults.push({ tabName, iframeLoaded: visible, src });
    const { failures, sections } = await this._validateCurrentTabSections();
    const prefixed = failures.map(f => `[${tabName}] ${f}`);
    allDataResults.push({ tabName, failures: prefixed, sections });
    allFailures.push(...prefixed);
    if (prefixed.length > 0) {
      const screenshot = await this.page.screenshot();
      alertScreenshots.push({ tabName, buffer: screenshot });
    }
  }
  return { navResults, allFailures, allDataResults, alertScreenshots };
}

// ── Call Transfer (AIPB) Tests ──

/** Navigate to the Call Transfer (AIPB) dashboard from the sidebar */
async AdvisoryNavigateToCallTransfer(){
  await this.AdvisoryCallTransferLink.waitFor({ state: 'visible', timeout: 15000 });
  await this.AdvisoryCallTransferLink.click();
  await this._waitForTableauReady();
}

/** Return the list of tab names shown under Call Transfer */
async AdvisoryCallTransferTabNames(){
  await this.AdvisoryTabs.first().waitFor({ state: 'visible', timeout: 30000 });
  const count = await this.AdvisoryTabs.count();
  const names = [];
  for (let i = 0; i < count; i++) {
    names.push((await this.AdvisoryTabs.nth(i).textContent()).trim());
  }
  return names;
}

/** Verify the Call Transfer iframe is present after navigation */
async AdvisoryCallTransferIframePresent(){
  const iframe = this.page.locator('iframe').first();
  await iframe.waitFor({ state: 'attached', timeout: 30000 });
  const src = await iframe.getAttribute('src');
  return { visible: true, src };
}

/** Click each Call Transfer tab, confirm iframe loads, and validate section data in a single pass */
async AdvisoryCallTransferTabNavigationAndDataCheck(){
  const tabs = await this.AdvisoryCallTransferTabNames();
  const navResults = [];
  const allFailures = [];
  const allDataResults = [];
  const alertScreenshots = [];
  for (const tabName of tabs) {
    await this.AdvisoryClickTab(tabName);
    const { visible, src } = await this.AdvisoryIframePresent();
    navResults.push({ tabName, iframeLoaded: visible, src });
    const { failures, sections } = await this._validateCurrentTabSections();
    const prefixed = failures.map(f => `[${tabName}] ${f}`);
    allDataResults.push({ tabName, failures: prefixed, sections });
    allFailures.push(...prefixed);
    if (prefixed.length > 0) {
      const screenshot = await this.page.screenshot();
      alertScreenshots.push({ tabName, buffer: screenshot });
    }
  }
  return { navResults, allFailures, allDataResults, alertScreenshots };
}

/** Verify the date picker is visible on the Call Transfer page */
async AdvisoryCallTransferDatePickerVisible(){
  await this.AdvisoryDatePicker.waitFor({ state: 'visible', timeout: 15000 });
}

/** Navigate back to AIPB from Call Transfer via sidebar link */
async AdvisoryNavigateBackToAIPB(){
  await this.AdvisoryAIPBLink.waitFor({ state: 'visible', timeout: 15000 });
  await this.AdvisoryAIPBLink.click();
  await this._waitForTableauReady();
}

// ── AI Powered Phone Banking Branch Number Tests ──

/** Check if the Branch Number dashboard link is available in the sidebar (not all CUs have it) */
async AdvisoryBranchNumberAvailable(){
  return await this.AdvisoryBranchNumberLink.isVisible({ timeout: 5000 }).catch(() => false);
}

/** Navigate to the Branch Number dashboard from the sidebar */
async AdvisoryNavigateToBranchNumber(){
  await this.AdvisoryBranchNumberLink.waitFor({ state: 'visible', timeout: 15000 });
  await this.AdvisoryBranchNumberLink.click();
  await this._waitForTableauReady();
}

/** Return the list of tab names shown under Branch Number */
async AdvisoryBranchNumberTabNames(){
  await this.AdvisoryTabs.first().waitFor({ state: 'visible', timeout: 30000 });
  const count = await this.AdvisoryTabs.count();
  const names = [];
  for (let i = 0; i < count; i++) {
    names.push((await this.AdvisoryTabs.nth(i).textContent()).trim());
  }
  return names;
}

/** Verify the Branch Number iframe is present after navigation */
async AdvisoryBranchNumberIframePresent(){
  const iframe = this.page.locator('iframe').first();
  await iframe.waitFor({ state: 'attached', timeout: 30000 });
  const src = await iframe.getAttribute('src');
  return { visible: true, src };
}

/** Verify the date picker is visible on the Branch Number page */
async AdvisoryBranchNumberDatePickerVisible(){
  await this.AdvisoryDatePicker.waitFor({ state: 'visible', timeout: 15000 });
}

/** Click each Branch Number tab, confirm iframe loads, and validate section data in a single pass */
async AdvisoryBranchNumberTabNavigationAndDataCheck(){
  const tabs = await this.AdvisoryBranchNumberTabNames();
  const navResults = [];
  const allFailures = [];
  const allDataResults = [];
  const alertScreenshots = [];
  for (const tabName of tabs) {
    await this.AdvisoryClickTab(tabName);
    const { visible, src } = await this.AdvisoryIframePresent();
    navResults.push({ tabName, iframeLoaded: visible, src });
    const { failures, sections } = await this._validateCurrentTabSections();
    const prefixed = failures.map(f => `[${tabName}] ${f}`);
    allDataResults.push({ tabName, failures: prefixed, sections });
    allFailures.push(...prefixed);
    if (prefixed.length > 0) {
      const screenshot = await this.page.screenshot();
      alertScreenshots.push({ tabName, buffer: screenshot });
    }
  }
  return { navResults, allFailures, allDataResults, alertScreenshots };
}

// ── Device Biometrics Dashboard Tests (conditional) ──

/** Check if the Device Biometrics Dashboard link is available in the sidebar */
async AdvisoryDeviceBiometricsAvailable(){
  return await this.AdvisoryDeviceBiometricsLink.isVisible({ timeout: 5000 }).catch(() => false);
}

/** Navigate to the Device Biometrics Dashboard from the sidebar */
async AdvisoryNavigateToDeviceBiometrics(){
  await this.AdvisoryDeviceBiometricsLink.waitFor({ state: 'visible', timeout: 15000 });
  await this.AdvisoryDeviceBiometricsLink.click();
  await this._waitForTableauReady();
}

/** Return the list of tab names shown under Device Biometrics */
async AdvisoryDeviceBiometricsTabNames(){
  await this.AdvisoryTabs.first().waitFor({ state: 'visible', timeout: 30000 });
  const count = await this.AdvisoryTabs.count();
  const names = [];
  for (let i = 0; i < count; i++) {
    names.push((await this.AdvisoryTabs.nth(i).textContent()).trim());
  }
  return names;
}

/** Verify the Device Biometrics iframe is present after navigation */
async AdvisoryDeviceBiometricsIframePresent(){
  const iframe = this.page.locator('iframe').first();
  await iframe.waitFor({ state: 'attached', timeout: 30000 });
  const src = await iframe.getAttribute('src');
  return { visible: true, src };
}

/** Verify the date picker is visible on the Device Biometrics page */
async AdvisoryDeviceBiometricsDatePickerVisible(){
  await this.AdvisoryDatePicker.waitFor({ state: 'visible', timeout: 15000 });
}

/** Click each Device Biometrics tab, confirm iframe loads, and validate section data in a single pass */
async AdvisoryDeviceBiometricsTabNavigationAndDataCheck(){
  const tabs = await this.AdvisoryDeviceBiometricsTabNames();
  const navResults = [];
  const allFailures = [];
  const allDataResults = [];
  const alertScreenshots = [];
  for (const tabName of tabs) {
    await this.AdvisoryClickTab(tabName);
    const { visible, src } = await this.AdvisoryIframePresent();
    navResults.push({ tabName, iframeLoaded: visible, src });
    const { failures, sections } = await this._validateCurrentTabSections();
    const prefixed = failures.map(f => `[${tabName}] ${f}`);
    allDataResults.push({ tabName, failures: prefixed, sections });
    allFailures.push(...prefixed);
    if (prefixed.length > 0) {
      const screenshot = await this.page.screenshot();
      alertScreenshots.push({ tabName, buffer: screenshot });
    }
  }
  return { navResults, allFailures, allDataResults, alertScreenshots };
}

// ── Advisory Data Validation ──

/**
 * Extract sections from the currently loaded Tableau iframe and validate:
 *  - No section should be empty or say "No data to visualize"
 *  - Value of 0 is flagged for all sections EXCEPT complex charts (bar/line/area)
 *    and time-related sections. Text Table KPIs ARE checked for zero.
 *
 * Two-pass approach:
 *  Pass 1 (DOM): Extract zones via aria-label, gather text from innerText,
 *    gridcell, and status elements. Flag empty/zero where text is available.
 *  Pass 2 (ariaSnapshot): For Text Table KPIs where DOM text was empty
 *    (canvas-rendered values), use Playwright's ariaSnapshot to read the
 *    accessible value and check for zero.
 */
async _validateCurrentTabSections() {
  const iframeEl = this.page.locator('iframe').first();
  await iframeEl.waitFor({ state: 'attached', timeout: 30000 });
  const handle = await iframeEl.elementHandle();
  const frame = handle ? await handle.contentFrame() : null;
  if (!frame) return { failures: ['Could not access iframe content'], sections: [] };

  const hasContent = await frame.evaluate(() => {
    return !!document.querySelector('canvas') || (document.body?.innerText?.trim().length || 0) > 0;
  });
  if (!hasContent) return { failures: ['Tab content is completely empty'], sections: [] };

  const zones = await frame.evaluate(() => {
    return [...document.querySelectorAll('[aria-label]')]
      .filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 30 && r.height > 30;
      })
      .map(el => ({
        label: el.getAttribute('aria-label') || '',
        text: (el.innerText?.trim() || '').substring(0, 500),
        gridcellText: [...el.querySelectorAll('[role="gridcell"]')]
          .map(c => (c.textContent?.trim() || '')).join(' ').substring(0, 500),
        statusText: [...el.querySelectorAll('[role="status"]')]
          .map(s => (s.textContent?.trim() || '')).join(' ').substring(0, 500),
        hasCanvas: !!el.querySelector('canvas'),
        hasTable: !!el.querySelector('table,[role="grid"],[role="table"]'),
        hasSvg: !!el.querySelector('svg path,svg rect,svg circle,svg line'),
      }))
      .filter(z => z.label.length > 0);
  });

  const sections = [];
  const failures = [];
  const seen = new Set();
  const textTableCandidates = [];

  for (const z of zones) {
    if (seen.has(z.label)) continue;
    seen.add(z.label);

    const lbl = z.label;
    const isComplexChart = /bar chart|line chart|area chart|highlight table|square chart/i.test(lbl);
    const isTextTable = /text table/i.test(lbl) && !isComplexChart;
    const isVisualization = /data visualization/i.test(lbl);
    const isTableOrGraph = isComplexChart || isVisualization || z.hasCanvas || z.hasSvg || z.hasTable;
    const isTime = /time|hour|min|duration|avg|average|handling|trend/i.test(lbl);
    const hasNoData = /no data to visualize/i.test(lbl);
    const isMarginOnly = /^[^.]*margin\.\s*Press Enter/i.test(lbl) && !isVisualization;

    const sectionName = lbl.split('.')[0].trim();
    sections.push({ label: sectionName, fullLabel: lbl, isTableOrGraph, isTime, hasNoData, isMarginOnly });

    const combinedText = [z.text, z.gridcellText, z.statusText].join(' ').trim();

    if (hasNoData) {
      failures.push(`"${sectionName}" — No data to visualize`);
    } else if (isMarginOnly) {
      // skip margin-only labels
    } else if (isComplexChart || isTime) {
      // skip zero checks for actual charts (bar/line/area) and time-based sections
    } else if (!isVisualization && !isTableOrGraph) {
      if (combinedText.length === 0 && !z.hasCanvas) {
        failures.push(`"${sectionName}" — data is empty`);
      } else {
        const nums = (combinedText.match(/[\d,]+\.?\d*/g) || [])
          .map(n => parseFloat(n.replace(/,/g, ''))).filter(n => !isNaN(n));
        if (nums.length > 0 && nums.every(v => v === 0)) {
          failures.push(`"${sectionName}" — value is 0`);
        }
      }
    } else if (isTextTable) {
      const nums = (combinedText.match(/[\d,]+\.?\d*/g) || [])
        .map(n => parseFloat(n.replace(/,/g, ''))).filter(n => !isNaN(n));
      if (nums.length > 0 && nums.every(v => v === 0)) {
        failures.push(`"${sectionName}" — value is 0`);
      } else if (nums.length === 0 && z.hasCanvas) {
        textTableCandidates.push({ sectionName, label: lbl });
      }
    }
  }

  // Pass 2: For Text Table KPIs where DOM text had no numbers (canvas-rendered),
  // use Playwright ariaSnapshot to read accessible values from the canvas.
  for (const candidate of textTableCandidates) {
    try {
      const titleText = candidate.sectionName;
      const heading = frame.locator(`h2:has-text("${titleText}")`).first();
      const zone = heading.locator('..');
      const snap = await zone.ariaSnapshot({ timeout: 5000 });
      const nums = (snap.match(/\b\d[\d,]*\.?\d*\b/g) || [])
        .map(n => parseFloat(n.replace(/,/g, ''))).filter(n => !isNaN(n));
      if (nums.length > 0 && nums.every(v => v === 0)) {
        failures.push(`"${candidate.sectionName}" — value is 0`);
      }
    } catch { /* ariaSnapshot may not be available or element not found */ }
  }

  if (sections.length === 0) {
    failures.push('No sections detected in the Tableau iframe');
  }

  return { failures, sections };
}

// ─── SQL Lab ────────────────────────────────────────────────────────────────

_initSqlLabLocators() {
  const p = this.sqlLabPage;
  this.sqlLabDbDropdown = p.locator('[aria-label="Select database or type to search databases"]').first();
  this.sqlLabSchemaDropdown = p.locator('[aria-label="Select schema or type to search schemas"]').first();
  this.sqlLabTableDropdown = p.locator('[aria-label="Select table or type to search tables"]').first();
  this.sqlLabRunBtn = p.getByRole('button', { name: 'Run' });
  this.sqlLabSaveBtn = p.getByRole('button', { name: 'Save', exact: true });
  this.sqlLabResultsTab = p.getByRole('tab', { name: 'Results' });
  this.sqlLabQueryHistoryTab = p.getByRole('tab', { name: 'Query history' });
}

async navigateToSQLLab() {
  await this.goToLandingAndSelectAIPB();
  await this.SQLLab.waitFor({ state: 'visible', timeout: 15000 });

  const popupPromise = this.page.context().waitForEvent('page', { timeout: 15000 }).catch(() => null);
  await this.SQLLab.click();

  const popup = await popupPromise;
  if (popup) {
    this.sqlLabPage = popup;
    await this.sqlLabPage.waitForLoadState('domcontentloaded', { timeout: 60000 });
  } else {
    this.sqlLabPage = this.page;
    await this.sqlLabPage.waitForURL('**/sqllab**', { timeout: 30000 });
  }

  await this.sqlLabPage.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  this.page.__sqlLabPage = this.sqlLabPage;
  this._initSqlLabLocators();
  await this.sqlLabRunBtn.waitFor({ state: 'visible', timeout: 30000 });
}

async sqlLabEnsureDatabaseSelected() {
  const p = this.sqlLabPage;
  await this.sqlLabDbDropdown.waitFor({ state: 'visible', timeout: 15000 });
  const wrapperText = await this.sqlLabDbDropdown.innerText().catch(() => '');
  const isPlaceholderOnly = !wrapperText || wrapperText.trim() === '' ||
    wrapperText.trim() === 'Select database or type to search databases';
  if (isPlaceholderOnly) {
    const combobox = this.sqlLabDbDropdown.getByRole('combobox');
    await combobox.click();
    await p.waitForTimeout(1000);
    const firstOption = p.getByRole('option').first();
    await firstOption.waitFor({ state: 'attached', timeout: 10000 });
    await firstOption.evaluate(el => el.click());
    await p.waitForTimeout(1000);
  }
  return (await this.sqlLabDbDropdown.innerText()).trim();
}

async sqlLabEnsureSchemaSelected() {
  const p = this.sqlLabPage;
  await this.sqlLabSchemaDropdown.waitFor({ state: 'visible', timeout: 15000 });
  const wrapperText = await this.sqlLabSchemaDropdown.innerText().catch(() => '');
  const isPlaceholderOnly = !wrapperText || wrapperText.trim() === '' ||
    wrapperText.trim() === 'Select schema or type to search schemas';
  if (isPlaceholderOnly) {
    const combobox = this.sqlLabSchemaDropdown.getByRole('combobox');
    await combobox.click();
    await p.waitForTimeout(1000);
    const firstOption = p.getByRole('option').first();
    await firstOption.waitFor({ state: 'attached', timeout: 10000 });
    await firstOption.evaluate(el => el.click());
    await p.waitForTimeout(1000);
  }
  return (await this.sqlLabSchemaDropdown.innerText()).trim();
}

async sqlLabSelectFirstTable() {
  const p = this.sqlLabPage;
  await p.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await this.sqlLabTableDropdown.waitFor({ state: 'visible', timeout: 15000 });
  const combobox = this.sqlLabTableDropdown.getByRole('combobox');
  await combobox.click();
  await p.waitForTimeout(1000);
  const firstOption = p.getByRole('option').first();
  await firstOption.waitFor({ state: 'attached', timeout: 10000 });
  const tableName = (await firstOption.innerText()).trim();
  await firstOption.evaluate(el => el.click());
  await p.waitForTimeout(500);
  return tableName;
}

async sqlLabWriteAndRunQuery(tableName) {
  const p = this.sqlLabPage;
  const query = `SELECT * FROM ${tableName} LIMIT 10`;
  const editor = p.locator('.ace_editor').first();
  await editor.waitFor({ state: 'visible', timeout: 15000 });
  await editor.click();
  await p.keyboard.press('Control+A');
  await p.keyboard.type(query, { delay: 20 });
  await this.sqlLabRunBtn.click();
  await p.waitForTimeout(2000);
  await p.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  return query;
}

async sqlLabSaveQueryWithName(queryName) {
  const p = this.sqlLabPage;
  await this.sqlLabSaveBtn.click();
  const dialog = p.getByRole('dialog', { name: 'Save query' });
  await dialog.waitFor({ state: 'visible', timeout: 10000 });
  const nameInput = dialog.locator('input').first();
  await nameInput.click({ clickCount: 3 });
  await nameInput.fill(queryName);
  const saveAsNewBtn = dialog.getByRole('button', { name: 'Save as new' });
  const dialogSaveBtn = dialog.getByRole('button', { name: 'Save', exact: true });
  if (await saveAsNewBtn.isVisible().catch(() => false)) {
    await saveAsNewBtn.click();
  } else {
    await dialogSaveBtn.click();
  }
  await dialog.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  const successAlert = p.getByRole('alert').filter({ hasText: 'Your query was saved' });
  await successAlert.waitFor({ state: 'visible', timeout: 10000 });
  return successAlert;
}

async sqlLabNavigateToSavedQueries() {
  const p = this.sqlLabPage;
  const sqlMenuBtn = p.getByRole('button', { name: 'triangle-down SQL' });
  await sqlMenuBtn.click();
  const savedQueriesLink = p.getByRole('link', { name: 'Saved Queries' });
  await savedQueriesLink.waitFor({ state: 'visible', timeout: 10000 });
  await savedQueriesLink.click();
  await p.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(2000);
}

async sqlLabVerifySavedQuery(queryName, expectedQuery) {
  const p = this.sqlLabPage;
  const row = p.getByRole('row').filter({ hasText: queryName });
  await row.waitFor({ state: 'visible', timeout: 15000 });
  const binocularsBtn = row.getByRole('button', { name: 'binoculars' });
  await binocularsBtn.click();
  const previewDialog = p.getByRole('dialog', { name: 'Query preview' });
  await previewDialog.waitFor({ state: 'visible', timeout: 10000 });
  const nameText = previewDialog.locator('text=' + queryName);
  await nameText.waitFor({ state: 'visible', timeout: 5000 });
  const previewName = (await nameText.innerText()).trim();
  const codeBlock = previewDialog.locator('code');
  const queryText = (await codeBlock.innerText()).trim();
  const closeBtn = previewDialog.getByRole('button', { name: 'Close' });
  await closeBtn.click();
  await previewDialog.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  return { queryName: previewName, queryText };
}

async sqlLabDeleteSavedQuery(queryName) {
  const p = this.sqlLabPage;
  const row = p.getByRole('row').filter({ hasText: queryName });
  await row.waitFor({ state: 'visible', timeout: 15000 });
  const trashBtn = row.getByRole('button', { name: 'trash' });
  await trashBtn.click();
  const deleteDialog = p.getByRole('dialog', { name: 'Delete Query?' });
  await deleteDialog.waitFor({ state: 'visible', timeout: 10000 });
  const confirmInput = deleteDialog.getByRole('textbox');
  await confirmInput.fill('DELETE');
  const deleteBtn = deleteDialog.getByRole('button', { name: 'delete' });
  await deleteBtn.click();
  await deleteDialog.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  const deleteAlert = p.getByRole('alert').filter({ hasText: queryName });
  await deleteAlert.waitFor({ state: 'visible', timeout: 10000 });
  const alertText = (await deleteAlert.innerText()).trim();
  return { alert: deleteAlert, alertText };
}

async sqlLabSearchSavedQuery(queryName) {
  const p = this.sqlLabPage;
  const searchBox = p.getByRole('textbox', { name: 'Type a value' });
  await searchBox.waitFor({ state: 'visible', timeout: 10000 });
  await searchBox.fill(queryName);
  await searchBox.press('Enter');
  await p.waitForTimeout(3000);
  const noData = p.locator('text=No Data');
  const rows = p.getByRole('row').filter({ hasText: queryName });
  const rowCount = await rows.count();
  const hasNoData = await noData.isVisible().catch(() => false);
  return { rowCount, hasNoData };
}


}

export default Platform;
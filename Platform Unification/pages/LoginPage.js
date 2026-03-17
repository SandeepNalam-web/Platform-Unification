import test, { expect } from "@playwright/test";
import { getTestData } from "../utils/excelReader";
import path from 'path';
import { fetchOtp, LOGIN_EMAIL } from './InboxesApi.js';

class LoginPage{

constructor(page){  
const dataFile = path.resolve('./data/testData.xlsx');
const testData = getTestData(dataFile);
 

this.CUname = (process.env.CUNAME || testData.Cuname || '').toString().trim();
this.Envname  = (process.env.ENVNAME || testData.Env || '').toString().trim();
this.CuHeaderName= (process.env.CUHEADER || testData.CuHeader || '').toString().trim();
this.DepartmentName= (process.env.DEPARTMENTNAME || testData.Departmentname || '').toString().trim();
this.LoginEmail = LOGIN_EMAIL;
this.page = page;
this.baseURL= "https://platform.interface.ai/login";

// Buttons
this.GoogleLoginbtn = this.page.locator('//button//span[contains (text(),"Google")]');
this.AccountSelectbtn = this.page.locator('//div[contains(text(),"@interface.ai")]');
this.Continuebtn = this.page.locator('//div//span[contains(text(),"Continue")]');
this.CuSelectionbtn = this.page.locator(`//div[@class="CuItem_cuListItem__2fySH "]//p[text()="${this.CUname}"]`);
this.CuListItems = this.page.locator('.CuItem_cuListItem__2fySH');
this.FirstCUSelectionbtn= this.page.locator('(//div[@class="CuItem_cuListItem__2fySH "])[1]');
this.FlaEnvSelectionbtn = this.page.locator(`//div[h2[text()="Employee AI"]]/following-sibling::div//p[text()="${this.Envname}"]`);
this.AppSelection_Frontlinebtn = this.page.locator('//div[@class="AppSelectBlock_appSelectBlockTitle__2AFfr"]//p[text()="Frontline assistant"]');
this.SettingsBtn = this.page.locator("//div//p[text()='Settings']");
this.DepartmentBtn = this.page.locator("//div[text()='Department']//span[@role='img']");
this.NewDepartmentInput = this.page.locator("//input[@placeholder='Enter new department name']");
this.AddDepartmentBtn= this.page.locator("//button//span[text()='Add Department']");
this.CloseModalBtn = this.page.locator("//span[@class='ant-modal-close-x']");
this.BackBtn= this.page.locator("//span[@aria-label='arrow-left']");
this.DeleteDepartmentActionBtn = this.page.locator(`(//td//div[text()='${this.DepartmentName}']/following::td)[5]`);
this.DeleteIconBtn = this.page.locator("//button/span[@aria-label='delete']");
this.DeleteConfirmBtn= this.page.locator("//button/span[text()='Yes! Delete it']");
this.DepartmentCreationSuccessmessage = this.page.locator('//div//span[text()="Department created successfully"]');
this.CuSelectedHeaderName= this.page.locator(`//div//h2[text()="${this.CuHeaderName}"]`);
this.UnregisteredEmailID = this.page.locator("//div//span[text()='No account found with this email address. Please enter a valid email address.']");
this.CUList = this.page.locator("//div[@class='CuList_cuListContainer__1m_9f']");
//Tabs
this.SideMenubtn = this.page.locator('//div[@class="app-core-side-menu-items"]//div[@class="app-core-icon-button"]');

// Email OTP login locators
this.EmailInput = this.page.locator('#identifier-field');
this.ContinueBtn = this.page.getByRole('button', { name: 'Continue', exact: true });
this.OtpDigitBoxes = this.page.locator('input[type="tel"], input[type="number"], input.otp-input, input[maxlength="1"]');
this.SubmitOtpBtn = this.page.getByRole('button', { name: /verify|submit|confirm|continue/i });
 }

 async OnlyLogin()
{
    // await this.page.pause();
    await this.page.goto(this.baseURL);
    await this.page.waitForURL('**/loader', { timeout: 60000 });
    await this.page.waitForURL('**/landing', { timeout: 60000 });
    await expect(this.CUList).toBeVisible();  // to check if the CU list is visible

}
async Login_CU_Selection()
{
    await this.page.goto(this.baseURL);
    await this.page.waitForURL('**/loader', { timeout: 60000 });
    await this.page.waitForURL('**/landing', { timeout: 60000 });

    await this.page.getByPlaceholder('Search Workspace').fill(this.CUname);
    await this.CuListItems.first().waitFor({ state: 'visible', timeout: 10000 });

    // Check if the auto-selected CU after search matches CUname
    const selectedCU = this.page.locator('.CuItem_cuListItem__2fySH.CuItem_selected__2ramz');
    const hasSelected = await selectedCU.count() > 0;
    if (hasSelected) {
        const selectedName = (await selectedCU.locator('.CuItem_cuListItemIconWrapper__1zIvu p').innerText()).trim();
        if (selectedName.toLowerCase() === this.CUname.toLowerCase()) {
            return;
        }
    }

    // No matching auto-selection — find exact match from CU list and click it
    const count = await this.CuListItems.count();
    for (let i = 0; i < count; i++) {
        const item = this.CuListItems.nth(i);
        const name = (await item.locator('.CuItem_cuListItemIconWrapper__1zIvu p').innerText()).trim();
        if (name.toLowerCase() === this.CUname.toLowerCase()) {
            await item.click();
            return;
        }
    }
}

async EnvSelection()
{
    await this.FlaEnvSelectionbtn.click();
    await this.AppSelection_Frontlinebtn.click();
    await this.page.waitForURL(/\/frontline\/chat\/?$/, { timeout: 60000 });
}
async GotoSettings_Department()
{
await this.SettingsBtn.click();
await this.DepartmentBtn.click();
}
async CreateNewDepartment(){
await this.NewDepartmentInput.fill(`${this.DepartmentName}`);
await this.AddDepartmentBtn.click();
}

async CloseDepartmentModalandGobacktoPlatform(){
    await this.CloseModalBtn.click();
    await this.BackBtn.click();
}

async DeleteDepartment(){
    await this.DeleteDepartmentActionBtn.hover();
    await this.DeleteIconBtn.click();
    await this.DeleteConfirmBtn.click();
}

/**
 * Login via email OTP using inboxes.com temporary email.
 * Uses static email: testadmin@getairmail.com
 */
async loginWithEmailOtp() {
    const email = LOGIN_EMAIL;

    console.log('[LoginOTP] Navigating to login page');
    await this.page.goto(this.baseURL);
    await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await this.page.waitForTimeout(3000);

    await this.EmailInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.EmailInput.fill(email);
    console.log(`[LoginOTP] Entered email: ${email}`);

    await this.ContinueBtn.click();
    console.log('[LoginOTP] Clicked Continue, waiting for OTP…');

    await this.page.waitForTimeout(2000);

    const unregistered = await this.UnregisteredEmailID.isVisible().catch(() => false);
    if (unregistered) {
        throw new Error(`Email "${email}" is not registered on the platform`);
    }

    const { otp, subject } = await fetchOtp(email);
    console.log(`[LoginOTP] OTP: ${otp} (subject: "${subject}")`);

    await this.page.waitForTimeout(1000);
    const boxCount = await this.OtpDigitBoxes.count();

    if (boxCount >= 6) {
        for (let i = 0; i < 6; i++) {
            await this.OtpDigitBoxes.nth(i).fill(otp[i]);
            await this.page.waitForTimeout(100);
        }
        console.log('[LoginOTP] Filled 6 OTP digits');
    } else if (boxCount >= 1) {
        await this.OtpDigitBoxes.first().fill(otp);
        console.log(`[LoginOTP] Filled OTP into ${boxCount} input(s)`);
    } else {
        await this.page.locator('input:visible').first().fill(otp);
        console.log('[LoginOTP] Filled OTP into fallback input');
    }

    const submitVisible = await this.SubmitOtpBtn.isVisible().catch(() => false);
    if (submitVisible) {
        await this.SubmitOtpBtn.click();
        console.log('[LoginOTP] Clicked submit');
    }

    await this.page.waitForURL('**/landing', { timeout: 60000 });
    console.log('[LoginOTP] Login successful — on landing page');
}

}

export default LoginPage;
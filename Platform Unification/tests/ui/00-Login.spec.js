import { test, expect } from '../fixtures/persistent-shared.js';
import LoginPage from '../../pages/LoginPage.js';

test.describe.serial('Login', () => {

  test('Login via Email OTP', async ({ sharedPage }) => {
    test.setTimeout(180000);
    const loginPage = new LoginPage(sharedPage);
    await loginPage.loginWithEmailOtp();
    console.log('OTP login successful');
  });

  test('CU Selection', async ({ sharedPage }) => {
    test.setTimeout(60000);
    const loginPage = new LoginPage(sharedPage);
    await loginPage.Login_CU_Selection();
    await expect(loginPage.CuSelectedHeaderName).toBeVisible({ timeout: 15000 });
    console.log(`CU "${loginPage.CUname}" selected`);
  });

});

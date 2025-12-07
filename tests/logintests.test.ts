import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

let password: string;

test('consumer can log in successfully', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();

    if (process.env.PASSWORD !== undefined) {
        password = process.env.PASSWORD;
    }

    await login.login('malin', password, 'consumer');

    await expect(page).toHaveURL(/\/store/i);
});
 
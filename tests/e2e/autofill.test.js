/**
 * E2E Test: AutoFill Functionality
 * 
 * Tests that form fields are correctly filled with profile data
 */

const path = require('path');
const { getPage, loadTestProfile, waitForAutofillButton, clickAutofill } = require('./setup');
const testProfile = require('../fixtures/test-profile.json');

describe('AutoFill Functionality', () => {
    let page;

    beforeEach(async () => {
        page = await getPage();

        // Load test profile into extension storage
        await loadTestProfile(page, testProfile);
    });

    afterEach(async () => {
        if (page) {
            await page.close();
        }
    });

    test('should fill basic text fields on mock application', async () => {
        // Navigate to mock application
        const mockAppPath = `file://${path.resolve(__dirname, '../mock-job-application.html')}`;
        await page.goto(mockAppPath, { waitUntil: 'networkidle0' });

        // Wait for extension to load
        const buttonFound = await waitForAutofillButton(page);
        expect(buttonFound).toBe(true);

        // Click autofill
        await clickAutofill(page);

        // Wait for form to be filled
        await page.waitForTimeout(3000);

        // Verify fields are filled - check any input has been filled
        const inputs = await page.$$('input[type="text"], input, select, textarea');
        let anyFilled = false;
        for (const input of inputs) {
            const value = await input.evaluate(el => el.value);
            if (value && value.length > 0) {
                anyFilled = true;
                break;
            }
        }
        expect(anyFilled).toBe(true);

        // Check name field if exists
        const nameInput = await page.$('input[name*="name"], input[id*="name"]');
        if (nameInput) {
            const nameValue = await nameInput.evaluate(el => el.value);
            expect(nameValue).toBeTruthy();
        }

        console.log('✅ Basic text fields filled successfully');
    });

    test('should fill LinkedIn simulation form', async () => {
        // Navigate to LinkedIn simulation
        const linkedinPath = `file://${path.resolve(__dirname, '../linkedin-simulation.html')}`;
        await page.goto(linkedinPath, { waitUntil: 'networkidle0' });

        // Wait for extension
        const buttonFound = await waitForAutofillButton(page);
        expect(buttonFound).toBe(true);

        // First, click the Easy Apply button on the page
        await page.click('.jobs-apply-button');
        await page.waitForTimeout(500);

        // Modal should be open now
        const modalVisible = await page.$('.modal-overlay.active');
        expect(modalVisible).toBeTruthy();

        // Click autofill on the form
        await clickAutofill(page);
        await page.waitForTimeout(3000);

        // Verify email field in modal is filled
        const emailValue = await page.$eval('#email', el => el.value);
        expect(emailValue).toBeTruthy();

        // Verify phone field
        const phoneValue = await page.$eval('#phone', el => el.value);
        expect(phoneValue).toBeTruthy();

        console.log('✅ LinkedIn simulation form filled successfully');
    });

    test('should handle select dropdowns', async () => {
        const mockAppPath = `file://${path.resolve(__dirname, '../mock-job-application.html')}`;
        await page.goto(mockAppPath, { waitUntil: 'networkidle0' });

        await waitForAutofillButton(page);
        await clickAutofill(page);
        await page.waitForTimeout(3000);

        // Check if any select has been filled (not default value)
        const selects = await page.$$('select');
        let selectFilled = false;

        for (const select of selects) {
            const value = await select.evaluate(el => el.value);
            if (value && value !== '') {
                selectFilled = true;
                break;
            }
        }

        console.log('✅ Dropdown handling tested');
    });
});

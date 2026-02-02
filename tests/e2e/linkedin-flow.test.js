/**
 * E2E Test: LinkedIn Easy Apply Flow
 * 
 * Tests the complete Auto Apply flow on LinkedIn simulation
 */

const path = require('path');
const { getPage, loadTestProfile, waitForAutofillButton, clickAutoApply } = require('./setup');
const testProfile = require('../fixtures/test-profile.json');

describe('LinkedIn Easy Apply Flow', () => {
    let page;

    beforeEach(async () => {
        page = await getPage();
        await loadTestProfile(page, testProfile);
    });

    afterEach(async () => {
        if (page) {
            await page.close();
        }
    });

    test('should detect and click Easy Apply button', async () => {
        const linkedinPath = `file://${path.resolve(__dirname, '../linkedin-simulation.html')}`;
        await page.goto(linkedinPath, { waitUntil: 'networkidle0' });

        // Verify Easy Apply button exists with LinkedIn classes
        const easyApplyBtn = await page.$('.jobs-apply-button');
        expect(easyApplyBtn).toBeTruthy();

        // Get button text
        const buttonText = await easyApplyBtn.evaluate(el => el.innerText);
        expect(buttonText.toLowerCase()).toContain('easy apply');

        console.log('✅ Easy Apply button detected');
    });

    test('should open modal when Easy Apply clicked', async () => {
        const linkedinPath = `file://${path.resolve(__dirname, '../linkedin-simulation.html')}`;
        await page.goto(linkedinPath, { waitUntil: 'networkidle0' });

        // Click Easy Apply
        await page.click('.jobs-apply-button');
        await page.waitForTimeout(500);

        // Modal should be visible
        const modal = await page.$('.modal-overlay.active');
        expect(modal).toBeTruthy();

        // Modal should contain form fields
        const emailInput = await page.$('#email');
        expect(emailInput).toBeTruthy();

        console.log('✅ Modal opens correctly');
    });

    test('should navigate through multi-step form', async () => {
        const linkedinPath = `file://${path.resolve(__dirname, '../linkedin-simulation.html')}`;
        await page.goto(linkedinPath, { waitUntil: 'networkidle0' });

        // Click Easy Apply to open modal
        await page.click('.jobs-apply-button');
        await page.waitForTimeout(500);

        // Fill Step 1
        await page.type('#email', 'test@example.com');
        await page.type('#phone', '+1 555-123-4567');
        await page.type('#city', 'San Francisco');
        await page.waitForTimeout(500);

        // Click Next
        await page.click('#nextBtn');
        await page.waitForTimeout(500);

        // Should be on Step 2
        const step2 = await page.$('#step2');
        const step2Display = await step2.evaluate(el => window.getComputedStyle(el).display);
        expect(step2Display).not.toBe('none');

        // Fill Step 2
        await page.select('#pythonExp', '5+');
        await page.type('#startDate', '2024-03-01');

        // Select radio button
        await page.click('input[name="workAuth"][value="Yes"]');
        await page.waitForTimeout(500);

        // Click Next again
        await page.click('#nextBtn');
        await page.waitForTimeout(500);

        // Should be on Step 3 (Review)
        const step3 = await page.$('#step3');
        const step3Display = await step3.evaluate(el => window.getComputedStyle(el).display);
        expect(step3Display).not.toBe('none');

        console.log('✅ Multi-step navigation works');
    });

    test('should stop Auto Apply when Stop button clicked', async () => {
        const linkedinPath = `file://${path.resolve(__dirname, '../linkedin-simulation.html')}`;
        await page.goto(linkedinPath, { waitUntil: 'networkidle0' });

        // Wait for extension widget
        await waitForAutofillButton(page);

        // Get initial button state
        const btnBefore = await page.$('#jobfiller-auto-apply-btn');
        const textBefore = await btnBefore.evaluate(el => el.innerText.toLowerCase());

        // Start Auto Apply
        await page.click('#jobfiller-auto-apply-btn');
        await page.waitForTimeout(3000); // Wait longer for state change

        // Click Stop  
        await page.click('#jobfiller-auto-apply-btn');
        await page.waitForTimeout(1000);

        // After stop, button should be back to initial state
        const textAfter = await btnBefore.evaluate(el => el.innerText.toLowerCase());
        expect(textAfter).toContain('auto apply');

        console.log('✅ Stop button works correctly');
    });
});

const { launchBrowser } = require('./setup');
const fs = require('fs');

let browser;
let extensionId;

describe('Extension Connectivity', () => {
    beforeAll(async () => {
        const result = await launchBrowser();
        browser = result.browser;
        extensionId = result.extensionId;
    });

    afterAll(async () => {
        if (browser) await browser.close();
    });

    test('Loads Popup successfully', async () => {
        const page = await browser.newPage();

        // DEBUG: Listen for errors
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

        await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);

        const title = await page.title();
        expect(title).toBe('Smart Filler');

        await page.close();
    });

    test('Connects to Ollama (Direct Mode)', async () => {
        const page = await browser.newPage();
        await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);

        // 1. Navigate to Settings Tab
        await page.click('.tab[data-tab="settings"]');

        // 2. Wait for Connect Button
        try {
            await page.waitForSelector('#connectOllama', { visible: true, timeout: 5000 });

        } catch (e) {
            console.log('TIMEOUT! Dumping HTML to debug-dump.html');
            const html = await page.evaluate(() => document.body.innerHTML);
            fs.writeFileSync('debug-dump.html', html);
            throw e;
        }

        // 2. Debug state
        const btnState = await page.$eval('#connectOllama', el => ({
            text: el.textContent,
            disabled: el.disabled,
            display: window.getComputedStyle(el).display,
            visibility: window.getComputedStyle(el).visibility
        }));
        console.log('Button State:', btnState);

        // 3. Ensure it's not covered
        await new Promise(r => setTimeout(r, 1000)); // Brief visual wait

        // 4. Click Connect
        await page.click('#connectOllama');

        // 5. Wait for success message (timeout of 10s)
        await page.waitForFunction(
            () => {
                const status = document.querySelector('#ollamaStatus');
                return status && status.textContent.includes('Connected');
            },
            { timeout: 10000 }
        );

        const statusText = await page.$eval('#ollamaStatus', el => el.textContent);
        expect(statusText).toContain('Connected');

        await page.close();
    });
});

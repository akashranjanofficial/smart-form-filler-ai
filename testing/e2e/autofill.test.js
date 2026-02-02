const { launchBrowser } = require('./setup');
const testProfile = require('../fixtures/test-profile.json');
const path = require('path');
const http = require('http');
const fs = require('fs');

let browser;
let extensionId;
let server;
let serverPort;

describe('AutoFill Feature', () => {
    beforeAll(async () => {
        // 1. Start Local Server to serve mock-form.html
        server = http.createServer((req, res) => {
            if (req.url === '/') {
                const filePath = path.resolve(__dirname, '../fixtures/mock-form.html');
                fs.readFile(filePath, (err, content) => {
                    if (err) {
                        res.writeHead(500);
                        res.end('Error loading mock form');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(content);
                    }
                });
            } else {
                res.writeHead(404);
                res.end();
            }
        });

        await new Promise(resolve => {
            server.listen(0, () => {
                serverPort = server.address().port;
                resolve();
            });
        });

        const result = await launchBrowser();
        browser = result.browser;
        extensionId = result.extensionId;

        // SEED STORAGE: We need to inject the profile into the extension's storage
        const workerTarget = await browser.waitForTarget(t => t.type() === 'service_worker');
        const worker = await workerTarget.worker();

        await worker.evaluate((data) => {
            chrome.storage.local.set({
                'jobFillerData': data,
                'settings': data.settings
            });
        }, testProfile);
    });

    afterAll(async () => {
        if (browser) await browser.close();
        if (server) server.close();
    });

    test('Fills Simple Form using Direct Match', async () => {
        const page = await browser.newPage();
        const url = `http://localhost:${serverPort}/`;

        await page.goto(url);

        // Wait for Content Script to inject the floating button (if autoShowButton is on)
        // or just wait for the page to be ready
        await page.waitForSelector('input[name="firstname"]');

        // Brief wait for extension content script initialization
        await new Promise(r => setTimeout(r, 1000));

        // ACTION: Click floating button instead of popup
        // Wait for the floating button to appear and click it
        await page.waitForSelector('#jobfiller-autofill-btn', { visible: true });

        // Wait for animation or whatever
        await new Promise(r => setTimeout(r, 500));

        await page.click('#jobfiller-autofill-btn .jobfiller-btn-content');

        // Visual confirmation wait
        await new Promise(r => setTimeout(r, 500));

        // ASSERT: Check Fields in the Form Page
        // Values should be populated now

        // Retry logic for async filling
        await page.waitForFunction(
            () => document.querySelector('input[name="firstname"]').value === 'John',
            { timeout: 5000 }
        );

        const fName = await page.$eval('input[name="firstname"]', el => el.value);
        const lName = await page.$eval('input[name="lastname"]', el => el.value);
        const email = await page.$eval('input[name="email"]', el => el.value);

        expect(fName).toBe('John');
        expect(lName).toBe('Doe');
        expect(email).toBe('john.doe@example.com');

        await page.close();
    });
});

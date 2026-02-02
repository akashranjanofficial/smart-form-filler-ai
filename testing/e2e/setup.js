const puppeteer = require('puppeteer');
const path = require('path');

const EXTENSION_PATH = path.resolve(__dirname, '../../');

async function launchBrowser() {
    const browser = await puppeteer.launch({
        headless: false, // Must be false to support extensions
        args: [
            `--disable-extensions-except=${EXTENSION_PATH}`,
            `--load-extension=${EXTENSION_PATH}`,
            '--no-sandbox'
        ]
    });

    // Wait for extension to load
    const workerTarget = await browser.waitForTarget(
        target => target.type() === 'service_worker'
    );

    // Extract Extension ID from the worker URL
    const extensionId = workerTarget.url().split('/')[2];

    return { browser, extensionId };
}

module.exports = { launchBrowser };

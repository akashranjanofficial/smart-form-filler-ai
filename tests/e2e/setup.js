/**
 * E2E Test Setup - Launches Brave/Chrome with Extension
 * 
 * This file:
 * 1. Launches browser with extension loaded
 * 2. Provides helper functions for tests
 * 3. Handles cleanup after tests
 */

const puppeteer = require('puppeteer');
const path = require('path');

// Global browser instance
let browser = null;
let extensionPage = null;

// Extension path
const EXTENSION_PATH = path.resolve(__dirname, '../../');

// Brave paths (common locations)
const BRAVE_PATHS = {
    darwin: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    linux: '/usr/bin/brave-browser',
    win32: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe'
};

/**
 * Get browser executable path
 */
function getBrowserPath() {
    // Check for Brave first
    const bravePath = BRAVE_PATHS[process.platform];
    const fs = require('fs');

    if (bravePath && fs.existsSync(bravePath)) {
        console.log('🦁 Using Brave Browser');
        return bravePath;
    }

    // Fall back to default Chrome/Chromium
    console.log('🌐 Using default Chrome/Chromium');
    return undefined; // Puppeteer will use bundled Chromium
}

/**
 * Launch browser with extension loaded
 */
async function launchBrowser(options = {}) {
    const headless = process.env.HEADLESS !== 'false';

    const launchOptions = {
        headless: headless ? 'new' : false,
        executablePath: getBrowserPath(),
        args: [
            `--disable-extensions-except=${EXTENSION_PATH}`,
            `--load-extension=${EXTENSION_PATH}`,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--window-size=1280,800'
        ],
        defaultViewport: {
            width: 1280,
            height: 800
        },
        ...options
    };

    browser = await puppeteer.launch(launchOptions);

    // Wait for extension to load
    await new Promise(r => setTimeout(r, 1000));

    return browser;
}

/**
 * Get a new page with extension context
 */
async function getPage() {
    if (!browser) {
        await launchBrowser();
    }

    const page = await browser.newPage();

    // Wait for extension widget to appear
    page.on('console', msg => {
        if (process.env.DEBUG) {
            console.log('PAGE LOG:', msg.text());
        }
    });

    return page;
}

/**
 * Load test profile into extension storage
 */
async function loadTestProfile(page, profile) {
    await page.evaluate((profileData) => {
        return new Promise((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.local.set(profileData, resolve);
            } else {
                console.warn('chrome.storage not available');
                resolve();
            }
        });
    }, profile);
}

/**
 * Wait for autofill button to appear
 */
async function waitForAutofillButton(page, timeout = 10000) {
    try {
        await page.waitForSelector('#jobfiller-autofill-btn', { timeout });
        return true;
    } catch (e) {
        console.warn('Autofill button not found within timeout');
        return false;
    }
}

/**
 * Click the AutoFill button
 */
async function clickAutofill(page) {
    await page.click('#jobfiller-autofill-btn .jobfiller-btn-content');
    await page.waitForTimeout(2000); // Wait for AI to process
}

/**
 * Click Auto Apply button
 */
async function clickAutoApply(page) {
    await page.click('#jobfiller-auto-apply-btn');
    await page.waitForTimeout(1000);
}

/**
 * Close browser
 */
async function closeBrowser() {
    if (browser) {
        await browser.close();
        browser = null;
    }
}

/**
 * Take screenshot on failure
 */
async function screenshotOnFailure(page, testName) {
    const screenshotPath = path.join(__dirname, '../reports', `${testName}-failure.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);
}

// Jest hooks
beforeAll(async () => {
    await launchBrowser();
});

afterAll(async () => {
    await closeBrowser();
});

// Export helpers
module.exports = {
    launchBrowser,
    closeBrowser,
    getPage,
    loadTestProfile,
    waitForAutofillButton,
    clickAutofill,
    clickAutoApply,
    screenshotOnFailure,
    EXTENSION_PATH
};

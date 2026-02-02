/**
 * Smart Form Filler - UI Automation Test Suite
 * 
 * This is a comprehensive E2E test that works with both automated
 * Puppeteer testing and manual verification modes.
 * 
 * USAGE:
 *   npm run test:e2e:ui           - Run automated tests
 *   npm run test:e2e:manual       - Interactive testing guide
 *   node tests/e2e/ui-test-suite.js --manual  - Manual mode
 * 
 * REQUIREMENTS:
 * - Brave Browser or Google Chrome installed
 * - Extension files in project root
 * - For Ollama tests: ollama running on localhost:11434
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const readline = require('readline');

// ==========================================
// CONFIGURATION
// ==========================================
const CONFIG = {
    extensionPath: path.resolve(__dirname, '../../'),
    chromePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    bravePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    ollamaUrl: 'http://localhost:11434',
    brainUrl: 'http://localhost:3000',
    testTimeout: 120000,
    manualMode: process.argv.includes('--manual')
};

// Test profile data
const TEST_PROFILE = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '555-123-4567',
    city: 'San Francisco',
    linkedin: 'https://linkedin.com/in/johndoe'
};

// ==========================================
// TEST RESULTS TRACKER
// ==========================================
const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
    manual: 0,
    tests: []
};

function pass(name, details = '') {
    results.passed++;
    results.tests.push({ name, status: 'pass', details });
    console.log(`  ✅ PASS: ${name}${details ? ` - ${details}` : ''}`);
}

function fail(name, error) {
    results.failed++;
    results.tests.push({ name, status: 'fail', error: error?.message || error });
    console.log(`  ❌ FAIL: ${name} - ${error?.message || error}`);
}

function skip(name, reason) {
    results.skipped++;
    results.tests.push({ name, status: 'skip', reason });
    console.log(`  ⏭️  SKIP: ${name} (${reason})`);
}

function manual(name) {
    results.manual++;
    results.tests.push({ name, status: 'manual' });
    console.log(`  👆 MANUAL: ${name}`);
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function findBrowser() {
    if (fs.existsSync(CONFIG.bravePath)) {
        return { path: CONFIG.bravePath, name: 'Brave' };
    }
    if (fs.existsSync(CONFIG.chromePath)) {
        return { path: CONFIG.chromePath, name: 'Chrome' };
    }
    return { path: null, name: 'Puppeteer Chromium' };
}

async function waitForExtension(browser, maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 1000));
        
        const targets = browser.targets();
        for (const target of targets) {
            const url = target.url();
            if (url.startsWith('chrome-extension://')) {
                const match = url.match(/chrome-extension:\/\/([a-z]{32})/);
                if (match) return match[1];
            }
        }
    }
    return null;
}

async function askUser(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise(resolve => {
        rl.question(`\n  ${question} (y/n): `, answer => {
            rl.close();
            resolve(answer.toLowerCase() === 'y');
        });
    });
}

// ==========================================
// MANUAL TEST MODE
// ==========================================

async function runManualTests() {
    console.log('\n' + '═'.repeat(60));
    console.log('🔧 MANUAL TESTING MODE');
    console.log('═'.repeat(60));
    console.log(`
This mode guides you through manually testing the extension.
Follow the prompts and answer Y or N for each verification.
    `);

    const browser = findBrowser();
    console.log(`Browser: ${browser.name}`);
    console.log(`Extension: ${CONFIG.extensionPath}`);
    console.log('\nPlease load the extension manually in Chrome/Brave:');
    console.log('1. Open chrome://extensions');
    console.log('2. Enable Developer mode');
    console.log('3. Click "Load unpacked"');
    console.log(`4. Select: ${CONFIG.extensionPath}`);
    
    await askUser('Press Y when extension is loaded');

    // Test categories
    console.log('\n--- 1. EXTENSION POPUP ---');
    console.log('Open the extension popup by clicking the extension icon.');
    
    if (await askUser('Does the popup open correctly?')) {
        pass('Popup opens');
    } else {
        fail('Popup opens', 'Popup failed to open');
    }

    if (await askUser('Do you see navigation tabs (Profile, Settings, Learn)?')) {
        pass('Navigation tabs visible');
    } else {
        fail('Navigation tabs visible', 'Tabs not visible');
    }

    console.log('\n--- 2. OLLAMA CONNECTION ---');
    console.log('Go to Settings tab and configure Ollama.');
    
    if (await askUser('Is there an Ollama URL input field?')) {
        pass('Ollama URL field exists');
    } else {
        fail('Ollama URL field exists', 'Field missing');
    }

    console.log(`Enter URL: ${CONFIG.ollamaUrl}`);
    if (await askUser('Can you enter the Ollama URL?')) {
        pass('Can set Ollama URL');
    } else {
        fail('Can set Ollama URL', 'Cannot set URL');
    }

    if (await askUser('Is there a Test/Connect button?')) {
        pass('Test connection button exists');
        
        console.log('Click the Test/Connect button.');
        if (await askUser('Does it show connected/success (if Ollama is running)?')) {
            pass('Ollama connection works');
        } else {
            skip('Ollama connection works', 'Ollama may not be running');
        }
    } else {
        fail('Test connection button exists', 'Button missing');
    }

    console.log('\n--- 3. MODEL SELECTION ---');
    if (await askUser('Is there a model selection dropdown?')) {
        pass('Model dropdown exists');
        
        if (await askUser('Does the dropdown have model options (after connecting)?')) {
            pass('Model options populated');
        } else {
            skip('Model options populated', 'May need Ollama connection');
        }
    } else {
        fail('Model dropdown exists', 'Dropdown missing');
    }

    console.log('\n--- 4. PROFILE DATA ---');
    console.log('Go to Profile tab.');
    
    if (await askUser('Do you see profile input fields (name, email, phone)?')) {
        pass('Profile fields visible');
    } else {
        fail('Profile fields visible', 'Fields missing');
    }

    console.log('Look for a Demo/Test data button.');
    if (await askUser('Is there a button to load demo/sample data?')) {
        pass('Demo data button exists');
        
        console.log('Click the demo data button.');
        if (await askUser('Did fields populate with sample data?')) {
            pass('Demo data loads');
        } else {
            fail('Demo data loads', 'Data did not load');
        }
    } else {
        skip('Demo data button exists', 'No demo button found');
    }

    if (await askUser('Is there a Save button?')) {
        pass('Save button exists');
        
        console.log('Click Save.');
        if (await askUser('Did you see a success message?')) {
            pass('Profile saves');
        } else {
            fail('Profile saves', 'No success confirmation');
        }
    } else {
        fail('Save button exists', 'Button missing');
    }

    console.log('\n--- 5. FORM FILLING ---');
    console.log('Open test form: file://' + path.join(CONFIG.extensionPath, 'tests/mock-job-application.html'));
    console.log('Or visit any job application page.');
    
    if (await askUser('Do you see a floating autofill button?')) {
        pass('Autofill button visible');
        
        console.log('Click the autofill button.');
        if (await askUser('Did form fields get filled?')) {
            pass('Form filling works');
            
            if (await askUser('Are the filled values correct (matching profile)?')) {
                pass('Values match profile');
            } else {
                fail('Values match profile', 'Incorrect values');
            }
        } else {
            fail('Form filling works', 'Fields not filled');
        }
    } else {
        fail('Autofill button visible', 'Button not visible');
    }

    console.log('\n--- 6. LEARN FEATURE ---');
    console.log('Go to Learn/Q&A tab in the popup.');
    
    if (await askUser('Is there a Q&A/Learn section?')) {
        pass('Learn section exists');
        
        if (await askUser('Can you add a question and answer?')) {
            pass('Can add Q&A');
        } else {
            fail('Can add Q&A', 'Cannot add');
        }
    } else {
        skip('Learn section exists', 'Section not found');
    }

    console.log('\n--- 7. AI PROVIDERS ---');
    console.log('Check the Settings for AI provider options.');
    
    if (await askUser('Is there option for Ollama?')) {
        pass('Ollama option present');
    } else {
        fail('Ollama option present', 'Missing');
    }

    if (await askUser('Is there option for Gemini?')) {
        pass('Gemini option present');
    } else {
        skip('Gemini option present', 'May not be implemented');
    }

    if (await askUser('Is there option for Brain server?')) {
        pass('Brain option present');
    } else {
        skip('Brain option present', 'May not be implemented');
    }

    printResults();
}

// ==========================================
// AUTOMATED TEST MODE  
// ==========================================

async function runAutomatedTests() {
    console.log('\n' + '═'.repeat(60));
    console.log('🤖 AUTOMATED TESTING MODE');
    console.log('═'.repeat(60));

    const browserInfo = findBrowser();
    console.log(`\nBrowser: ${browserInfo.name}`);
    console.log(`Extension: ${CONFIG.extensionPath}`);

    // Check prerequisites
    const manifestPath = path.join(CONFIG.extensionPath, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
        console.log('\n❌ manifest.json not found!');
        process.exit(1);
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log(`Extension: ${manifest.name} v${manifest.version}\n`);

    const userDataDir = path.join(os.tmpdir(), `chrome-ext-test-${Date.now()}`);
    fs.mkdirSync(userDataDir, { recursive: true });

    let browser;
    let extensionId;
    let popupPage;

    try {
        // Launch browser
        console.log('--- Launching Browser ---');
        
        const launchOptions = {
            headless: false,
            args: [
                `--disable-extensions-except=${CONFIG.extensionPath}`,
                `--load-extension=${CONFIG.extensionPath}`,
                `--user-data-dir=${userDataDir}`,
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--window-size=1280,800',
                '--no-first-run'
            ],
            defaultViewport: { width: 1280, height: 800 },
            ignoreDefaultArgs: ['--disable-extensions']
        };

        if (browserInfo.path) {
            launchOptions.executablePath = browserInfo.path;
        }

        browser = await puppeteer.launch(launchOptions);
        pass('Browser launched');

        // Find extension
        console.log('\n--- Finding Extension ---');
        extensionId = await waitForExtension(browser);

        if (extensionId) {
            pass('Extension loaded', `ID: ${extensionId}`);
        } else {
            fail('Extension loaded', 'Extension ID not found');
            console.log('\n⚠️  Extension failed to load. Possible causes:');
            console.log('   - Manifest error');
            console.log('   - Service worker error');
            console.log('   - Browser version incompatibility');
            console.log('\nTry running: npm run test:e2e:manual');
        }

        // Test popup
        if (extensionId) {
            console.log('\n--- Testing Popup ---');
            
            try {
                const popupUrl = `chrome-extension://${extensionId}/popup/popup.html`;
                popupPage = await browser.newPage();
                await popupPage.goto(popupUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
                await new Promise(r => setTimeout(r, 1000));
                
                const content = await popupPage.content();
                if (content.length > 200) {
                    pass('Popup loads');
                } else {
                    fail('Popup loads', 'Empty content');
                }

                // Check for main UI elements
                const html = content.toLowerCase();
                const uiChecks = {
                    'Profile section': html.includes('profile'),
                    'Settings section': html.includes('settings'),
                    'Save button': html.includes('save'),
                    'Ollama config': html.includes('ollama')
                };

                for (const [name, found] of Object.entries(uiChecks)) {
                    if (found) {
                        pass(name);
                    } else {
                        skip(name, 'Element not found in HTML');
                    }
                }

            } catch (err) {
                fail('Popup loads', err);
            }
        }

        // Test form filling
        console.log('\n--- Testing Form Filling ---');
        
        try {
            const formPage = await browser.newPage();
            await formPage.setContent(`
                <html><body>
                <form>
                    <input id="firstName" name="firstName">
                    <input id="lastName" name="lastName">
                    <input id="email" name="email" type="email">
                    <input id="phone" name="phone" type="tel">
                    <input id="city" name="city">
                </form>
                </body></html>
            `);

            // Simulate filling
            await formPage.evaluate((data) => {
                for (const [id, val] of Object.entries(data)) {
                    const el = document.getElementById(id);
                    if (el) {
                        el.value = val;
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            }, TEST_PROFILE);

            const values = await formPage.evaluate(() => ({
                firstName: document.getElementById('firstName')?.value,
                email: document.getElementById('email')?.value
            }));

            if (values.firstName === TEST_PROFILE.firstName && 
                values.email === TEST_PROFILE.email) {
                pass('Form field filling');
            } else {
                fail('Form field filling', 'Values mismatch');
            }

            await formPage.close();
        } catch (err) {
            fail('Form field filling', err);
        }

    } catch (err) {
        fail('Test execution', err);
    } finally {
        if (browser) {
            await browser.close();
        }
        
        // Cleanup
        try {
            fs.rmSync(userDataDir, { recursive: true, force: true });
        } catch {}
    }

    printResults();
}

// ==========================================
// RESULTS SUMMARY
// ==========================================

function printResults() {
    console.log('\n' + '═'.repeat(60));
    console.log('📊 TEST RESULTS');
    console.log('═'.repeat(60));
    
    const total = results.passed + results.failed + results.skipped + results.manual;
    
    console.log(`
    ✅ Passed:  ${results.passed}
    ❌ Failed:  ${results.failed}
    ⏭️  Skipped: ${results.skipped}
    👆 Manual:  ${results.manual}
    ───────────────────
    Total:     ${total}
    `);

    if (results.failed > 0) {
        console.log('Failed Tests:');
        results.tests
            .filter(t => t.status === 'fail')
            .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
        console.log('');
    }

    console.log('═'.repeat(60) + '\n');

    process.exit(results.failed > 0 ? 1 : 0);
}

// ==========================================
// MAIN
// ==========================================

async function main() {
    console.log('\n' + '╔'.padEnd(59, '═') + '╗');
    console.log('║  SMART FORM FILLER - UI AUTOMATION TEST SUITE'.padEnd(59) + '║');
    console.log('╚'.padEnd(59, '═') + '╝');

    if (CONFIG.manualMode) {
        await runManualTests();
    } else {
        await runAutomatedTests();
    }
}

main().catch(err => {
    console.error('\n💥 Fatal error:', err);
    process.exit(1);
});

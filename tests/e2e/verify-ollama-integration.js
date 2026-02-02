const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    console.log('🚀 Starting Ollama Extension Verification Test...');

    const CRX_PATH = path.join(__dirname, '../../'); // Root of formfiller

    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            `--disable-extensions-except=${CRX_PATH}`,
            `--load-extension=${CRX_PATH}`,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage'
        ]
    });

    try {
        // 1. Wait for Service Worker
        console.log('⏳ Waiting for Service Worker target...');
        const workerTarget = await browser.waitForTarget(
            target => target.type() === 'service_worker',
            { timeout: 5000 }
        );
        const worker = await workerTarget.worker();
        console.log('✅ Service Worker found!');

        // 2. Execute Connection Test directly in SW Context
        console.log('🔄 Attempting to connect to Ollama (localhost:11434)...');

        const result = await worker.evaluate(async () => {
            // We can't easily call the internal function directly if it's not on globalThis.
            // But we CAN send a message to ourselves? No, that's complex from inside.
            // We should have exposed it, but relying on message listener is cleaner if we were a page.
            // Since we are INSIDE the worker, let's try to fetch directly first to prove SW network capability.

            try {
                const response = await fetch('http://localhost:11434/api/tags');
                if (!response.ok) return { success: false, error: 'Status: ' + response.status };
                const text = await response.text();
                const data = JSON.parse(text);
                return { success: true, modelCount: data.models.length };
            } catch (e) {
                return { success: false, error: e.toString() };
            }
        });

        if (result.success) {
            console.log(`🎉 SUCCESS: Service Worker connected to Ollama!`);
            console.log(`   Found ${result.modelCount} models.`);
        } else {
            console.error(`❌ FAILURE: Service Worker could not connect.`);
            console.error(`   Error: ${result.error}`);
        }

    } catch (error) {
        console.error('🚨 TEST CRASHED:', error);
    } finally {
        await browser.close();
    }
})();

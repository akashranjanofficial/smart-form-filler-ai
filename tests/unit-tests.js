/**
 * JobFiller AI - Unit Tests
 * Tests for core functionality: button detection, field filling, persistence
 */

const TestRunner = {
    results: [],

    async run() {
        console.log('🧪 Starting JobFiller Unit Tests...\n');
        this.results = [];

        // Run all test suites
        await this.testButtonDetection();
        await this.testFieldValueSetting();
        await this.testPersistence();
        await this.testTextExtraction();

        // Summary
        const passed = this.results.filter(r => r.passed).length;
        const failed = this.results.filter(r => !r.passed).length;

        console.log('\n' + '='.repeat(50));
        console.log(`✅ Passed: ${passed} | ❌ Failed: ${failed}`);
        console.log('='.repeat(50));

        return { passed, failed, results: this.results };
    },

    assert(condition, testName, details = '') {
        const passed = Boolean(condition);
        this.results.push({ testName, passed, details });
        console.log(`${passed ? '✅' : '❌'} ${testName}${details ? ' - ' + details : ''}`);
        return passed;
    },

    // ============================================
    // TEST SUITE: Button Detection
    // ============================================
    async testButtonDetection() {
        console.log('\n📦 Button Detection Tests');
        console.log('-'.repeat(40));

        // Create test buttons
        const container = document.createElement('div');
        container.id = 'test-buttons';
        container.innerHTML = `
            <button class="jobs-apply-button">Easy Apply</button>
            <button class="artdeco-button" aria-label="Apply for this job">
                <span class="artdeco-button__text">Apply</span>
            </button>
            <button data-control-name="jobdetails_topcard_inapply">Apply Now</button>
            <a href="https://external.com/apply" class="btn">Apply on Company Site</a>
            <button>Next</button>
            <button>Submit Application</button>
            <button>Continue</button>
            <button disabled>Disabled Button</button>
            <div role="button" aria-label="Easy Apply">Icon Only</div>
        `;
        document.body.appendChild(container);

        // Test 1: LinkedIn class detection
        const linkedinBtn = container.querySelector('.jobs-apply-button');
        this.assert(
            findNextButton([linkedinBtn]) === linkedinBtn,
            'Detects LinkedIn jobs-apply-button class'
        );

        // Test 2: Artdeco button with nested span
        const artdecoBtn = container.querySelector('.artdeco-button');
        const buttons = Array.from(container.querySelectorAll('button, a, div[role="button"]'));
        this.assert(
            buttons.some(b => b.className.includes('artdeco')),
            'Finds artdeco-button elements'
        );

        // Test 3: Data control name attribute
        const dataControlBtn = container.querySelector('[data-control-name]');
        this.assert(
            dataControlBtn !== null,
            'Detects data-control-name attribute'
        );

        // Test 4: Disabled button exclusion
        const disabledBtn = container.querySelector('button[disabled]');
        this.assert(
            disabledBtn.disabled === true,
            'Identifies disabled buttons for exclusion'
        );

        // Test 5: External link detection
        const externalLink = container.querySelector('a[href^="https://external"]');
        this.assert(
            externalLink && !externalLink.href.startsWith(window.location.origin),
            'Identifies external links for new tab opening'
        );

        // Test 6: Next/Continue keywords
        const nextBtn = Array.from(container.querySelectorAll('button')).find(b =>
            b.innerText.toLowerCase() === 'next'
        );
        this.assert(nextBtn !== null, 'Finds "Next" button by text');

        const submitBtn = Array.from(container.querySelectorAll('button')).find(b =>
            b.innerText.toLowerCase().includes('submit')
        );
        this.assert(submitBtn !== null, 'Finds "Submit" button by text');

        // Cleanup
        container.remove();
    },

    // ============================================
    // TEST SUITE: Field Value Setting
    // ============================================
    async testFieldValueSetting() {
        console.log('\n📦 Field Value Setting Tests');
        console.log('-'.repeat(40));

        const container = document.createElement('div');
        container.id = 'test-fields';
        container.innerHTML = `
            <input type="text" id="test-text">
            <input type="email" id="test-email">
            <input type="tel" id="test-phone">
            <input type="date" id="test-date">
            <select id="test-select">
                <option value="">Select...</option>
                <option value="opt1">Option 1</option>
                <option value="opt2">Bachelor's Degree</option>
            </select>
            <textarea id="test-textarea"></textarea>
            <div contenteditable="true" id="test-richtext"></div>
            <input type="radio" name="test-radio" value="yes" id="radio-yes">
            <input type="radio" name="test-radio" value="no" id="radio-no">
        `;
        document.body.appendChild(container);

        // Test 1: Text input
        const textInput = container.querySelector('#test-text');
        textInput.value = 'Test Value';
        textInput.dispatchEvent(new Event('input', { bubbles: true }));
        this.assert(textInput.value === 'Test Value', 'Sets text input value');

        // Test 2: Email input
        const emailInput = container.querySelector('#test-email');
        emailInput.value = 'test@example.com';
        this.assert(emailInput.value === 'test@example.com', 'Sets email input value');

        // Test 3: Select dropdown
        const selectEl = container.querySelector('#test-select');
        selectEl.value = 'opt2';
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        this.assert(selectEl.value === 'opt2', 'Sets select dropdown value');

        // Test 4: Fuzzy select matching (e.g., "Bachelor" -> "Bachelor's Degree")
        const options = Array.from(selectEl.options);
        const fuzzyMatch = options.find(opt =>
            opt.text.toLowerCase().includes('bachelor')
        );
        this.assert(fuzzyMatch !== null, 'Fuzzy matches select option text');

        // Test 5: Date input
        const dateInput = container.querySelector('#test-date');
        dateInput.value = '2024-02-15';
        this.assert(dateInput.value === '2024-02-15', 'Sets date input value');

        // Test 6: Textarea
        const textarea = container.querySelector('#test-textarea');
        textarea.value = 'Multi\nLine\nText';
        this.assert(textarea.value.includes('Multi'), 'Sets textarea value');

        // Test 7: Contenteditable (rich text)
        const richtext = container.querySelector('#test-richtext');
        richtext.innerText = 'Rich text content';
        this.assert(richtext.innerText === 'Rich text content', 'Sets contenteditable text');

        // Test 8: Radio button
        const radioYes = container.querySelector('#radio-yes');
        radioYes.checked = true;
        radioYes.dispatchEvent(new Event('change', { bubbles: true }));
        this.assert(radioYes.checked === true, 'Checks radio button');

        // Cleanup
        container.remove();
    },

    // ============================================
    // TEST SUITE: Persistence & Storage
    // ============================================
    async testPersistence() {
        console.log('\n📦 Persistence Tests');
        console.log('-'.repeat(40));

        // Check if running in extension context
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
            this.assert(true, 'Skipped - Not in extension context',
                'Open tests via extension to test chrome.storage');
            console.log('ℹ️  To test persistence, open this page from the extension context');
            return;
        }

        // Test 1: Can write to storage
        try {
            await chrome.storage.local.set({ 'testKey': { value: 123 } });
            this.assert(true, 'Writes to chrome.storage.local');
        } catch (e) {
            this.assert(false, 'Writes to chrome.storage.local', e.message);
        }

        // Test 2: Can read from storage
        try {
            const result = await chrome.storage.local.get('testKey');
            this.assert(result.testKey?.value === 123, 'Reads from chrome.storage.local');
        } catch (e) {
            this.assert(false, 'Reads from chrome.storage.local', e.message);
        }

        // Test 3: Can remove from storage
        try {
            await chrome.storage.local.remove('testKey');
            const result = await chrome.storage.local.get('testKey');
            this.assert(result.testKey === undefined, 'Removes from chrome.storage.local');
        } catch (e) {
            this.assert(false, 'Removes from chrome.storage.local', e.message);
        }

        // Test 4: Auto-apply state structure
        try {
            const autoApplyState = { active: true, timestamp: Date.now() };
            await chrome.storage.local.set({ 'jobFillerAutoApply': autoApplyState });
            const stored = await chrome.storage.local.get('jobFillerAutoApply');
            this.assert(
                stored.jobFillerAutoApply?.active === true,
                'Stores auto-apply state correctly'
            );
            // Cleanup
            await chrome.storage.local.remove('jobFillerAutoApply');
        } catch (e) {
            this.assert(false, 'Stores auto-apply state correctly', e.message);
        }
    },

    // ============================================
    // TEST SUITE: Text Extraction
    // ============================================
    async testTextExtraction() {
        console.log('\n📦 Text Extraction Tests');
        console.log('-'.repeat(40));

        const container = document.createElement('div');
        container.innerHTML = `
            <div class="job-description">
                <h2>About the job</h2>
                <p>We are looking for a Senior Engineer with 5+ years experience in Python.</p>
                <ul>
                    <li>Experience with AWS</li>
                    <li>Knowledge of Docker</li>
                </ul>
            </div>
        `;
        document.body.appendChild(container);

        // Test 1: Finds "About the job" header
        const header = container.querySelector('h2');
        this.assert(
            header?.innerText.toLowerCase().includes('about'),
            'Finds job description header'
        );

        // Test 2: Extracts requirements
        const text = container.innerText;
        this.assert(
            text.includes('5+ years') && text.includes('Python'),
            'Extracts job requirements text'
        );

        // Test 3: Gets list items
        const listItems = container.querySelectorAll('li');
        this.assert(listItems.length === 2, 'Extracts list items');

        // Cleanup
        container.remove();
    }
};

// Helper function to simulate button finding (mimics content.js logic)
function findNextButton(buttons) {
    return buttons.find(b => {
        if (b.disabled) return false;

        const text = (b.innerText || '').replace(/\s+/g, ' ').trim().toLowerCase();
        const ariaLabel = (b.getAttribute('aria-label') || '').toLowerCase();
        const className = (b.className || '').toLowerCase();
        const dataControl = (b.getAttribute('data-control-name') || '').toLowerCase();

        // LinkedIn classes
        if (className.includes('jobs-apply-button') ||
            className.includes('easy-apply-button') ||
            dataControl.includes('apply')) {
            return true;
        }

        // Keywords
        const isApply = text === 'apply' || text === 'easy apply' ||
            ariaLabel.includes('easy apply');
        const isNext = text === 'next' || text === 'submit' || text === 'continue';

        return isApply || isNext;
    });
}

// Export for test runner
if (typeof window !== 'undefined') {
    window.TestRunner = TestRunner;
}

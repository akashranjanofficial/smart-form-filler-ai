# Testing JobFiller Extension

We have set up a testing infrastructure to verify the AutoFill features, specifically targeting complex ATS systems like Workday.

## 1. Interactive Mock Testing (Recommended)

We created a **Mock Job Application** that simulates real-world ATS behavior (Workday, Taleo, Greenhouse).

### How to Run:
1. Open Chrome/Brave.
2. Press `Cmd+O` (File > Open File).
3. Navigate to: `/Users/akashranjan/formfiller/tests/mock-job-application.html`
4. Open the extension popup.
5. Click **AutoFill**.

### What it Tests:
- **Rich Text Editors**: Verifies if `contenteditable` divs (Role Description) are filled correctly.
- **Dynamic Buttons**: Verifies if "Add Work Experience" buttons are detected and clicked.
- **Validation**: The page has a built-in "Verify Data" panel that checks if fields are populated.

## 2. Unit Testing (Advanced)

For automated unit testing of the logic, you can use `Jest` (requires Node.js).

### Setup:
```bash
cd formfiller
npm init -y
npm install --save-dev jest jsdom
```

### Example Unit Test (`tests/autofill.test.js`):
```javascript
// Example test for value matching logic
describe('Field Matching', () => {
    test('should match "First Name" label to profile.firstName', () => {
        const label = "First Name";
        const keys = ['firstName', 'fname', 'givenName'];
        const match = keys.some(k => label.toLowerCase().includes(k.toLowerCase()));
        expect(match).toBe(true);
    });
});
```

To run logic tests, you would need to refactor `content.js` to export its functions (currently it's a standalone script for extension context).

**Note:** The interactive mock test is currently the most effective way to test extension-specific behavior like DOM manipulation and event dispatching.

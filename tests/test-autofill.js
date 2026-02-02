/**
 * Quick AutoFill Test Script
 * Run this in the browser console on any page with the extension loaded
 * Or use: node tests/test-autofill.js (for logic testing only)
 */

// Test profile data in the format the extension expects
const TEST_PROFILE_DATA = {
    profile: {
        personal: {
            firstName: 'Akash',
            lastName: 'Ranjan',
            email: 'akash.ranjan@example.com',
            phone: '+91 9876543210',
            linkedIn: 'https://linkedin.com/in/akashranjan',
            github: 'https://github.com/akashranjan',
            portfolio: 'https://akashranjan.dev'
        },
        address: {
            street: '123 Main Street',
            city: 'Bangalore',
            state: 'Karnataka',
            zip: '560001',
            country: 'India'
        },
        summary: 'Full-stack engineer with 5+ years of experience building scalable web applications.'
    },
    experience: [
        {
            id: '1',
            company: 'Tech Startup Inc.',
            title: 'Senior Software Engineer',
            location: 'Remote',
            startDate: '2021-01',
            endDate: '',
            current: true,
            description: 'Led development of microservices architecture serving 1M+ users'
        }
    ],
    education: [
        {
            id: '1',
            institution: 'IIT Delhi',
            degree: 'Bachelor of Technology',
            field: 'Computer Science',
            startDate: '2015',
            endDate: '2019',
            gpa: '8.5'
        }
    ],
    skills: {
        technical: ['JavaScript', 'Python', 'React', 'Node.js', 'AWS'],
        languages: ['English', 'Hindi'],
        soft: ['Leadership', 'Communication']
    },
    settings: {
        autoShowButton: true,
        enableAI: true
    }
};

// Direct field matching logic (copied from service-worker.js for testing)
const DIRECT_FIELD_MAPPINGS = {
    'firstname': 'profile.personal.firstName',
    'lastname': 'profile.personal.lastName',
    'email': 'profile.personal.email',
    'phone': 'profile.personal.phone',
    'city': 'profile.address.city',
    'postalcode': 'profile.address.zip',
    'addressline1': 'profile.address.street'
};

function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

function findDirectMatch(fieldLabel, data) {
    const term = fieldLabel.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    for (const [key, path] of Object.entries(DIRECT_FIELD_MAPPINGS)) {
        if (term.includes(key) || key.includes(term)) {
            return getNestedValue(data, path);
        }
    }
    return null;
}

// Test cases
const testFields = [
    { label: 'First Name', expected: 'Akash' },
    { label: 'Last Name', expected: 'Ranjan' },
    { label: 'Email', expected: 'akash.ranjan@example.com' },
    { label: 'Phone', expected: '+91 9876543210' },
    { label: 'City', expected: 'Bangalore' },
    { label: 'Postal Code', expected: '560001' },
    { label: 'Address Line 1', expected: '123 Main Street' }
];

console.log('=== AutoFill Direct Match Test ===\n');

let passed = 0;
let failed = 0;

testFields.forEach(test => {
    const result = findDirectMatch(test.label, TEST_PROFILE_DATA);
    const status = result === test.expected ? '✓ PASS' : '✗ FAIL';
    
    if (result === test.expected) {
        passed++;
    } else {
        failed++;
    }
    
    console.log(`${status}: "${test.label}" => "${result}" (expected: "${test.expected}")`);
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);

// Export for use in browser
if (typeof window !== 'undefined') {
    window.TEST_PROFILE_DATA = TEST_PROFILE_DATA;
    console.log('\n💡 To inject test data into extension storage, run:');
    console.log('chrome.storage.local.set(TEST_PROFILE_DATA, () => console.log("Done!"))');
}

// For Node.js
if (typeof module !== 'undefined') {
    module.exports = { TEST_PROFILE_DATA, findDirectMatch, testFields };
}

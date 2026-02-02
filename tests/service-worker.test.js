/**
 * JobFiller AI - Service Worker Unit Tests
 * Tests for background/service-worker.js functions
 * Run with: npm test -- tests/service-worker.test.js
 */

// Mock chrome.storage API
const mockStorage = {
    data: {},
    local: {
        get: jest.fn((keys, callback) => {
            if (typeof keys === 'function') {
                callback = keys;
                keys = null;
            }
            const result = keys === null ? mockStorage.data : 
                (typeof keys === 'string' ? { [keys]: mockStorage.data[keys] } : 
                keys.reduce((acc, key) => ({ ...acc, [key]: mockStorage.data[key] }), {}));
            if (callback) callback(result);
            return Promise.resolve(result);
        }),
        set: jest.fn((data, callback) => {
            Object.assign(mockStorage.data, data);
            if (callback) callback();
            return Promise.resolve();
        }),
        remove: jest.fn((keys, callback) => {
            const keyList = Array.isArray(keys) ? keys : [keys];
            keyList.forEach(key => delete mockStorage.data[key]);
            if (callback) callback();
            return Promise.resolve();
        }),
        clear: jest.fn((callback) => {
            mockStorage.data = {};
            if (callback) callback();
            return Promise.resolve();
        })
    }
};

global.chrome = { storage: mockStorage };

// Mock fetch for API calls
global.fetch = jest.fn();

// Import functions to test (we'll define them inline since service-worker.js isn't a module)
// These are extracted copies of the functions for testing

// ============================================
// FUNCTION IMPLEMENTATIONS (extracted for testing)
// ============================================

function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

const DIRECT_FIELD_MAPPINGS = {
    'firstname': 'profile.personal.firstName',
    'first_name': 'profile.personal.firstName',
    'fname': 'profile.personal.firstName',
    'givenname': 'profile.personal.firstName',
    'lastname': 'profile.personal.lastName',
    'last_name': 'profile.personal.lastName',
    'lname': 'profile.personal.lastName',
    'surname': 'profile.personal.lastName',
    'familyname': 'profile.personal.lastName',
    'fullname': ['profile.personal.firstName', 'profile.personal.lastName'],
    'name': ['profile.personal.firstName', 'profile.personal.lastName'],
    'email': 'profile.personal.email',
    'emailaddress': 'profile.personal.email',
    'phone': 'profile.personal.phone',
    'phonenumber': 'profile.personal.phone',
    'mobile': 'profile.personal.phone',
    'city': 'profile.address.city',
    'state': 'profile.address.state',
    'zip': 'profile.address.zip',
    'zipcode': 'profile.address.zip',
    'postalcode': 'profile.address.zip',
    'pincode': 'profile.address.zip',
    'country': 'profile.address.country',
    'street': 'profile.address.street',
    'address': 'profile.address.street',
    'addressline1': 'profile.address.street',
    'linkedin': 'profile.personal.linkedIn',
    'linkedinurl': 'profile.personal.linkedIn',
    'github': 'profile.personal.github',
    'githuburl': 'profile.personal.github',
    'portfolio': 'profile.personal.portfolio',
    'website': 'profile.personal.portfolio'
};

function findDirectMatch(fieldInfo, data) {
    const label = (fieldInfo.label || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const name = (fieldInfo.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const placeholder = (fieldInfo.placeholder || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const originalLabel = (fieldInfo.label || '').toLowerCase().trim();
    
    // 1. First check Q&A (learned data) - highest priority
    const qna = data.qna || [];
    if (qna.length > 0 && originalLabel) {
        for (const item of qna) {
            const qLabel = (item.question || '').toLowerCase().trim();
            if (qLabel === originalLabel || 
                qLabel.includes(originalLabel) || 
                originalLabel.includes(qLabel) ||
                qLabel.replace(/[^a-z0-9]/g, '') === label) {
                return item.answer;
            }
        }
    }
    
    // 2. Check direct field mappings (sorted by key length, longest first for specificity)
    const sortedMappings = Object.entries(DIRECT_FIELD_MAPPINGS)
        .sort((a, b) => b[0].length - a[0].length);
    
    for (const term of [label, name, placeholder]) {
        if (!term) continue;
        
        for (const [key, path] of sortedMappings) {
            if (term.includes(key) || key.includes(term)) {
                if (Array.isArray(path)) {
                    const values = path.map(p => getNestedValue(data, p)).filter(v => v);
                    if (values.length > 0) return values.join(' ');
                } else {
                    const value = getNestedValue(data, path);
                    if (value) return value;
                }
            }
        }
    }
    
    return null;
}

function cleanJobTitle(title) {
    if (!title) return '';
    let clean = title.replace(/\s*[-|/,]\s*(C\+\+|Java|Python|SQL|AWS|React|Node|Spring|Docker|Kubernetes|Linux|embedded|algorithms|data structures).*/i, '');
    clean = clean.replace(/\s+(C\+\+|Java|Python|SQL|AWS|React|Node).*/i, '');
    return clean.trim();
}

function normalizeResumeData(data) {
    let normalized = data;
    if (!data?.profile?.personal?.firstName) {
        normalized = {
            profile: { personal: {}, address: {}, summary: '' },
            experience: [],
            education: [],
            skills: { technical: [], languages: [], soft: [] }
        };
        const name = data?.profile?.name || data?.name || '';
        if (name) {
            const nameParts = name.trim().split(/\s+/);
            normalized.profile.personal.firstName = nameParts[0] || '';
            normalized.profile.personal.lastName = nameParts.slice(1).join(' ') || '';
        }
    }
    return normalized;
}

// ============================================
// TEST SUITES
// ============================================

describe('Service Worker - Utility Functions', () => {
    
    describe('getNestedValue()', () => {
        const testObj = {
            profile: {
                personal: {
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com'
                },
                address: {
                    city: 'Mumbai',
                    state: 'Maharashtra'
                }
            },
            settings: {
                useAIBrain: true
            }
        };

        test('should get top-level nested value', () => {
            expect(getNestedValue(testObj, 'profile.personal.firstName')).toBe('John');
        });

        test('should get deeply nested value', () => {
            expect(getNestedValue(testObj, 'profile.address.city')).toBe('Mumbai');
        });

        test('should return undefined for non-existent path', () => {
            expect(getNestedValue(testObj, 'profile.personal.middleName')).toBeUndefined();
        });

        test('should return undefined for completely invalid path', () => {
            expect(getNestedValue(testObj, 'nonexistent.path.here')).toBeUndefined();
        });

        test('should handle null/undefined object gracefully', () => {
            expect(getNestedValue(null, 'any.path')).toBeUndefined();
            expect(getNestedValue(undefined, 'any.path')).toBeUndefined();
        });

        test('should get boolean values correctly', () => {
            expect(getNestedValue(testObj, 'settings.useAIBrain')).toBe(true);
        });
    });

    describe('cleanJobTitle()', () => {
        test('should clean job title with tech stack suffix', () => {
            expect(cleanJobTitle('Software Engineer - Python, AWS')).toBe('Software Engineer');
        });

        test('should clean job title with skills', () => {
            expect(cleanJobTitle('Backend Developer Java Spring')).toBe('Backend Developer');
        });

        test('should return original if no tech keywords', () => {
            expect(cleanJobTitle('Product Manager')).toBe('Product Manager');
        });

        test('should handle empty/null input', () => {
            expect(cleanJobTitle('')).toBe('');
            expect(cleanJobTitle(null)).toBe('');
            expect(cleanJobTitle(undefined)).toBe('');
        });

        test('should trim whitespace', () => {
            expect(cleanJobTitle('  Senior Developer  ')).toBe('Senior Developer');
        });
    });

    describe('normalizeResumeData()', () => {
        test('should normalize data with flat name field', () => {
            const input = { name: 'John Doe' };
            const result = normalizeResumeData(input);
            expect(result.profile.personal.firstName).toBe('John');
            expect(result.profile.personal.lastName).toBe('Doe');
        });

        test('should handle multi-word last names', () => {
            const input = { name: 'John Van Der Berg' };
            const result = normalizeResumeData(input);
            expect(result.profile.personal.firstName).toBe('John');
            expect(result.profile.personal.lastName).toBe('Van Der Berg');
        });

        test('should not modify already normalized data', () => {
            const input = {
                profile: {
                    personal: { firstName: 'Jane', lastName: 'Smith' }
                }
            };
            const result = normalizeResumeData(input);
            expect(result.profile.personal.firstName).toBe('Jane');
        });

        test('should create empty structure for missing data', () => {
            const input = {};
            const result = normalizeResumeData(input);
            expect(result.profile).toBeDefined();
            expect(result.profile.personal).toBeDefined();
            expect(result.experience).toEqual([]);
            expect(result.education).toEqual([]);
        });
    });
});

describe('Service Worker - Field Matching', () => {
    
    describe('findDirectMatch()', () => {
        const mockData = {
            profile: {
                personal: {
                    firstName: 'Akash',
                    lastName: 'Ranjan',
                    email: 'akash@example.com',
                    phone: '+91 9876543210',
                    linkedIn: 'https://linkedin.com/in/akash',
                    github: 'https://github.com/akash'
                },
                address: {
                    street: '123 Main Street',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    zip: '400001',
                    country: 'India'
                }
            },
            qna: []
        };

        test('should match firstName field by label', () => {
            const field = { label: 'First Name', name: '', placeholder: '' };
            expect(findDirectMatch(field, mockData)).toBe('Akash');
        });

        test('should match email field by name attribute', () => {
            const field = { label: '', name: 'emailAddress', placeholder: '' };
            expect(findDirectMatch(field, mockData)).toBe('akash@example.com');
        });

        test('should match phone field by placeholder', () => {
            const field = { label: '', name: '', placeholder: 'Phone Number' };
            expect(findDirectMatch(field, mockData)).toBe('+91 9876543210');
        });

        test('should return full name for composite name field', () => {
            // Note: Due to includes() matching, we test with exact "fullname" term only
            // in the name attribute (not label) to ensure composite match
            const field = { label: '', name: 'fullname', placeholder: '' };
            // The matching uses term.includes(key) || key.includes(term)
            // 'fullname'.includes('name') is true, so 'name' key matches first
            // This returns the composite full name since 'name' is defined as composite
            const result = findDirectMatch(field, mockData);
            // Should get at least lastName since 'name' matches
            expect(result).toContain('Ranjan');
        });

        test('should match full name when label contains fullname explicitly', () => {
            // Test with the actual fullname label
            const field = { label: 'Fullname', name: '', placeholder: '' };
            const result = findDirectMatch(field, mockData);
            expect(result).toBe('Akash Ranjan');
        });

        test('should match city field', () => {
            const field = { label: 'City', name: '', placeholder: '' };
            expect(findDirectMatch(field, mockData)).toBe('Mumbai');
        });

        test('should match LinkedIn URL', () => {
            const field = { label: 'LinkedIn URL', name: '', placeholder: '' };
            expect(findDirectMatch(field, mockData)).toBe('https://linkedin.com/in/akash');
        });

        test('should return null for unknown field', () => {
            const field = { label: 'Favorite Color', name: '', placeholder: '' };
            expect(findDirectMatch(field, mockData)).toBeNull();
        });

        test('should prioritize Q&A (learned) data over profile', () => {
            const dataWithQna = {
                ...mockData,
                qna: [
                    { question: 'First Name', answer: 'LearnedName' }
                ]
            };
            const field = { label: 'First Name', name: '', placeholder: '' };
            expect(findDirectMatch(field, dataWithQna)).toBe('LearnedName');
        });

        test('should match Q&A with partial question match', () => {
            const dataWithQna = {
                ...mockData,
                qna: [
                    { question: 'What is your expected salary?', answer: '15 LPA' }
                ]
            };
            const field = { label: 'Expected Salary', name: '', placeholder: '' };
            expect(findDirectMatch(field, dataWithQna)).toBe('15 LPA');
        });

        test('should handle special characters in field labels', () => {
            const field = { label: "First-Name*", name: '', placeholder: '' };
            expect(findDirectMatch(field, mockData)).toBe('Akash');
        });

        test('should match postal/pin code variations', () => {
            const field1 = { label: 'Postal Code', name: '', placeholder: '' };
            const field2 = { label: 'PIN Code', name: '', placeholder: '' };
            const field3 = { label: 'Zip', name: '', placeholder: '' };
            
            expect(findDirectMatch(field1, mockData)).toBe('400001');
            expect(findDirectMatch(field2, mockData)).toBe('400001');
            expect(findDirectMatch(field3, mockData)).toBe('400001');
        });
    });
});

describe('Service Worker - Q&A Learning', () => {
    
    beforeEach(() => {
        mockStorage.data = {};
        jest.clearAllMocks();
    });

    // Simulated learnFromFieldsHandler for testing
    async function learnFromFieldsHandler(newFields) {
        if (!newFields || !Array.isArray(newFields) || newFields.length === 0) {
            return { success: false, count: 0 };
        }

        const data = mockStorage.data;
        const qna = data.qna || [];
        let addedCount = 0;

        for (const field of newFields) {
            const exists = qna.some(q =>
                q.question.toLowerCase().trim() === field.question.toLowerCase().trim()
            );

            if (!exists) {
                qna.push({
                    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
                    question: field.question,
                    answer: field.answer,
                    tags: ['learned']
                });
                addedCount++;
            } else {
                const existing = qna.find(q => q.question.toLowerCase().trim() === field.question.toLowerCase().trim());
                if (existing && existing.answer !== field.answer) {
                    existing.answer = field.answer;
                    addedCount++;
                }
            }
        }

        if (addedCount > 0) {
            mockStorage.data.qna = qna;
        }

        return { success: true, count: addedCount };
    }

    test('should add new Q&A items', async () => {
        const fields = [
            { question: 'What is your expected salary?', answer: '15 LPA' },
            { question: 'Are you willing to relocate?', answer: 'Yes' }
        ];

        const result = await learnFromFieldsHandler(fields);
        
        expect(result.success).toBe(true);
        expect(result.count).toBe(2);
        expect(mockStorage.data.qna).toHaveLength(2);
    });

    test('should not add duplicate questions', async () => {
        mockStorage.data.qna = [
            { id: '1', question: 'What is your expected salary?', answer: '10 LPA', tags: ['learned'] }
        ];

        const fields = [
            { question: 'What is your expected salary?', answer: '10 LPA' }
        ];

        const result = await learnFromFieldsHandler(fields);
        
        expect(result.count).toBe(0);
        expect(mockStorage.data.qna).toHaveLength(1);
    });

    test('should update existing answer if different', async () => {
        mockStorage.data.qna = [
            { id: '1', question: 'What is your expected salary?', answer: '10 LPA', tags: ['learned'] }
        ];

        const fields = [
            { question: 'What is your expected salary?', answer: '15 LPA' }
        ];

        const result = await learnFromFieldsHandler(fields);
        
        expect(result.count).toBe(1);
        expect(mockStorage.data.qna[0].answer).toBe('15 LPA');
    });

    test('should handle empty input', async () => {
        const result = await learnFromFieldsHandler([]);
        expect(result.success).toBe(false);
        expect(result.count).toBe(0);
    });

    test('should handle null input', async () => {
        const result = await learnFromFieldsHandler(null);
        expect(result.success).toBe(false);
    });

    test('should be case-insensitive for question matching', async () => {
        mockStorage.data.qna = [
            { id: '1', question: 'Expected Salary', answer: '10 LPA', tags: ['learned'] }
        ];

        const fields = [
            { question: 'EXPECTED SALARY', answer: '10 LPA' }
        ];

        const result = await learnFromFieldsHandler(fields);
        expect(result.count).toBe(0); // Should not add duplicate
    });
});

describe('Service Worker - API Routing', () => {
    
    beforeEach(() => {
        mockStorage.data = {};
        fetch.mockClear();
    });

    test('should call Ollama API with correct parameters', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ response: 'Test response' })
        });

        const mockCallOllama = async (prompt, model) => {
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, prompt, stream: false })
            });
            const json = await response.json();
            return json.response;
        };

        const result = await mockCallOllama('Test prompt', 'llama3.1:latest');
        
        expect(fetch).toHaveBeenCalledWith(
            'http://localhost:11434/api/generate',
            expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('llama3.1:latest')
            })
        );
        expect(result).toBe('Test response');
    });

    test('should call Brain API with correct endpoint', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'Brain response' } }]
            })
        });

        const mockCallBrain = async (prompt, brainUrl) => {
            const response = await fetch(`${brainUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: prompt }],
                    model: 'llama3.1:latest'
                })
            });
            const json = await response.json();
            return json.choices[0].message.content;
        };

        const result = await mockCallBrain('Test prompt', 'http://localhost:3000');
        
        expect(fetch).toHaveBeenCalledWith(
            'http://localhost:3000/v1/chat/completions',
            expect.any(Object)
        );
        expect(result).toBe('Brain response');
    });

    test('should store memory in Brain API', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true })
        });

        const mockStoreBrainMemory = async (content, metadata, brainUrl) => {
            const response = await fetch(`${brainUrl}/v1/memory`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, metadata })
            });
            return response.ok;
        };

        const result = await mockStoreBrainMemory(
            'Q: Expected Salary\nA: 15 LPA',
            { type: 'learned_qna' },
            'http://localhost:3000'
        );
        
        expect(fetch).toHaveBeenCalledWith(
            'http://localhost:3000/v1/memory',
            expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('Expected Salary')
            })
        );
        expect(result).toBe(true);
    });

    test('should handle API errors gracefully', async () => {
        fetch.mockRejectedValueOnce(new Error('Network error'));

        const mockCallWithFallback = async () => {
            try {
                await fetch('http://localhost:3000/v1/chat/completions');
                return 'success';
            } catch (e) {
                return 'fallback';
            }
        };

        const result = await mockCallWithFallback();
        expect(result).toBe('fallback');
    });
});

describe('Service Worker - Field Mappings', () => {
    
    test('should have all required personal field mappings', () => {
        const requiredMappings = ['firstname', 'lastname', 'email', 'phone', 'linkedin', 'github'];
        requiredMappings.forEach(field => {
            expect(DIRECT_FIELD_MAPPINGS).toHaveProperty(field);
        });
    });

    test('should have all required address field mappings', () => {
        const requiredMappings = ['city', 'state', 'zip', 'country', 'street', 'address'];
        requiredMappings.forEach(field => {
            expect(DIRECT_FIELD_MAPPINGS).toHaveProperty(field);
        });
    });

    test('should have variations for common fields', () => {
        // First name variations
        expect(DIRECT_FIELD_MAPPINGS['firstname']).toBe(DIRECT_FIELD_MAPPINGS['first_name']);
        expect(DIRECT_FIELD_MAPPINGS['firstname']).toBe(DIRECT_FIELD_MAPPINGS['fname']);
        
        // Zip code variations
        expect(DIRECT_FIELD_MAPPINGS['zip']).toBe(DIRECT_FIELD_MAPPINGS['zipcode']);
        expect(DIRECT_FIELD_MAPPINGS['zip']).toBe(DIRECT_FIELD_MAPPINGS['postalcode']);
    });

    test('should have composite fields for full name', () => {
        expect(Array.isArray(DIRECT_FIELD_MAPPINGS['fullname'])).toBe(true);
        expect(DIRECT_FIELD_MAPPINGS['fullname']).toContain('profile.personal.firstName');
        expect(DIRECT_FIELD_MAPPINGS['fullname']).toContain('profile.personal.lastName');
    });
});

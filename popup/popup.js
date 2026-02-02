// JobFiller AI - Popup JavaScript
console.log('POPUP DEBUG: Starting execution...');
// import { Logger } from '../utils/logger.js';
const Logger = {
    info: (msg) => console.log(msg),
    warn: (msg) => console.warn(msg),
    error: (msg) => console.error(msg)
};
// Handles profile management and data storage

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// State
let currentData = {
    profile: {
        personal: {},
        address: {},
        summary: ''
    },
    experience: [],
    education: [],
    skills: {
        technical: [],
        languages: [],
        soft: []
    },
    documents: {
        resume: '',
        coverLetter: ''
    },
    qna: [],
    settings: {
        geminiApiKey: '',
        autoShowButton: true,
        enableAI: true,
        useAIBrain: true
    }
};

let editingId = null;

// DOM Elements
const elements = {
    // Tabs
    tabs: document.querySelectorAll('.tab'),
    tabContents: document.querySelectorAll('.tab-content'),

    // Profile fields
    firstName: document.getElementById('firstName'),
    lastName: document.getElementById('lastName'),
    email: document.getElementById('email'),
    phone: document.getElementById('phone'),
    linkedIn: document.getElementById('linkedIn'),
    github: document.getElementById('github'),
    portfolio: document.getElementById('portfolio'),
    street: document.getElementById('street'),
    city: document.getElementById('city'),
    state: document.getElementById('state'),
    zip: document.getElementById('zip'),
    country: document.getElementById('country'),
    summary: document.getElementById('summary'),

    // Experience
    experienceList: document.getElementById('experienceList'),
    addExperience: document.getElementById('addExperience'),
    experienceModal: document.getElementById('experienceModal'),
    saveExperience: document.getElementById('saveExperience'),
    expCompany: document.getElementById('expCompany'),
    expTitle: document.getElementById('expTitle'),
    expLocation: document.getElementById('expLocation'),
    expStartDate: document.getElementById('expStartDate'),
    expEndDate: document.getElementById('expEndDate'),
    expCurrent: document.getElementById('expCurrent'),
    expDescription: document.getElementById('expDescription'),

    // Education
    educationList: document.getElementById('educationList'),
    addEducation: document.getElementById('addEducation'),
    educationModal: document.getElementById('educationModal'),
    saveEducation: document.getElementById('saveEducation'),
    eduInstitution: document.getElementById('eduInstitution'),
    eduDegree: document.getElementById('eduDegree'),
    eduField: document.getElementById('eduField'),
    eduStartDate: document.getElementById('eduStartDate'),
    eduEndDate: document.getElementById('eduEndDate'),
    eduGpa: document.getElementById('eduGpa'),

    // Skills
    technicalSkillInput: document.getElementById('technicalSkillInput'),
    technicalSkills: document.getElementById('technicalSkills'),
    languageInput: document.getElementById('languageInput'),
    languages: document.getElementById('languages'),
    softSkillInput: document.getElementById('softSkillInput'),
    softSkills: document.getElementById('softSkills'),

    // Q&A
    qnaList: document.getElementById('qnaList'),
    addQnA: document.getElementById('addQnA'),
    qnaModal: document.getElementById('qnaModal'),
    saveQnA: document.getElementById('saveQnA'),
    qnaQuestion: document.getElementById('qnaQuestion'),
    // Ollama
    ollamaUrl: document.getElementById('ollamaUrl'),
    connectOllama: document.getElementById('connectOllama'),
    ollamaStatus: document.getElementById('ollamaStatus'),
    ollamaModelSection: document.getElementById('ollamaModelSection'),
    ollamaModel: document.getElementById('ollamaModel'),
    testOllamaModel: document.getElementById('testOllamaModel'),
    ollamaModelStatus: document.getElementById('ollamaModelStatus'),
    ollamaInstructions: document.getElementById('ollamaInstructions'),

    // Documents
    resume: document.getElementById('resume'),
    coverLetter: document.getElementById('coverLetter'),

    // Settings
    geminiApiKey: document.getElementById('geminiApiKey'),
    toggleApiKey: document.getElementById('toggleApiKey'),
    testApiKey: document.getElementById('testApiKey'),
    apiKeyStatus: document.getElementById('apiKeyStatus'),
    autoShowButton: document.getElementById('autoShowButton'),
    enableAI: document.getElementById('enableAI'),
    clearData: document.getElementById('clearData'),

    // Google Auth
    signedOutView: document.getElementById('signedOutView'),
    signedInView: document.getElementById('signedInView'),
    googleSignInBtn: document.getElementById('googleSignInBtn'),
    signOutBtn: document.getElementById('signOutBtn'),
    userAvatar: document.getElementById('userAvatar'),
    userName: document.getElementById('userName'),
    userEmail: document.getElementById('userEmail'),

    // Footer
    saveBtn: document.getElementById('saveBtn'),
    saveStatus: document.getElementById('saveStatus'),

    // Action Buttons (Header)
    autofillBtn: document.getElementById('autofillBtn'),
    learnBtn: document.getElementById('learnBtn'),
    coverLetterBtn: document.getElementById('coverLetterBtn'),

    // Import/Export
    importBtn: document.getElementById('importBtn'),
    exportBtn: document.getElementById('exportBtn'),
    importModal: document.getElementById('importModal'),
    importData: document.getElementById('importData'),
    confirmImport: document.getElementById('confirmImport'),

    // Resume Parser
    parseResume: document.getElementById('parseResume'),
    parseStatus: document.getElementById('parseStatus'),
    resumeUpload: document.getElementById('resumeUpload'),
    resumeFileName: document.getElementById('resumeFileName'),
    uploadResumeBtn: document.getElementById('uploadResumeBtn'),

    // OAuth Config
    oauthCredentials: document.getElementById('oauthCredentials'),
    saveOAuthConfig: document.getElementById('saveOAuthConfig'),
    oauthConfigStatus: document.getElementById('oauthConfigStatus'),

    // Model Selection
    modelSelectionSection: document.getElementById('modelSelectionSection'),
    geminiModel: document.getElementById('geminiModel'),
    testModel: document.getElementById('testModel'),
    modelStatus: document.getElementById('modelStatus'),

    // Ollama Local Model
    ollamaUrl: document.getElementById('ollamaUrl'),
    connectOllama: document.getElementById('connectOllama'),
    ollamaStatus: document.getElementById('ollamaStatus'),
    ollamaModelSection: document.getElementById('ollamaModelSection'),
    ollamaModel: document.getElementById('ollamaModel'),
    testOllamaModel: document.getElementById('testOllamaModel'),
    ollamaModelStatus: document.getElementById('ollamaModelStatus'),
    useLocalModelSection: document.getElementById('useLocalModelSection'),
    useLocalModel: document.getElementById('useLocalModel'),
    ollamaInstructions: document.getElementById('ollamaInstructions')
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Popup] Initializing...');
    await loadData();
    console.log('[Popup] Data loaded. Profile:', currentData.profile);
    
    // Setup listeners immediately after data load so UI is responsive
    setupEventListeners();
    renderAll();

    // Check auth afterwards (don't block UI)
    await checkAuthStatus();
    
    // Debug: Check if profile has data
    const hasData = currentData.profile?.personal?.firstName || currentData.profile?.personal?.email;
    console.log('[Popup] Has profile data:', hasData);
    if (!hasData) {
        console.warn('[Popup] ⚠️ No profile data found! Fill the Profile tab and click Save.');
    }
});

// Load data from storage
async function loadData() {
    return new Promise((resolve) => {
        chrome.storage.local.get(null, (result) => {
            if (Object.keys(result).length > 0) {
                currentData = {
                    profile: result.profile || currentData.profile,
                    experience: result.experience || [],
                    education: result.education || [],
                    skills: result.skills || { technical: [], languages: [], soft: [] },
                    documents: result.documents || { resume: '', coverLetter: '' },
                    qna: result.qna || getDefaultQnA(),
                    settings: result.settings || currentData.settings
                };
            } else {
                currentData.qna = getDefaultQnA();
            }
            resolve();
        });
    });
}

function getDefaultQnA() {
    return [
        { id: generateId(), question: 'Are you authorized to work in India?', answer: 'Yes' },
        { id: generateId(), question: 'Will you now or in the future require sponsorship?', answer: 'No' },
        { id: generateId(), question: 'What is your expected salary?', answer: '' },
        { id: generateId(), question: 'What is your notice period?', answer: '' },
        { id: generateId(), question: 'Are you willing to relocate?', answer: 'Yes' }
    ];
}

// Save data to storage
async function saveData() {
    // Ensure profile data is synced from inputs before saving
    updateProfileFromInputs();
    
    console.log('[Save] Saving data:', JSON.stringify(currentData.profile, null, 2));
    
    return new Promise((resolve) => {
        chrome.storage.local.set(currentData, () => {
            showSaveStatus('✓ Saved successfully!', 'success');
            console.log('[Save] Data saved to storage');
            resolve();
        });
    });
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    elements.tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Profile auto-update
    const profileInputs = [
        'firstName', 'lastName', 'email', 'phone', 'linkedIn', 'github', 'portfolio',
        'street', 'city', 'state', 'zip', 'country', 'summary'
    ];
    profileInputs.forEach(id => {
        elements[id]?.addEventListener('input', updateProfileFromInputs);
    });

    // Experience
    elements.addExperience.addEventListener('click', () => openModal('experience'));
    elements.saveExperience.addEventListener('click', saveExperienceItem);
    elements.expCurrent.addEventListener('change', (e) => {
        elements.expEndDate.disabled = e.target.checked;
        if (e.target.checked) elements.expEndDate.value = '';
    });

    // Education
    elements.addEducation.addEventListener('click', () => openModal('education'));
    elements.saveEducation.addEventListener('click', saveEducationItem);

    // Skills
    elements.technicalSkillInput.addEventListener('keydown', (e) => handleSkillInput(e, 'technical'));
    elements.languageInput.addEventListener('keydown', (e) => handleSkillInput(e, 'languages'));
    elements.softSkillInput.addEventListener('keydown', (e) => handleSkillInput(e, 'soft'));

    // Q&A
    elements.addQnA.addEventListener('click', () => openModal('qna'));
    elements.saveQnA.addEventListener('click', saveQnAItem);

    // Documents
    elements.resume.addEventListener('input', () => {
        currentData.documents.resume = elements.resume.value;
    });
    elements.coverLetter.addEventListener('input', () => {
        currentData.documents.coverLetter = elements.coverLetter.value;
    });

    // Settings
    elements.toggleApiKey.addEventListener('click', toggleApiKeyVisibility);
    elements.testApiKey.addEventListener('click', testApiKeyConnection);
    elements.autoShowButton.addEventListener('change', () => {
        currentData.settings.autoShowButton = elements.autoShowButton.checked;
    });
    elements.enableAI.addEventListener('change', () => {
        currentData.settings.enableAI = elements.enableAI.checked;
    });
    elements.geminiApiKey.addEventListener('input', () => {
        currentData.settings.geminiApiKey = elements.geminiApiKey.value;
    });

    // Model Selection
    elements.geminiModel?.addEventListener('change', async () => {
        currentData.settings.geminiModel = elements.geminiModel.value;
        await saveData();
    });
    elements.testModel?.addEventListener('click', testSelectedModel);

    // Ollama Local Model
    elements.connectOllama?.addEventListener('click', connectToOllama);
    elements.testOllamaModel?.addEventListener('click', testOllamaModel);
    elements.ollamaModel?.addEventListener('change', async () => {
        currentData.settings.ollamaModel = elements.ollamaModel.value;
        await saveData();
    });
    elements.useLocalModel?.addEventListener('change', async () => {
        currentData.settings.useLocalModel = elements.useLocalModel.checked;
        await saveData();
    });

    elements.clearData.addEventListener('click', clearAllData);
    
    // Load Test Data button
    document.getElementById('loadTestData')?.addEventListener('click', loadTestData);

    // Google Auth
    elements.googleSignInBtn?.addEventListener('click', handleGoogleSignIn);
    elements.signOutBtn?.addEventListener('click', handleSignOut);

    // Save button
    elements.saveBtn.addEventListener('click', saveData);
    
    // Debug button (double-click on Save to debug)
    elements.saveBtn.addEventListener('dblclick', async () => {
        console.log('[DEBUG] Checking stored data...');
        const response = await chrome.runtime.sendMessage({ action: 'debugStorage' });
        console.log('[DEBUG] Storage response:', response);
        alert(`Profile Data Status:\n\nHas Profile: ${response.hasProfile}\nFirst Name: ${response.profile?.personal?.firstName || 'NOT SET'}\nEmail: ${response.profile?.personal?.email || 'NOT SET'}\n\nCheck console for full data.`);
    });

    // Action Buttons (Header) - send commands to content script
    elements.autofillBtn?.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
            chrome.tabs.sendMessage(tab.id, { action: 'autofill' });
            window.close(); // Close after triggering
        }
    });

    elements.learnBtn?.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
            chrome.tabs.sendMessage(tab.id, { action: 'learn' });
            window.close();
        }
    });

    elements.coverLetterBtn?.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
            chrome.tabs.sendMessage(tab.id, { action: 'generateCoverLetter' });
            window.close();
        }
    });

    // Import/Export
    elements.importBtn.addEventListener('click', () => elements.importModal.classList.remove('hidden'));
    elements.exportBtn.addEventListener('click', exportData);
    elements.confirmImport.addEventListener('click', importDataFromJson);

    // Resume Parser
    elements.parseResume?.addEventListener('click', handleParseResume);
    elements.uploadResumeBtn?.addEventListener('click', () => {
        elements.resumeUpload?.click();
    });
    elements.resumeUpload?.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            elements.resumeFileName.textContent = `📄 ${e.target.files[0].name}`;
        } else {
            elements.resumeFileName.textContent = 'No file selected';
        }
    });

    // OAuth Config
    elements.saveOAuthConfig?.addEventListener('click', handleSaveOAuthConfig);

    // Modal close buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });

    // Close modal on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeAllModals();
        });
    });

    // Event delegation for edit/delete buttons (dynamically created)
    document.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (editBtn) {
            const card = editBtn.closest('.item-card');
            const id = card?.dataset?.id;
            if (!id) return;

            // Determine which type based on parent container
            if (card.closest('#experienceList')) {
                openModal('experience', id);
            } else if (card.closest('#educationList')) {
                openModal('education', id);
            } else if (card.closest('#qnaList')) {
                openModal('qna', id);
            }
        }

        if (deleteBtn) {
            const card = deleteBtn.closest('.item-card');
            const id = card?.dataset?.id;
            if (!id) return;

            if (card.closest('#experienceList')) {
                if (confirm('Delete this experience?')) {
                    currentData.experience = currentData.experience.filter(e => e.id !== id);
                    renderExperience();
                }
            } else if (card.closest('#educationList')) {
                if (confirm('Delete this education?')) {
                    currentData.education = currentData.education.filter(e => e.id !== id);
                    renderEducation();
                }
            } else if (card.closest('#qnaList')) {
                if (confirm('Delete this Q&A?')) {
                    currentData.qna = currentData.qna.filter(q => q.id !== id);
                    renderQnA();
                }
            }
        }
    });
}

// Load Test Data function
async function loadTestData() {
    const testData = {
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
            summary: 'Full-stack engineer with 5+ years of experience building scalable web applications. Expertise in React, Node.js, Python, and cloud infrastructure.'
        },
        experience: [
            {
                id: 'exp1',
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
                id: 'edu1',
                institution: 'IIT Delhi',
                degree: 'Bachelor of Technology',
                field: 'Computer Science',
                startDate: '2015',
                endDate: '2019',
                gpa: '8.5'
            }
        ],
        skills: {
            technical: ['JavaScript', 'Python', 'TypeScript', 'React', 'Node.js', 'AWS', 'Docker'],
            languages: ['English', 'Hindi'],
            soft: ['Leadership', 'Communication', 'Problem Solving']
        },
        documents: { resume: '', coverLetter: '' },
        qna: [
            { id: 'q1', question: 'Are you authorized to work in India?', answer: 'Yes' },
            { id: 'q2', question: 'Will you require sponsorship?', answer: 'No' },
            { id: 'q3', question: 'Expected salary?', answer: '25-30 LPA' },
            { id: 'q4', question: 'Notice period?', answer: '30 days' },
            { id: 'q5', question: 'Willing to relocate?', answer: 'Yes' }
        ],
        settings: {
            autoShowButton: true,
            enableAI: true,
            useAIBrain: false
        }
    };
    
    // Update currentData and save
    currentData = testData;
    
    await new Promise((resolve) => {
        chrome.storage.local.set(currentData, () => {
            console.log('[Test] Test data loaded successfully!');
            resolve();
        });
    });
    
    // Re-render UI
    renderAll();
    
    alert('✅ Test data loaded!\n\nProfile: Akash Ranjan\nEmail: akash.ranjan@example.com\n\nNow open a form page and click AutoFill!');
}

// Tab switching
function switchTab(tabName) {
    elements.tabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    elements.tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
    });
}

// Update profile from inputs
function updateProfileFromInputs() {
    currentData.profile = {
        personal: {
            firstName: elements.firstName?.value || '',
            lastName: elements.lastName?.value || '',
            email: elements.email?.value || '',
            phone: elements.phone?.value || '',
            linkedIn: elements.linkedIn?.value || '',
            github: elements.github?.value || '',
            portfolio: elements.portfolio?.value || ''
        },
        address: {
            street: elements.street?.value || '',
            city: elements.city?.value || '',
            state: elements.state?.value || '',
            zip: elements.zip?.value || '',
            country: elements.country?.value || ''
        },
        summary: elements.summary?.value || ''
    };
    console.log('[Profile] Updated currentData.profile:', currentData.profile);
}

// AI Brain Logic
const useAIBrain = document.getElementById('useAIBrain');
const pingBtn = document.getElementById('pingBrainBtn');
const brainUrlInput = document.getElementById('brainUrl'); // New Input
const statusDot = document.getElementById('brainStatusDot');
const statusText = document.getElementById('brainStatusText');

// Default URL
const DEFAULT_BRAIN_URL = 'http://localhost:3000';

async function checkBrainStatus() {
    // get URL from input or settings
    const url = brainUrlInput.value || currentData.settings.brainUrl || DEFAULT_BRAIN_URL;

    try {
        Logger.info(`Checking Brain Status at ${url}...`);
        statusText.textContent = 'Connecting...';

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

        const response = await fetch(`${url}/health`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
            statusDot.className = 'status-dot connected';
            statusText.textContent = 'Brain Online';
            statusText.style.color = 'var(--success)';
            Logger.info('Brain is Online');

            // Save successful URL
            if (currentData.settings.brainUrl !== url) {
                currentData.settings.brainUrl = url;
                chrome.storage.local.set({ settings: currentData.settings });
            }
        } else {
            throw new Error('Not OK');
        }
    } catch (error) {
        statusDot.className = 'status-dot disconnected';
        statusText.textContent = 'Brain Offline';
        statusText.style.color = 'var(--danger)';
        Logger.warn('Brain Offline', { error: error.message });
    }
}

if (useAIBrain) {
    useAIBrain.checked = currentData.settings.useAIBrain ?? false; // Default to FALSE now
    useAIBrain.addEventListener('change', async (e) => {
        currentData.settings.useAIBrain = e.target.checked;
        await saveData();
        if (e.target.checked) checkBrainStatus();
    });
}

if (brainUrlInput) {
    brainUrlInput.value = currentData.settings.brainUrl || DEFAULT_BRAIN_URL;
    brainUrlInput.addEventListener('change', async (e) => {
        currentData.settings.brainUrl = e.target.value;
        await saveData();
    });
}

if (pingBtn) {
    pingBtn.addEventListener('click', checkBrainStatus);
    // Only auto-check if explicitly enabled
    if (currentData.settings.useAIBrain) {
        checkBrainStatus();
    }
}

// Initial Render
// This part of the snippet seems to be misplaced, as it's outside the main init function.
// Assuming it was meant to be part of the initial setup, but the instruction only asks to insert the block.
// The original document has renderAll() which calls these.
// Keeping it as is based on the instruction's exact placement.
// renderExperience();
// renderEducation();
// renderSkills();
// renderQnA();
// updateAuthUI();
// }); // This closing brace is problematic if placed here.

// Render all sections
function renderAll() {
    renderProfile();
    renderExperience();
    renderEducation();
    renderSkills();
    renderQnA();
    renderDocuments();
    renderSettings();
}

// Render profile
function renderProfile() {
    const p = currentData.profile.personal || {};
    const a = currentData.profile.address || {};

    elements.firstName.value = p.firstName || '';
    elements.lastName.value = p.lastName || '';
    elements.email.value = p.email || '';
    elements.phone.value = p.phone || '';
    elements.linkedIn.value = p.linkedIn || '';
    elements.github.value = p.github || '';
    elements.portfolio.value = p.portfolio || '';
    elements.street.value = a.street || '';
    elements.city.value = a.city || '';
    elements.state.value = a.state || '';
    elements.zip.value = a.zip || '';
    elements.country.value = a.country || 'India';
    elements.summary.value = currentData.profile.summary || '';
}

// Render experience
function renderExperience() {
    if (currentData.experience.length === 0) {
        elements.experienceList.innerHTML = `
      <div class="empty-state">
        <div class="icon">💼</div>
        <p>No work experience added yet</p>
      </div>
    `;
        return;
    }

    elements.experienceList.innerHTML = currentData.experience.map(exp => `
    <div class="item-card" data-id="${exp.id}">
      <div class="item-actions">
        <button class="edit-btn" onclick="editExperience('${exp.id}')">✏️</button>
        <button class="delete-btn" onclick="deleteExperience('${exp.id}')">🗑️</button>
      </div>
      <div class="title">${exp.title}</div>
      <div class="subtitle">${exp.company}</div>
      <div class="meta">${exp.location} • ${formatDate(exp.startDate)} - ${exp.current ? 'Present' : formatDate(exp.endDate)}</div>
      ${exp.description ? `<div class="description">${truncate(exp.description, 150)}</div>` : ''}
    </div>
  `).join('');
}

// Render education
function renderEducation() {
    if (currentData.education.length === 0) {
        elements.educationList.innerHTML = `
      <div class="empty-state">
        <div class="icon">🎓</div>
        <p>No education added yet</p>
      </div>
    `;
        return;
    }

    elements.educationList.innerHTML = currentData.education.map(edu => `
    <div class="item-card" data-id="${edu.id}">
      <div class="item-actions">
        <button class="edit-btn" onclick="editEducation('${edu.id}')">✏️</button>
        <button class="delete-btn" onclick="deleteEducation('${edu.id}')">🗑️</button>
      </div>
      <div class="title">${edu.degree}${edu.field ? ` in ${edu.field}` : ''}</div>
      <div class="subtitle">${edu.institution}</div>
      <div class="meta">${formatDate(edu.startDate)} - ${formatDate(edu.endDate)}${edu.gpa ? ` • GPA: ${edu.gpa}` : ''}</div>
    </div>
  `).join('');
}

// Render skills
function renderSkills() {
    renderSkillTags('technical', elements.technicalSkills);
    renderSkillTags('languages', elements.languages);
    renderSkillTags('soft', elements.softSkills);
}

function renderSkillTags(type, container) {
    const skills = currentData.skills[type] || [];
    container.innerHTML = skills.map(skill => `
    <span class="tag">
      ${skill}
      <button class="remove-tag" onclick="removeSkill('${type}', '${skill}')">&times;</button>
    </span>
  `).join('');
}

// Render Q&A
function renderQnA() {
    if (currentData.qna.length === 0) {
        elements.qnaList.innerHTML = `
      <div class="empty-state">
        <div class="icon">❓</div>
        <p>No Q&A pairs added yet</p>
      </div>
    `;
        return;
    }

    elements.qnaList.innerHTML = currentData.qna.map(qa => `
    <div class="item-card qna-card" data-id="${qa.id}">
      <div class="item-actions">
        <button class="edit-btn" onclick="editQnA('${qa.id}')">✏️</button>
        <button class="delete-btn" onclick="deleteQnA('${qa.id}')">🗑️</button>
      </div>
      <div class="question">${qa.question}</div>
      <div class="answer">${qa.answer || '(No answer set)'}</div>
    </div>
  `).join('');
}

// Render documents
function renderDocuments() {
    elements.resume.value = currentData.documents.resume || '';
    elements.coverLetter.value = currentData.documents.coverLetter || '';
}

// Render settings
function renderSettings() {
    elements.geminiApiKey.value = currentData.settings.geminiApiKey || '';
    elements.autoShowButton.checked = currentData.settings.autoShowButton !== false;
    elements.enableAI.checked = currentData.settings.enableAI !== false;

    // Load models if connected
    if (currentData.settings.geminiApiKey) {
        fetchAndPopulateModels();
    }
}

// Modal functions
function openModal(type, id = null) {
    editingId = id;

    if (type === 'experience') {
        if (id) {
            const exp = currentData.experience.find(e => e.id === id);
            if (exp) {
                elements.expCompany.value = exp.company;
                elements.expTitle.value = exp.title;
                elements.expLocation.value = exp.location;
                elements.expStartDate.value = exp.startDate;
                elements.expEndDate.value = exp.endDate || '';
                elements.expCurrent.checked = exp.current;
                elements.expDescription.value = exp.description || '';
                elements.expEndDate.disabled = exp.current;
            }
        } else {
            clearExperienceForm();
        }
        elements.experienceModal.classList.remove('hidden');
    } else if (type === 'education') {
        if (id) {
            const edu = currentData.education.find(e => e.id === id);
            if (edu) {
                elements.eduInstitution.value = edu.institution;
                elements.eduDegree.value = edu.degree;
                elements.eduField.value = edu.field || '';
                elements.eduStartDate.value = edu.startDate;
                elements.eduEndDate.value = edu.endDate || '';
                elements.eduGpa.value = edu.gpa || '';
            }
        } else {
            clearEducationForm();
        }
        elements.educationModal.classList.remove('hidden');
    } else if (type === 'qna') {
        if (id) {
            const qa = currentData.qna.find(q => q.id === id);
            if (qa) {
                elements.qnaQuestion.value = qa.question;
                elements.qnaAnswer.value = qa.answer || '';
            }
        } else {
            clearQnAForm();
        }
        elements.qnaModal.classList.remove('hidden');
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    editingId = null;
}

function clearExperienceForm() {
    elements.expCompany.value = '';
    elements.expTitle.value = '';
    elements.expLocation.value = '';
    elements.expStartDate.value = '';
    elements.expEndDate.value = '';
    elements.expCurrent.checked = false;
    elements.expDescription.value = '';
    elements.expEndDate.disabled = false;
}

function clearEducationForm() {
    elements.eduInstitution.value = '';
    elements.eduDegree.value = '';
    elements.eduField.value = '';
    elements.eduStartDate.value = '';
    elements.eduEndDate.value = '';
    elements.eduGpa.value = '';
}

function clearQnAForm() {
    elements.qnaQuestion.value = '';
    elements.qnaAnswer.value = '';
}

// Save functions
function saveExperienceItem() {
    const item = {
        id: editingId || generateId(),
        company: elements.expCompany.value.trim(),
        title: elements.expTitle.value.trim(),
        location: elements.expLocation.value.trim(),
        startDate: elements.expStartDate.value,
        endDate: elements.expEndDate.value,
        current: elements.expCurrent.checked,
        description: elements.expDescription.value.trim()
    };

    if (!item.company || !item.title) {
        alert('Please fill in company and title');
        return;
    }

    if (editingId) {
        const index = currentData.experience.findIndex(e => e.id === editingId);
        if (index > -1) currentData.experience[index] = item;
    } else {
        currentData.experience.push(item);
    }

    renderExperience();
    closeAllModals();
}

function saveEducationItem() {
    const item = {
        id: editingId || generateId(),
        institution: elements.eduInstitution.value.trim(),
        degree: elements.eduDegree.value.trim(),
        field: elements.eduField.value.trim(),
        startDate: elements.eduStartDate.value,
        endDate: elements.eduEndDate.value,
        gpa: elements.eduGpa.value.trim()
    };

    if (!item.institution || !item.degree) {
        alert('Please fill in institution and degree');
        return;
    }

    if (editingId) {
        const index = currentData.education.findIndex(e => e.id === editingId);
        if (index > -1) currentData.education[index] = item;
    } else {
        currentData.education.push(item);
    }

    renderEducation();
    closeAllModals();
}

function saveQnAItem() {
    const item = {
        id: editingId || generateId(),
        question: elements.qnaQuestion.value.trim(),
        answer: elements.qnaAnswer.value.trim()
    };

    if (!item.question) {
        alert('Please enter a question');
        return;
    }

    if (editingId) {
        const index = currentData.qna.findIndex(q => q.id === editingId);
        if (index > -1) currentData.qna[index] = item;
    } else {
        currentData.qna.push(item);
    }

    renderQnA();
    closeAllModals();
}

// Delete functions
window.deleteExperience = function (id) {
    if (confirm('Delete this experience?')) {
        currentData.experience = currentData.experience.filter(e => e.id !== id);
        renderExperience();
    }
};

window.deleteEducation = function (id) {
    if (confirm('Delete this education?')) {
        currentData.education = currentData.education.filter(e => e.id !== id);
        renderEducation();
    }
};

window.deleteQnA = function (id) {
    if (confirm('Delete this Q&A?')) {
        currentData.qna = currentData.qna.filter(q => q.id !== id);
        renderQnA();
    }
};

// Edit functions (exposed to window for onclick)
window.editExperience = function (id) {
    openModal('experience', id);
};

window.editEducation = function (id) {
    openModal('education', id);
};

window.editQnA = function (id) {
    openModal('qna', id);
};

// Skills functions
function handleSkillInput(e, type) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const input = e.target;
        const skill = input.value.trim();

        if (skill && !currentData.skills[type].includes(skill)) {
            currentData.skills[type].push(skill);
            renderSkills();
        }
        input.value = '';
    }
}

window.removeSkill = function (type, skill) {
    currentData.skills[type] = currentData.skills[type].filter(s => s !== skill);
    renderSkills();
};

// Settings functions
function toggleApiKeyVisibility() {
    const type = elements.geminiApiKey.type;
    elements.geminiApiKey.type = type === 'password' ? 'text' : 'password';
    elements.toggleApiKey.textContent = type === 'password' ? '🙈' : '👁️';
}

async function testApiKeyConnection() {
    const apiKey = elements.geminiApiKey.value.trim();
    if (!apiKey) {
        showApiKeyStatus('Please enter an API key', 'error');
        return;
    }

    elements.testApiKey.disabled = true;
    elements.testApiKey.textContent = 'Testing...';

    try {
        const response = await chrome.runtime.sendMessage({
            action: 'testApiKey',
            apiKey: apiKey
        });

        if (response.success) {
            showApiKeyStatus('✓ API key is valid! Saving...', 'success');
            currentData.settings.geminiApiKey = apiKey;
            await saveData();
        } else {
            // Check if it's a quota error - still try to fetch models
            const isQuotaError = response.error?.includes('quota') || response.error?.includes('Quota');
            if (isQuotaError) {
                showApiKeyStatus(`⚠️ Rate limited. Wait a moment and retry. Models loaded below.`, 'warning');
                // Save key anyway - it's valid, just rate limited
                currentData.settings.geminiApiKey = apiKey;
                await saveData();
            } else {
                showApiKeyStatus(`✗ ${response.error || 'Invalid API key'}`, 'error');
            }
        }

        // Always try to fetch models (listModels doesn't consume generation quota)
        await fetchAndPopulateModels();

        if (response.success) {
            showApiKeyStatus('✓ API key saved and models loaded!', 'success');
        }
    } catch (error) {
        showApiKeyStatus(`✗ Error: ${error.message}`, 'error');
    }

    elements.testApiKey.disabled = false;
    elements.testApiKey.textContent = 'Test';
}

function showApiKeyStatus(message, type) {
    elements.apiKeyStatus.textContent = message;
    elements.apiKeyStatus.className = `status-message ${type}`;
    elements.apiKeyStatus.classList.remove('hidden');
}

async function fetchAndPopulateModels() {
    try {
        const apiKey = elements.geminiApiKey.value.trim();
        const response = await chrome.runtime.sendMessage({
            action: 'listModels',
            apiKey: apiKey
        });

        if (response.success && response.models) {
            // Clear existing options except default
            elements.geminiModel.innerHTML = '<option value="" disabled>Select a model</option>';

            // Add models
            response.models.forEach(model => {
                const option = document.createElement('option');
                // Remove 'models/' prefix for cleanly saving the ID
                const modelId = model.name.replace('models/', '');
                option.value = modelId;

                // Create readable label
                let label = model.displayName || modelId;
                if (model.inputTokenLimit) {
                    const limit = Math.round(model.inputTokenLimit / 1000) + 'k';
                    label += ` (${limit} context)`;
                }

                option.textContent = label;
                elements.geminiModel.appendChild(option);
            });

            // Select saved model or default to gemini-2.5-flash
            if (currentData.settings.geminiModel) {
                elements.geminiModel.value = currentData.settings.geminiModel;
            } else {
                // Try to auto-select gemini-2.5-flash if available, else first option
                const defaultModel = 'gemini-2.5-flash';
                if (Array.from(elements.geminiModel.options).some(opt => opt.value === defaultModel)) {
                    elements.geminiModel.value = defaultModel;
                    // Auto-save default if nothing was saved
                    currentData.settings.geminiModel = defaultModel;
                    saveData();
                } else if (elements.geminiModel.options.length > 1) {
                    elements.geminiModel.selectedIndex = 1;
                }
            }

            // Show the section
            elements.modelSelectionSection.classList.remove('hidden');
        } else {
            console.warn('Failed to fetch models:', response.error);
        }
    } catch (error) {
        console.error('Error fetching models:', error);
    }
}

async function testSelectedModel() {
    const model = elements.geminiModel.value;
    if (!model) {
        showModelStatus('Please select a model first', 'error');
        return;
    }

    const apiKey = elements.geminiApiKey.value.trim();
    if (!apiKey) {
        showModelStatus('Please enter an API key first', 'error');
        return;
    }

    elements.testModel.disabled = true;
    elements.testModel.textContent = 'Testing...';

    try {
        const response = await chrome.runtime.sendMessage({
            action: 'testModel',
            model: model,
            apiKey: apiKey
        });

        if (response.success) {
            showModelStatus(`✓ ${model} is working!`, 'success');
            // Save the model selection
            currentData.settings.geminiModel = model;
            await saveData();
        } else {
            showModelStatus(`✗ ${response.error || 'Model test failed'}`, 'error');
        }
    } catch (error) {
        showModelStatus(`✗ Error: ${error.message}`, 'error');
    }

    elements.testModel.disabled = false;
    elements.testModel.textContent = 'Test Model';
}

function showModelStatus(message, type) {
    elements.modelStatus.textContent = message;
    elements.modelStatus.className = `status-message ${type}`;
    elements.modelStatus.classList.remove('hidden');
}

// ============================================
// OLLAMA LOCAL MODEL FUNCTIONS
// ============================================

async function connectToOllama() {
    const urlInput = elements.ollamaUrl;
    const url = urlInput ? (urlInput.value.trim() || 'http://localhost:11434') : 'http://localhost:11434';

    if (urlInput) urlInput.value = url;

    if (elements.connectOllama) {
        elements.connectOllama.disabled = true;
        elements.connectOllama.textContent = 'Connecting...';
    }

    showOllamaStatus('Connecting to Ollama...', 'info');

    try {
        const response = await chrome.runtime.sendMessage({
            action: 'connectOllama',
            url: url
        });

        console.log('Ollama connect response:', response);

        if (!response) {
            showOllamaStatus('✗ No response. Try reloading.', 'error');
            return;
        }

        if (response.success) {
            // Save the URL
            currentData.settings.ollamaUrl = url;
            await saveData();

            showOllamaStatus('✓ Connected!', 'success');

            // Populate models
            if (response.models && response.models.length > 0) {
                if (elements.ollamaModel) {
                    elements.ollamaModel.innerHTML = '<option value="" disabled selected>Select a model</option>';
                    response.models.forEach(model => {
                        const option = document.createElement('option');
                        option.value = model.name;
                        option.textContent = `${model.name} (${formatBytes(model.size)})`;
                        elements.ollamaModel.appendChild(option);
                    });
                }

                // Show model section
                if (elements.ollamaModelSection) elements.ollamaModelSection.classList.remove('hidden');
                // Removed useLocalModelSection access as it likely doesn't exist
                if (elements.ollamaInstructions) elements.ollamaInstructions.classList.add('hidden');

                // Select saved model
                if (elements.ollamaModel) {
                    if (currentData.settings.ollamaModel) {
                        elements.ollamaModel.value = currentData.settings.ollamaModel;
                    } else if (response.models.length > 0) {
                        const best = response.models.find(m => m.name.includes('llama3.1')) || response.models[0];
                        if (best) elements.ollamaModel.value = best.name;
                    }
                }
            } else {
                showOllamaStatus('⚠️ No models found. Run: ollama pull llama3.2', 'warning');
            }
        } else {
            showOllamaStatus(`✗ ${response.error || 'Failed'}`, 'error');
        }
    } catch (error) {
        console.error('Ollama connect error:', error);
        showOllamaStatus(`✗ ${error.message}`, 'error');
    } finally {
        if (elements.connectOllama) {
            elements.connectOllama.disabled = false;
            elements.connectOllama.textContent = 'Connect';
        }
    }
}

async function testOllamaModel() {
    const model = elements.ollamaModel.value;
    if (!model) {
        showOllamaModelStatus('Please select a model first', 'error');
        return;
    }

    const url = elements.ollamaUrl.value.trim() || 'http://localhost:11434';

    elements.testOllamaModel.disabled = true;
    elements.testOllamaModel.textContent = 'Testing...';

    try {
        const response = await chrome.runtime.sendMessage({
            action: 'testOllamaModel',
            url: url,
            model: model
        });

        if (response.success) {
            showOllamaModelStatus(`✓ ${model} is working!`, 'success');
            currentData.settings.ollamaModel = model;
            await saveData();
        } else {
            showOllamaModelStatus(`✗ ${response.error || 'Test failed'}`, 'error');
        }
    } catch (error) {
        showOllamaModelStatus(`✗ Error: ${error.message}`, 'error');
    }

    elements.testOllamaModel.disabled = false;
    elements.testOllamaModel.textContent = 'Test';
}

function showOllamaStatus(message, type) {
    elements.ollamaStatus.textContent = message;
    elements.ollamaStatus.className = `status-message ${type}`;
    elements.ollamaStatus.classList.remove('hidden');
}

function showOllamaModelStatus(message, type) {
    elements.ollamaModelStatus.textContent = message;
    elements.ollamaModelStatus.className = `status-message ${type}`;
    elements.ollamaModelStatus.classList.remove('hidden');
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

async function clearAllData() {
    if (confirm('Are you sure you want to delete all your data? This cannot be undone.')) {
        await chrome.storage.local.clear();
        currentData = {
            profile: { personal: {}, address: {}, summary: '' },
            experience: [],
            education: [],
            skills: { technical: [], languages: [], soft: [] },
            documents: { resume: '', coverLetter: '' },
            qna: getDefaultQnA(),
            settings: { geminiApiKey: '', autoShowButton: true, enableAI: true }
        };
        renderAll();
        showSaveStatus('All data cleared', 'success');
    }
}

// Import/Export
async function exportData() {
    const exportObj = { ...currentData };
    // Don't export API key
    exportObj.settings = { ...exportObj.settings, geminiApiKey: '' };

    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `jobfiller-profile-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);
    showSaveStatus('Profile exported!', 'success');
}

async function importDataFromJson() {
    try {
        const json = elements.importData.value.trim();
        if (!json) {
            alert('Please paste JSON data');
            return;
        }

        const data = JSON.parse(json);

        // Preserve API key
        const currentApiKey = currentData.settings.geminiApiKey;

        currentData = {
            profile: data.profile || currentData.profile,
            experience: data.experience || [],
            education: data.education || [],
            skills: data.skills || { technical: [], languages: [], soft: [] },
            documents: data.documents || { resume: '', coverLetter: '' },
            qna: data.qna || [],
            settings: {
                ...data.settings,
                geminiApiKey: currentApiKey || data.settings?.geminiApiKey || ''
            }
        };

        await saveData();
        renderAll();
        closeAllModals();
        showSaveStatus('Profile imported!', 'success');
    } catch (error) {
        alert(`Import failed: ${error.message}`);
    }
}

// Utility functions
function formatDate(dateStr) {
    if (!dateStr) return '';
    const [year, month] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(month) - 1]} ${year}`;
}

function truncate(str, length) {
    if (!str) return '';
    return str.length > length ? str.substring(0, length) + '...' : str;
}

function showSaveStatus(message, type) {
    elements.saveStatus.textContent = message;
    elements.saveStatus.className = `save-status ${type}`;

    setTimeout(() => {
        elements.saveStatus.textContent = '';
        elements.saveStatus.className = 'save-status';
    }, 3000);
}

// ============================================
// GOOGLE OAUTH FUNCTIONS
// ============================================

async function checkAuthStatus() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'checkAuth' });
        updateAuthUI(response);
    } catch (error) {
        console.error('Error checking auth status:', error);
        updateAuthUI({ isSignedIn: false });
    }
}

function updateAuthUI(authState) {
    if (authState.isSignedIn) {
        elements.signedOutView?.classList.add('hidden');
        elements.signedInView?.classList.remove('hidden');

        if (elements.userAvatar) {
            elements.userAvatar.src = authState.picture || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236366f1"><circle cx="12" cy="8" r="4"/><path d="M12 14c-6 0-8 3-8 6v2h16v-2c0-3-2-6-8-6z"/></svg>';
        }
        if (elements.userName) {
            elements.userName.textContent = authState.name || 'Google User';
        }
        if (elements.userEmail) {
            elements.userEmail.textContent = authState.email || '';
        }
    } else {
        elements.signedOutView?.classList.remove('hidden');
        elements.signedInView?.classList.add('hidden');
    }
}

async function handleGoogleSignIn() {
    const btn = elements.googleSignInBtn;
    if (!btn) return;

    btn.classList.add('loading');
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Signing in...`;

    try {
        const response = await chrome.runtime.sendMessage({ action: 'signIn' });

        if (response.success) {
            updateAuthUI({
                isSignedIn: true,
                name: response.user?.name,
                email: response.user?.email,
                picture: response.user?.picture
            });
            showSaveStatus('✓ Signed in successfully!', 'success');
        } else {
            showSaveStatus(`Sign in failed: ${response.error}`, 'error');
        }
    } catch (error) {
        console.error('Sign in error:', error);
        showSaveStatus(`Sign in error: ${error.message}`, 'error');
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function handleSignOut() {
    try {
        await chrome.runtime.sendMessage({ action: 'signOut' });
        updateAuthUI({ isSignedIn: false });
        showSaveStatus('Signed out successfully', 'success');
    } catch (error) {
        console.error('Sign out error:', error);
    }
}

// Helper to read file as Base64
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Handle Resume Parsing
async function handleParseResume() {
    const btn = elements.parseResume;
    const status = elements.parseStatus;
    const resumeText = elements.resume.value.trim();
    const resumeFile = elements.resumeUpload?.files[0];

    if (!resumeText && !resumeFile) {
        status.textContent = '⚠️ Please upload a PDF or paste your resume text';
        status.className = 'parse-status error';
        return;
    }

    // Show loading state
    btn.disabled = true;
    btn.classList.add('loading');
    btn.textContent = '🔄 Parsing...';
    status.textContent = 'AI is extracting your information...';
    status.className = 'parse-status loading';

    try {
        let message = { action: 'parseResume' };

        // PRIORITY: Use pasted text first (more reliable), save PDF for storage
        // This allows user to: Upload PDF + Paste text -> Parse text, store PDF
        if (resumeText) {
            // Use pasted text for parsing (works with all AI models)
            message.resumeText = resumeText;

            // If PDF also uploaded, save it to storage for later
            if (resumeFile && resumeFile.type === 'application/pdf') {
                const base64Data = await readFileAsBase64(resumeFile);
                // Save PDF to storage for future use (job applications may need it)
                chrome.storage.local.set({
                    'resumePdf': {
                        data: base64Data,
                        name: resumeFile.name,
                        size: resumeFile.size,
                        savedAt: new Date().toISOString()
                    }
                });
                status.textContent = 'AI parsing text... (PDF saved for later)';
            }
        } else if (resumeFile) {
            // Only PDF, no text - try PDF parsing (requires Gemini API)
            if (resumeFile.type !== 'application/pdf') {
                throw new Error('Only PDF files are supported');
            }
            const base64Data = await readFileAsBase64(resumeFile);
            message.resumeData = base64Data;
            message.mimeType = 'application/pdf';

            // Also save PDF to storage
            chrome.storage.local.set({
                'resumePdf': {
                    data: base64Data,
                    name: resumeFile.name,
                    size: resumeFile.size,
                    savedAt: new Date().toISOString()
                }
            });
        }

        const response = await chrome.runtime.sendMessage(message);

        if (!response) {
            throw new Error('No response from service worker. Please reload the extension.');
        }

        if (response.success && response.data) {
            const data = response.data;

            // Populate Profile - Personal
            if (data.profile?.personal) {
                const p = data.profile.personal;
                elements.firstName.value = p.firstName || '';
                elements.lastName.value = p.lastName || '';
                elements.email.value = p.email || '';
                elements.phone.value = p.phone || '';
                elements.linkedIn.value = p.linkedIn || '';
                elements.github.value = p.github || '';
                elements.portfolio.value = p.portfolio || '';
            }

            // Populate Address
            if (data.profile?.address) {
                const a = data.profile.address;
                elements.city.value = a.city || '';
                elements.state.value = a.state || '';
                elements.country.value = a.country || '';
            }

            // Populate Summary
            if (data.profile?.summary) {
                elements.summary.value = data.profile.summary;
            }

            // Populate Experience
            if (data.experience && Array.isArray(data.experience)) {
                currentData.experience = data.experience.map((exp, idx) => ({
                    id: Date.now() + idx,
                    company: exp.company || '',
                    title: exp.title || '',
                    location: exp.location || '',
                    startDate: exp.startDate || '',
                    endDate: exp.endDate || '',
                    current: exp.current || false,
                    description: exp.description || ''
                }));
                renderExperience();
            }

            // Populate Education
            if (data.education && Array.isArray(data.education)) {
                currentData.education = data.education.map((edu, idx) => ({
                    id: Date.now() + 1000 + idx,
                    institution: edu.institution || '',
                    degree: edu.degree || '',
                    field: edu.field || '',
                    startDate: edu.startDate || '',
                    endDate: edu.endDate || '',
                    gpa: edu.gpa || ''
                }));
                renderEducation();
            }

            // Populate Skills
            if (data.skills) {
                currentData.skills = {
                    technical: data.skills.technical || [],
                    languages: data.skills.languages || [],
                    soft: data.skills.soft || []
                };
                renderSkills();
            }

            // Update currentData profile
            updateProfileFromInputs();

            status.textContent = '✅ Resume parsed! Review and click Save All';
            status.className = 'parse-status success';

            // Show success message
            showSaveStatus('Resume parsed successfully! Review the data and click Save All.', 'success');

            // Switch to Profile tab to show the filled data
            switchTab('profile');

        } else {
            status.textContent = `❌ ${response.error || 'Failed to parse resume'}`;
            status.className = 'parse-status error';
        }
    } catch (error) {
        Logger.error('Parse resume error', { error: error.message });
        console.error('Parse resume error:', error);
        status.textContent = `❌ Error: ${error.message}`;
        status.className = 'parse-status error';
    } finally {
        btn.disabled = false;
        btn.classList.remove('loading');
        btn.textContent = '🤖 Parse Resume with AI';
    }
}

// Handle OAuth Config Save
async function handleSaveOAuthConfig() {
    const status = elements.oauthConfigStatus;
    const jsonText = elements.oauthCredentials.value.trim();

    if (!jsonText) {
        status.textContent = '⚠️ Please paste your OAuth credentials JSON';
        status.className = 'parse-status error';
        return;
    }

    try {
        // Parse the JSON
        const credentials = JSON.parse(jsonText);

        // Extract client_id and client_secret
        let clientId, clientSecret;

        if (credentials.web) {
            clientId = credentials.web.client_id;
            clientSecret = credentials.web.client_secret;
        } else if (credentials.installed) {
            clientId = credentials.installed.client_id;
            clientSecret = credentials.installed.client_secret;
        } else if (credentials.client_id) {
            clientId = credentials.client_id;
            clientSecret = credentials.client_secret;
        }

        if (!clientId || !clientSecret) {
            throw new Error('Invalid format: Missing client_id or client_secret');
        }

        // Save to storage
        await chrome.storage.local.set({
            oauthConfig: {
                clientId: clientId,
                clientSecret: clientSecret,
                savedAt: Date.now()
            }
        });

        // Notify the service worker
        await chrome.runtime.sendMessage({
            action: 'updateOAuthConfig',
            config: { clientId, clientSecret }
        });

        status.textContent = '✅ OAuth config saved! You can now Sign in with Google';
        status.className = 'parse-status success';
        showSaveStatus('OAuth credentials saved successfully!', 'success');

    } catch (error) {
        console.error('OAuth config error:', error);
        status.textContent = `❌ ${error.message}`;
        status.className = 'parse-status error';
    }
}

// Load OAuth Config on startup
async function loadOAuthConfig() {
    try {
        const result = await chrome.storage.local.get('oauthConfig');
        if (result.oauthConfig) {
            // Show that config is saved
            elements.oauthConfigStatus.textContent = '✅ OAuth configured';
            elements.oauthConfigStatus.className = 'parse-status success';
            // Don't show the actual credentials for security
            elements.oauthCredentials.placeholder = '{"web":{"client_id":"******.apps.googleusercontent.com",...}} (Already configured)';
        }
    } catch (error) {
        console.error('Error loading OAuth config:', error);
    }
}

// Call loadOAuthConfig on init
document.addEventListener('DOMContentLoaded', async () => {
    console.log('POPUP INIT: Starting...');
    await loadData(); // Load profile/settings
    setupEventListeners(); // Attach click handlers
    await loadOAuthConfig(); // Load OAuth settings
    await checkAuthStatus(); // Check if signed in
    console.log('POPUP INIT: Complete');
});

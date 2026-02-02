// JobFiller AI - Decoupled Service Worker
// Version: 2.0 (Stable & Decoupled)

const DEFAULT_BRAIN_URL = 'http://localhost:3000';

// 1. Inline Logger (Crash Proof)
const Logger = {
    info: (msg, data) => console.log('[INFO]', msg, data || ''),
    warn: (msg, data) => console.warn('[WARN]', msg, data || ''),
    error: (msg, data) => console.error('[ERROR]', msg, data || ''),
    debug: (msg, data) => console.log('[DEBUG]', msg, data || '')
};

console.log('[SYSTEM] Service Worker Initialized (Decoupled Mode)');

// 2. Data Loading & Utilities
async function loadData() {
    return new Promise((resolve) => {
        chrome.storage.local.get(null, (result) => {
            Logger.debug('[loadData] Raw storage:', JSON.stringify(result, null, 2).substring(0, 500));
            resolve(result || {});
        });
    });
}

function getNestedValue(obj, path) {
    const result = path.split('.').reduce((current, key) => current?.[key], obj);
    return result;
}

// 3. Direct Field Matching (Heuristics)
const DIRECT_FIELD_MAPPINGS = {
    // Name fields
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
    // Contact
    'email': 'profile.personal.email',
    'emailaddress': 'profile.personal.email',
    'phone': 'profile.personal.phone',
    'phonenumber': 'profile.personal.phone',
    'mobile': 'profile.personal.phone',
    'telephone': 'profile.personal.phone',
    'cell': 'profile.personal.phone',
    // Social
    'linkedin': 'profile.personal.linkedIn',
    'linkedinurl': 'profile.personal.linkedIn',
    'github': 'profile.personal.github',
    'githuburl': 'profile.personal.github',
    'portfolio': 'profile.personal.portfolio',
    'website': 'profile.personal.portfolio',
    'personalwebsite': 'profile.personal.portfolio',
    // Address
    'address': 'profile.address.street',
    'addressline': 'profile.address.street',
    'addressline1': 'profile.address.street',
    'streetaddress': 'profile.address.street',
    'street': 'profile.address.street',
    'city': 'profile.address.city',
    'state': 'profile.address.state',
    'province': 'profile.address.state',
    'zip': 'profile.address.zip',
    'zipcode': 'profile.address.zip',
    'postalcode': 'profile.address.zip',
    'postal': 'profile.address.zip',
    'country': 'profile.address.country',
    // Summary
    'summary': 'profile.summary',
    'aboutme': 'profile.summary',
    'bio': 'profile.summary',
    'professionalsummary': 'profile.summary'
};

function findDirectMatch(fieldInfo, data) {
    const label = (fieldInfo.label || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const name = (fieldInfo.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const placeholder = (fieldInfo.placeholder || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const originalLabel = (fieldInfo.label || '').toLowerCase().trim();
    
    Logger.debug(`[findDirectMatch] Field - label: "${label}", name: "${name}", placeholder: "${placeholder}"`);
    
    // 1. First check Q&A (learned data) - highest priority
    const qna = data.qna || [];
    if (qna.length > 0 && originalLabel) {
        for (const item of qna) {
            const qLabel = (item.question || '').toLowerCase().trim();
            // Match if labels are similar
            if (qLabel === originalLabel || 
                qLabel.includes(originalLabel) || 
                originalLabel.includes(qLabel) ||
                qLabel.replace(/[^a-z0-9]/g, '') === label) {
                Logger.info(`[findDirectMatch] ✓ Q&A match: "${originalLabel}" -> "${item.answer}"`);
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
                Logger.debug(`[findDirectMatch] Potential match: term="${term}" matches key="${key}"`);
                // Handle composite fields (like full name)
                if (Array.isArray(path)) {
                    const values = path.map(p => {
                        const val = getNestedValue(data, p);
                        return val;
                    }).filter(v => v);
                    if (values.length > 0) {
                        Logger.info(`[findDirectMatch] ✓ Direct match "${term}" -> "${values.join(' ')}"`);
                        return values.join(' ');
                    }
                } else {
                    const value = getNestedValue(data, path);
                    if (value) {
                        Logger.info(`[findDirectMatch] ✓ Direct match "${term}" -> "${value}"`);
                        return value;
                    }
                }
            }
        }
    }
    
    Logger.debug(`[findDirectMatch] ✗ No match for: "${fieldInfo.label}"`);
    return null;
}

// 4. CORE AI LOGIC (Ollama Direct)
async function callOllamaAPI_Direct(prompt, jsonMode, model) {
    const data = await loadData();
    const settings = data.settings || {};
    const url = settings.ollamaUrl || 'http://localhost:11434';
    const selectedModel = model || settings.ollamaModel || 'llama3.1:latest';

    Logger.info(`[AI] Calling Local Ollama: ${selectedModel}`);

    try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 60000); // 60s Timeout

        const messages = [];
        if (jsonMode) messages.push({ role: 'system', content: 'Output strictly JSON.' });

        let userContent = Array.isArray(prompt) ? prompt[0].text : prompt;
        messages.push({ role: 'user', content: userContent });

        const response = await fetch(`${url}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: selectedModel,
                messages: messages,
                stream: false,
                format: jsonMode ? 'json' : undefined,
                options: { temperature: 0.1 }
            }),
            signal: controller.signal
        });

        if (!response.ok) throw new Error(`Ollama Error: ${response.status}`);
        const json = await response.json();
        return json.message.content;

    } catch (e) {
        Logger.error('Ollama Direct Call Failed', e.message);
        throw e;
    }
}

// 5. Brain Server Logic (Optional - provides RAG/Memory for smarter answers)
async function callBrainAPI(prompt, jsonMode, model, brainUrl) {
    const baseUrl = brainUrl || DEFAULT_BRAIN_URL;
    const apiUrl = `${baseUrl}/v1/chat/completions`;
    
    try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 30000);

        Logger.info(`[AI Brain] Calling ${apiUrl} with model: ${model}`);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'user', content: Array.isArray(prompt) ? prompt[0].text : prompt }],
                model: model || 'llama3.1:latest',
                stream: false
            }),
            signal: controller.signal
        });

        if (!response.ok) throw new Error(`Brain Server Error: ${response.status}`);
        const json = await response.json();
        const result = json.choices?.[0]?.message?.content || '';
        Logger.info(`[AI Brain] Response received (${result.length} chars)`);
        return result;
    } catch (e) {
        Logger.warn('[AI Brain] Server unavailable, falling back to direct Ollama.', e.message);
        return callOllamaAPI_Direct(prompt, jsonMode, model);
    }
}

// 5b. Store memory in Brain Server (for learning)
async function storeBrainMemory(content, metadata, brainUrl) {
    const baseUrl = brainUrl || DEFAULT_BRAIN_URL;
    try {
        const response = await fetch(`${baseUrl}/v1/memory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, metadata: { text: content, ...metadata } })
        });
        if (response.ok) {
            Logger.info('[AI Brain] Memory stored successfully');
        }
    } catch (e) {
        Logger.debug('[AI Brain] Memory storage failed (server may be offline)', e.message);
    }
}

// 5a. Gemini Direct Logic
async function callGeminiAPI_Direct(prompt, apiKey) {
    // Basic checks
    if (!apiKey) throw new Error('Gemini API Key missing');

    const controller = new AbortController();
    setTimeout(() => controller.abort(), 60000);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // Prepare content
    let textPrompt = Array.isArray(prompt) ? prompt[0].text : prompt;

    // Safety for JSON mode: Gemini 2.0 Flash is smart enough with system instruction usually, 
    // but here we just append to prompt for simplicity in this minimal router.
    // Ideally we pass generationConfig responseMimeType: 'application/json'

    const body = {
        contents: [{ parts: [{ text: textPrompt }] }],
        generationConfig: {
            temperature: 0.2
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || `Gemini Error ${response.status}`);
        }

        const json = await response.json();
        return json.candidates[0].content.parts[0].text;
    } catch (e) {
        Logger.error('Gemini Direct Call Failed', e.message);
        throw e;
    }
}

// 6. Unified AI Router
async function callAI(prompt, jsonMode) {
    const data = await loadData();
    const settings = data.settings || {};

    // 1. Brain Server (Highest Priority if manually enabled)
    // Brain Server adds RAG memory for more context-aware, less vague answers
    if (settings.useAIBrain) {
        Logger.info('[AI Router] Using AI Brain Server (RAG enabled)');
        return callBrainAPI(prompt, jsonMode, settings.ollamaModel, settings.brainUrl);
    }

    // 2. Gemini Direct (If API Key is present AND Local is disabled/not preferred)
    // Logic: If user entered an API key, they might want to use it.
    // But if they also have Local Model enabled, which wins?
    // Let's say: If "Use Local Model" toggle is ON -> Ollama.
    // If OFF but Key exists -> Gemini.

    // Note: The UI has "useLocalModel" toggle (implied by "Local Model (Ollama)" section visibility/usage).
    // Let's check `settings.useLocalModel`.

    if (settings.geminiApiKey && !settings.useLocalModel) {
        return callGeminiAPI_Direct(prompt, settings.geminiApiKey);
    }

    // 3. Default to Ollama
    return callOllamaAPI_Direct(prompt, jsonMode, settings.ollamaModel);
}

// 7a. Resume Parsing Utilities
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

    const personal = normalized.profile?.personal || {};
    let fName = personal.firstName || '';
    let lName = personal.lastName || '';
    const lNameLower = lName.toLowerCase();
    if (fName.includes(' ') && (!lName || fName === lName || (lName.length > 2 && fName.toLowerCase().endsWith(lNameLower)))) {
        const parts = fName.trim().split(/\s+/);
        if (lName && fName.toLowerCase().endsWith(lNameLower)) {
            fName = fName.substring(0, fName.length - lName.length).trim();
        } else {
            fName = parts[0];
            lName = parts.slice(1).join(' ');
        }
        if (!normalized.profile) normalized.profile = {};
        if (!normalized.profile.personal) normalized.profile.personal = {};
        normalized.profile.personal.firstName = fName;
        normalized.profile.personal.lastName = lName;
    }

    if (data?.profile?.personal?.firstName) return normalized;

    normalized.profile.personal.email = data?.profile?.email || data?.profile?.personal?.email || data?.email || '';
    normalized.profile.personal.phone = data?.profile?.number || data?.profile?.phone || data?.profile?.personal?.phone || data?.phone || '';
    normalized.profile.personal.linkedIn = data?.profile?.linkedIn || data?.profile?.linkedin || data?.linkedIn || '';
    normalized.profile.personal.github = data?.profile?.github || data?.profile?.GitHub || data?.github || '';

    const location = data?.profile?.location || data?.location || '';
    if (typeof location === 'string' && location) {
        const parts = location.split(',').map(s => s.trim());
        normalized.profile.address.city = parts[0] || '';
        normalized.profile.address.country = parts[parts.length - 1] || '';
    } else if (typeof location === 'object') {
        normalized.profile.address = { ...location };
    }

    normalized.profile.summary = data?.profile?.summary || data?.summary || data?.professionalSummary || '';

    const exp = data?.experience || [];
    normalized.experience = (Array.isArray(exp) ? exp : [exp]).map(e => ({
        company: e?.company || e?.employer || '',
        title: cleanJobTitle(e?.title || e?.jobTitle || e?.position || ''),
        location: e?.location || '',
        startDate: e?.startDate || e?.start_date || '',
        endDate: e?.endDate || e?.end_date || 'Present',
        current: e?.current || (e?.endDate || e?.end_date || '').toLowerCase() === 'present',
        description: e?.description || e?.responsibilities || ''
    }));

    const edu = data?.education || [];
    normalized.education = (Array.isArray(edu) ? edu : [edu]).map(e => ({
        institution: e?.institution || e?.university || e?.school || '',
        degree: e?.degree || '',
        field: e?.field || e?.major || '',
        startDate: e?.startDate || '',
        endDate: e?.endDate || e?.graduation_date || '',
        gpa: e?.gpa || e?.GPA || ''
    }));

    const skills = data?.skills || {};
    normalized.skills.technical = skills?.technical || skills?.programmingLanguages || skills?.technologies || [];
    normalized.skills.languages = skills?.languages || skills?.spokenLanguages || [];
    normalized.skills.soft = skills?.soft || skills?.softSkills || [];

    if (!Array.isArray(normalized.skills.technical)) normalized.skills.technical = [normalized.skills.technical];
    if (!Array.isArray(normalized.skills.languages)) normalized.skills.languages = [normalized.skills.languages];
    if (!Array.isArray(normalized.skills.soft)) normalized.skills.soft = [normalized.skills.soft];

    return normalized;
}

// 7b. AI Processing
async function parseResumeWithAI(input) {
    let prompt;
    const getSystemInstruction = (resumeText) => `TASK: Extract information from the following resume into JSON.

RESUME:
${resumeText}

Extract the above resume into this JSON structure. Fill in values from the resume above:
{
  "profile": {
    "personal": {
      "firstName": "<first name>",
      "lastName": "<last name>",
      "email": "<email>",
      "phone": "<phone>",
      "linkedIn": "<linkedin>",
      "github": "<github>",
      "portfolio": null
    },
    "address": {
      "city": "<city>",
      "state": "<state>",
      "country": "<country>"
    },
    "summary": "<summary>"
  },
  "experience": [
    {
      "company": "<company>",
      "title": "<title>",
      "location": "<location>",
      "startDate": "<start>",
      "endDate": "<end>",
      "current": true/false,
      "description": "<desc>"
    }
  ],
  "education": [
    {
      "institution": "<school>",
      "degree": "<degree>",
      "field": "<field>",
      "startDate": "<start>",
      "endDate": "<end>",
      "gpa": "<gpa>"
    }
  ],
  "skills": {
    "technical": ["<skill>"],
    "languages": ["<lang>"],
    "soft": ["<soft>"]
  }
}

Return ONLY JSON. No explanations.`;

    if (input.resumeData && input.mimeType) {
        const dataSet = await loadData();
        const settings = dataSet.settings || {};
        if (settings.useLocalModel) {
            return { success: false, error: 'Local models cannot process PDF files yet. Please paste text.' };
        }
        prompt = [{ text: "Extract resume data from this PDF into JSON." }, { inlineData: { mimeType: input.mimeType, data: input.resumeData } }];
    } else {
        const text = input.resumeText || input;
        prompt = getSystemInstruction(text);
    }

    try {
        const result = await callAI(prompt, true);
        if (!result) return { success: false, error: 'No response from AI' };

        let jsonStr = result.trim();
        if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
        const firstCurly = jsonStr.indexOf('{');
        const lastCurly = jsonStr.lastIndexOf('}');
        if (firstCurly !== -1 && lastCurly !== -1) jsonStr = jsonStr.substring(firstCurly, lastCurly + 1);

        let parsedData = JSON.parse(jsonStr);
        parsedData = normalizeResumeData(parsedData);

        return { success: true, data: parsedData };
    } catch (e) {
        Logger.error('Resume parsing failed', e.message);
        return { success: false, error: e.message };
    }
}

async function learnFromFieldsHandler(newFields) {
    if (!newFields || !Array.isArray(newFields) || newFields.length === 0) {
        return { success: false, count: 0 };
    }

    try {
        const data = await loadData();
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
                Logger.info(`[Learn] Added Q&A: "${field.question}" => "${field.answer}"`);
            } else {
                // Update existing answer if different
                const existing = qna.find(q => q.question.toLowerCase().trim() === field.question.toLowerCase().trim());
                if (existing && existing.answer !== field.answer) {
                    existing.answer = field.answer;
                    Logger.info(`[Learn] Updated Q&A: "${field.question}" => "${field.answer}"`);
                    addedCount++;
                }
            }
        }

        if (addedCount > 0) {
            // Save directly to storage root level (not nested in jobFillerData)
            await chrome.storage.local.set({ qna: qna });
            Logger.info(`[Learn] Saved ${addedCount} Q&A items to storage`);
            
            // If AI Brain is enabled, also store each Q&A in Brain's memory for RAG
            const settings = data.settings || {};
            if (settings.useAIBrain) {
                Logger.info(`[Learn] Sending ${newFields.length} items to AI Brain memory...`);
                for (const field of newFields) {
                    // Store each Q&A separately for better vector search retrieval
                    const memoryText = `Form Question: "${field.question}"\nMy Answer: "${field.answer}"`;
                    await storeBrainMemory(memoryText, { 
                        type: 'learned_qna', 
                        question: field.question,
                        answer: field.answer 
                    }, settings.brainUrl);
                }
                Logger.info(`[Learn] AI Brain memory updated with ${newFields.length} entries`);
            }
        }

        return { success: true, count: addedCount };
    } catch (error) {
        Logger.error('Learn handler error', error.message);
        return { success: false, error: error.message };
    }
}

// Generate Cover Letter
async function generateCoverLetter(jobDescription) {
    if (!jobDescription || jobDescription.length < 50) {
        return { success: false, error: 'Job description is too short to generate a cover letter.' };
    }

    try {
        const data = await loadData();
        const profile = data.profile || {};
        const experience = data.experience || [];
        const skills = data.skills || {};
        const storedResume = data.documents?.resume || '';

        // Extract Name explicitly
        const userName = `${profile.personal?.firstName || profile.firstName || ''} ${profile.personal?.lastName || profile.lastName || ''}`.trim() || 'Candidate';
        const userTitle = profile.jobTitle || 'Professional';

        // Build context about the user
        let userContext = storedResume;

        if (!userContext || userContext.length < 100) {
            // Fallback to structured data if resume text is missing
            userContext = JSON.stringify({
                profile: profile,
                experience: experience,
                skills: skills
            }, null, 2);
        }

        const prompt = `Role: YOU ARE ${userName}, a ${userTitle}.
Task: Write a personalized "Reach Out" message or Short Cover Letter for this job application.

JOB DESCRIPTION:
${jobDescription.substring(0, 5000)}

MY RESUME / BACKGROUND:
${userContext.substring(0, 5000)}

INSTRUCTIONS:
1. Write a 1st-person message from ME (${userName}) to the Hiring Team.
2. Structure:
   - Hook: "Hi team, I'm ${userName}..."
   - Value: Mention 2 specific achievements or skills from my background that perfectly match this job.
   - Closing: "I'd love to discuss how I can help [Company Name]..."
3. Tone: Professional, enthusiastic, human (NOT robotic).
4. Length: 100-250 words (Substantial but concise).
5. NO placeholders like "[Insert Company]". If company name unknown, say "your team".
6. SIGN OFF: "Best,\n${userName}"

OUTPUT: Clean text only. No markdown.`;

        const result = await callAI(prompt, false);

        if (!result) {
            return { success: false, error: 'Failed to generate cover letter.' };
        }

        return { success: true, text: result.trim() };
    } catch (error) {
        Logger.error('Cover letter generation error', error.message);
        return { success: false, error: error.message };
    }
}

// 8. AutoFill Logic
async function processFieldWithAI(field, data) {
    // CRITICAL: Check for empty profile to avoid silent "SKIP"
    const profile = data.profile || {};
    const personal = profile.personal || {};
    const hasData = personal.firstName || personal.email || personal.phone || profile.summary;

    if (!hasData) {
        throw new Error('User Profile is empty. Open extension popup and fill your profile data first.');
    }

    const context = JSON.stringify(profile);
    
    // Include Q&A context for better matching
    const qna = data.qna || [];
    const qnaContext = qna.length > 0 
        ? `\n\nPreviously Answered Questions:\n${qna.map(q => `Q: ${q.question}\nA: ${q.answer}`).join('\n\n')}`
        : '';
    
    const prompt = `Task: Fill this form field accurately using the User Profile and any relevant memories/previously answered questions.

SYSTEM RULES:
1. Return ONLY the direct value.
2. NO explanations, NO introductory text.
3. If the value is a name, return just the name. 
4. If you find a similar question in "Previously Answered Questions" or "Relevant Memories", use that answer.
5. If uncertain or no data exists, return "SKIP".
6. Use plain text only.

CRITICAL FIELD RULES:
- If label is "Title" (or contains "Title"), it typically means **JOB TITLE**, NOT "Mr/Ms" and definitely NOT the candidate's name.
- NEVER fill a "Title" field with the candidate's name (e.g. "Akash").
- "Title" = Current Job Title (from Experience).

Field to Fill:
- Label: "${field.label}"
- Type: "${field.type}"

User Profile:
${context}${qnaContext}

Value:`;

    let result = await callAI(prompt, false);

    // Cleanup: Post-process to remove conversational filler if the AI ignores rules
    let value = result.trim();

    // Remove common AI conversational prefixes/sentences
    const patternsToRemove = [
        /^(Based on|Using) (the )?(provided )?(user )?profile,?\s*/i,
        /^The (requested )?value (for .* )?is:?\s*/i,
        /^I (will|shall) fill (in )?(this|the) (form )?field\.?\s*/i,
        /^Since the field type is .*,?\s*/i,
        /^I'll assume (it's|this is) asking for .*,?\s*/i,
        /^The (first )?name (from the user profile )?is:?\s*/i,
        /^Here's the (.*?) for the field:?\s*/i,
        /^The extracted value is:?\s*/i,
        /\.?\s*Return "SKIP" if uncertain/i,
        /\.?\s*If uncertain or no data, return "SKIP"/i
    ];

    // Apply patterns multiple times to catch nested/chained sentences
    let lastValue;
    do {
        lastValue = value;
        patternsToRemove.forEach(pattern => {
            value = value.replace(pattern, '').trim();
        });
    } while (value !== lastValue);

    // If we still have multiple sentences on one line, try to extract the last part if it looks like a value
    if (value.includes('.') && value.length > 30 && !field.label.toLowerCase().includes('summary')) {
        const sentences = value.split(/\.\s+/);
        if (sentences.length > 1) {
            const lastPart = sentences[sentences.length - 1].trim();
            if (lastPart.length > 0 && lastPart.length < 50 && !lastPart.includes(' ') && lastPart.toLowerCase() !== 'skip') {
                value = lastPart;
            } else if (lastPart.toUpperCase() === 'SKIP') {
                value = 'SKIP';
            }
        }
    }

    // Special case: AI repeats the whole logic block - take the last line if it's a value
    if (value.includes('\n')) {
        const lines = value.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.some(l => l.toUpperCase() === 'SKIP')) {
            value = 'SKIP';
        } else {
            let foundValue = false;
            for (let i = lines.length - 1; i >= 0; i--) {
                const line = lines[i];
                if (line.length > 0 && line.length < 60 && !line.includes('assume') && !line.includes('Based on')) {
                    value = line;
                    foundValue = true;
                    break;
                }
            }
            if (!foundValue && lines.length > 0) {
                value = lines[lines.length - 1];
            }
        }
    }

    // Final cleanup for markdown bold/italic/quotes/brackets
    return value.trim()
        .replace(/^\*\*?|\*\*?$/g, '')
        .replace(/^"|"$/g, '')
        .replace(/^\[|\]$/g, '')
        .replace(/^: /g, ''); // Remove leading colon
}


// 8. Connection Handlers
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    // CONNECT OLLAMA
    if (request.action === 'connectOllama') {
        fetch(request.url + '/api/tags')
            .then(res => res.json())
            .then(data => sendResponse({ success: true, models: data.models || [] }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }

    // TEST MODEL
    if (request.action === 'testOllamaModel') {
        callOllamaAPI_Direct('Say "OK"', false, request.model)
            .then(() => sendResponse({ success: true }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }

    // FILL FORM
    if (request.action === 'fillForm') {
        (async () => {
            const data = await loadData();
            const results = [];
            for (const field of request.fields) {
                // Try Direct Match first
                let val = findDirectMatch(field, data);

                // If no match, use AI
                if (!val && data.settings?.enableAI !== false) {
                    val = await processFieldWithAI(field, data);
                }

                if (val && val !== 'SKIP') {
                    results.push({ fieldId: field.id, value: val });
                }
            }
            sendResponse({ success: true, results });
        })();
        return true;
    }

    // CHECK AUTH
    if (request.action === 'checkAuth') {
        sendResponse({ isSignedIn: false });
        return true;
    }

    // DEBUG: Dump storage contents
    if (request.action === 'debugStorage') {
        (async () => {
            const data = await loadData();
            Logger.info('[DEBUG] Full storage dump:', JSON.stringify(data, null, 2));
            sendResponse({ 
                success: true, 
                profile: data.profile,
                hasProfile: !!data.profile?.personal?.firstName || !!data.profile?.personal?.email,
                settings: data.settings
            });
        })();
        return true;
    }

    // GET SINGLE FIELD VALUE (New Handler)
    if (request.action === 'getFieldValue') {
        (async () => {
            try {
                const data = await loadData();
                const field = request.fieldInfo;
                
                // Debug: Log profile status
                const hasProfile = !!data.profile?.personal?.firstName || !!data.profile?.personal?.email;
                Logger.info(`[AutoFill] Profile status: hasProfile=${hasProfile}, firstName="${data.profile?.personal?.firstName || 'EMPTY'}", email="${data.profile?.personal?.email || 'EMPTY'}"`);
                Logger.info(`[AutoFill] Processing field: label="${field.label}", name="${field.name}", id="${field.id}"`);

                // Check if profile exists
                if (!hasProfile) {
                    Logger.error('[AutoFill] NO PROFILE DATA! User needs to fill profile in popup.');
                    sendResponse({ success: false, error: 'Profile is empty. Open extension popup and fill your profile first!' });
                    return;
                }

                // 1. Direct Match (Fast Path)
                let val = findDirectMatch(field, data);
                let method = 'direct';
                
                if (val) {
                    Logger.info(`[AutoFill] ✓ Direct match found for "${field.label}": "${val.substring(0, 30)}..."`);
                } else {
                    Logger.info(`[AutoFill] ✗ No direct match for "${field.label}"`);
                }

                // 2. AI Fallback
                if (!val && data.settings?.enableAI !== false) {
                    Logger.info('[AutoFill] Trying AI fallback...');
                    try {
                        val = await processFieldWithAI(field, data);
                        method = 'ai';
                        Logger.info(`[AutoFill] AI returned: "${val?.substring(0, 30) || 'SKIP'}"`);
                    } catch (aiError) {
                        Logger.warn('[AutoFill] AI processing failed:', aiError.message);
                        // Return the error message so user knows what went wrong
                        sendResponse({ success: false, error: aiError.message });
                        return;
                    }
                }

                sendResponse({ success: true, value: val || 'SKIP', method });
            } catch (error) {
                Logger.error('getFieldValue failed', error);
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true;
    }

    // PARSE RESUME
    if (request.action === 'parseResume') {
        parseResumeWithAI(request).then(sendResponse);
        return true;
    }

    // LEARN FROM FIELDS
    if (request.action === 'learnFromFields') {
        learnFromFieldsHandler(request.fields).then(sendResponse);
        return true;
    }

    // GENERATE COVER LETTER
    if (request.action === 'generateCoverLetter') {
        generateCoverLetter(request.jobDescription).then(sendResponse);
        return true;
    }

    return false;
});

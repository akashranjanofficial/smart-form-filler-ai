// JobFiller AI - Service Worker
// Handles API calls, context management, and caching

// Simple internal logger for standalone operation
const Logger = {
    info: (msg, data) => console.log('INFO:', msg, data || ''),
    warn: (msg, data) => console.warn('WARN:', msg, data || ''),
    error: (msg, data) => console.error('ERROR:', msg, data || ''),
    debug: (msg, data) => console.log('DEBUG:', msg, data || '')
};

console.log('[SYSTEM] Service Worker Initialized');

// REMOTE BEACON: Prove we are alive
fetch('http://localhost:3000/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        level: 'info',
        message: '[SYSTEM] SW BEACON - ' + new Date().toISOString(),
        service: 'EXTENSION_BEACON'
    })
}).catch(e => console.error('BEACON FAILED', e));

// Now with Post-Processing Safeguards!

// Field mapping for direct matching (no AI needed)
const DIRECT_FIELD_MAPPINGS = {
    // Personal
    'first_name': 'profile.personal.firstName',
    'firstname': 'profile.personal.firstName',
    'first name': 'profile.personal.firstName',
    'fname': 'profile.personal.firstName',
    'given name': 'profile.personal.firstName',

    'last_name': 'profile.personal.lastName',
    'lastname': 'profile.personal.lastName',
    'last name': 'profile.personal.lastName',
    'lname': 'profile.personal.lastName',
    'surname': 'profile.personal.lastName',
    'family name': 'profile.personal.lastName',

    'full_name': 'profile.personal.fullName',
    'fullname': 'profile.personal.fullName',
    'full name': 'profile.personal.fullName',
    'name': 'profile.personal.fullName',

    'email': 'profile.personal.email',
    'email_address': 'profile.personal.email',
    'email address': 'profile.personal.email',
    'e-mail': 'profile.personal.email',

    'phone': 'profile.personal.phone',
    'phone_number': 'profile.personal.phone',
    'phone number': 'profile.personal.phone',
    'mobile': 'profile.personal.phone',
    'mobile_number': 'profile.personal.phone',
    'mobile number': 'profile.personal.phone',
    'telephone': 'profile.personal.phone',
    'cell': 'profile.personal.phone',

    'linkedin': 'profile.personal.linkedIn',
    'linkedin_url': 'profile.personal.linkedIn',
    'linkedin url': 'profile.personal.linkedIn',
    'linkedin profile': 'profile.personal.linkedIn',

    'github': 'profile.personal.github',
    'github_url': 'profile.personal.github',
    'github url': 'profile.personal.github',

    'portfolio': 'profile.personal.portfolio',
    'portfolio_url': 'profile.personal.portfolio',
    'website': 'profile.personal.portfolio',
    'personal website': 'profile.personal.portfolio',

    // Address
    'street': 'profile.address.street',
    'street_address': 'profile.address.street',
    'street address': 'profile.address.street',
    'address': 'profile.address.street',
    'address line 1': 'profile.address.street',
    'address_line_1': 'profile.address.street',

    'city': 'profile.address.city',
    'town': 'profile.address.city',

    'state': 'profile.address.state',
    'province': 'profile.address.state',
    'region': 'profile.address.state',

    'zip': 'profile.address.zip',
    'zip_code': 'profile.address.zip',
    'zipcode': 'profile.address.zip',
    'zip code': 'profile.address.zip',
    'postal_code': 'profile.address.zip',
    'postal code': 'profile.address.zip',
    'pincode': 'profile.address.zip',
    'pin code': 'profile.address.zip',

    'country': 'profile.address.country',

    // Summary
    'summary': 'profile.summary',
    'professional_summary': 'profile.summary',
    'professional summary': 'profile.summary',
    'about': 'profile.summary',
    'about me': 'profile.summary',
    'bio': 'profile.summary',
    'introduction': 'profile.summary',

    // Education (Most Recent)
    'university': 'education.0.institution',
    'college': 'education.0.institution',
    'school': 'education.0.institution',
    'institution': 'education.0.institution',
    'degree': 'education.0.degree',
    'major': 'education.0.field',
    'field of study': 'education.0.field',
    'field_of_study': 'education.0.field',

    // Work Experience (Most Recent)
    'company': 'experience.0.company',
    'employer': 'experience.0.company',
    'organization': 'experience.0.company',
    'job title': 'experience.0.title',
    'job_title': 'experience.0.title',
    'position': 'experience.0.title',
    'role': 'experience.0.title',
    'designation': 'experience.0.title',

    // Workday-specific automation IDs (common patterns)
    'legalnamesection_firstname': 'profile.personal.firstName',
    'legalnamesection_lastname': 'profile.personal.lastName',
    'legalnamesection_middlename': 'profile.personal.middleName',
    'addresssection_addressline1': 'profile.address.street',
    'addresssection_city': 'profile.address.city',
    'addresssection_postalcode': 'profile.address.zip',
    'addresssection_countryregion': 'profile.address.state',
    'addresssection_country': 'profile.address.country',
    'phonesection_phonenumber': 'profile.personal.phone',
    'emailaddress_email': 'profile.personal.email',
    'email_email': 'profile.personal.email',
    'linkedin_linkedinprofile': 'profile.personal.linkedIn',
    'workexperiencesection_jobtitle': 'experience.0.title',
    'workexperiencesection_company': 'experience.0.company',
    'educationsection_school': 'education.0.institution',
    'educationsection_degree': 'education.0.degree'
};

// Get value from nested object path
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

// Store data reference
let cachedData = null;

// Load data from storage
async function loadData() {
    return new Promise((resolve) => {
        chrome.storage.local.get(null, (result) => {
            cachedData = result;
            resolve(result);
        });
    });
}

// Find direct match for field
function findDirectMatch(fieldInfo, data) {
    const searchTerms = [
        fieldInfo.label?.toLowerCase(),
        fieldInfo.placeholder?.toLowerCase(),
        fieldInfo.name?.toLowerCase(),
        fieldInfo.id?.toLowerCase(),
        fieldInfo.ariaLabel?.toLowerCase(),
        // Workday-specific attributes
        fieldInfo.automationId?.toLowerCase(),
        fieldInfo.uxiElementId?.toLowerCase()
    ].filter(Boolean);

    for (const term of searchTerms) {
        for (const [pattern, path] of Object.entries(DIRECT_FIELD_MAPPINGS)) {
            if (term.includes(pattern)) {
                // Special case for full name
                if (path === 'profile.personal.fullName') {
                    const firstName = getNestedValue(data, 'profile.personal.firstName') || '';
                    const lastName = getNestedValue(data, 'profile.personal.lastName') || '';
                    return `${firstName} ${lastName}`.trim();
                }
                const value = getNestedValue(data, path);
                if (value) return value;
            }
        }
    }

    return null;
}

// Find Q&A match
function findQnAMatch(fieldInfo, data) {
    const qna = data.qna || [];
    const searchTerms = [
        fieldInfo.label?.toLowerCase(),
        fieldInfo.placeholder?.toLowerCase(),
        fieldInfo.nearbyText?.toLowerCase()
    ].filter(Boolean);

    for (const term of searchTerms) {
        for (const qa of qna) {
            const questionLower = qa.question.toLowerCase();
            // Check if any significant words match
            const questionWords = questionLower.split(/\s+/).filter(w => w.length > 3);
            const matchCount = questionWords.filter(word => term.includes(word)).length;

            if (matchCount >= 2 || term.includes(questionLower.substring(0, 20))) {
                return qa.answer;
            }
        }
    }

    return null;
}

// ============================================
// GOOGLE OAUTH AUTHENTICATION
// ============================================

// OAuth Configuration - Default values (can be overridden by user config in storage)
let OAUTH_CONFIG = {
    clientId: '',
    clientSecret: '',
    scopes: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/generative-language.retriever'
    ]
};

// Load OAuth config from storage
async function loadOAuthConfig() {
    try {
        const result = await chrome.storage.local.get('oauthConfig');
        if (result.oauthConfig && result.oauthConfig.clientId) {
            OAUTH_CONFIG.clientId = result.oauthConfig.clientId;
            OAUTH_CONFIG.clientSecret = result.oauthConfig.clientSecret;
            console.log('OAuth config loaded from storage');
        }
    } catch (error) {
        console.error('Error loading OAuth config:', error);
    }
}

// Initialize OAuth config on startup
loadOAuthConfig();

// Cached OAuth token
let cachedOAuthToken = null;
let cachedRefreshToken = null;
let tokenExpiry = null;

// Get redirect URL for OAuth
function getRedirectURL() {
    return chrome.identity.getRedirectURL();
}

// Sign in with Google using launchWebAuthFlow
async function signInWithGoogle() {
    try {
        // Reload OAuth config from storage in case it was just updated
        await loadOAuthConfig();

        // Validate OAuth config
        if (!OAUTH_CONFIG.clientId || !OAUTH_CONFIG.clientSecret) {
            return {
                success: false,
                error: 'OAuth not configured. Please go to Settings and paste your OAuth credentials JSON first.'
            };
        }

        const redirectURL = getRedirectURL();
        console.log('Redirect URL:', redirectURL);

        const authURL = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authURL.searchParams.set('client_id', OAUTH_CONFIG.clientId);
        authURL.searchParams.set('redirect_uri', redirectURL);
        authURL.searchParams.set('response_type', 'code');
        authURL.searchParams.set('scope', OAUTH_CONFIG.scopes.join(' '));
        authURL.searchParams.set('access_type', 'offline');
        authURL.searchParams.set('prompt', 'consent');

        // Launch the auth flow
        const responseURL = await new Promise((resolve, reject) => {
            chrome.identity.launchWebAuthFlow(
                {
                    url: authURL.toString(),
                    interactive: true
                },
                (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else if (response) {
                        resolve(response);
                    } else {
                        reject(new Error('No response from auth flow'));
                    }
                }
            );
        });

        // Extract authorization code from response URL
        const url = new URL(responseURL);
        const code = url.searchParams.get('code');

        if (!code) {
            throw new Error('No authorization code received');
        }

        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(code, redirectURL);

        // Get user info
        const userInfo = await getGoogleUserInfo(tokens.access_token);

        // Cache tokens
        cachedOAuthToken = tokens.access_token;
        cachedRefreshToken = tokens.refresh_token;
        tokenExpiry = Date.now() + ((tokens.expires_in - 60) * 1000);

        // Save auth state
        await chrome.storage.local.set({
            authState: {
                isSignedIn: true,
                email: userInfo?.email,
                name: userInfo?.name,
                picture: userInfo?.picture,
                signedInAt: Date.now()
            },
            refreshToken: tokens.refresh_token
        });

        return {
            success: true,
            user: userInfo,
            token: tokens.access_token
        };
    } catch (error) {
        console.error('Sign in error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Exchange authorization code for tokens
async function exchangeCodeForTokens(code, redirectUri) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            code: code,
            client_id: OAUTH_CONFIG.clientId,
            client_secret: OAUTH_CONFIG.clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        })
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('Token exchange error:', error);
        throw new Error('Failed to exchange code for tokens');
    }

    return await response.json();
}

// Refresh access token
async function refreshAccessToken() {
    const stored = await chrome.storage.local.get('refreshToken');
    const refreshToken = stored.refreshToken || cachedRefreshToken;

    if (!refreshToken) {
        throw new Error('No refresh token available');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            refresh_token: refreshToken,
            client_id: OAUTH_CONFIG.clientId,
            client_secret: OAUTH_CONFIG.clientSecret,
            grant_type: 'refresh_token'
        })
    });

    if (!response.ok) {
        throw new Error('Failed to refresh token');
    }

    const tokens = await response.json();
    cachedOAuthToken = tokens.access_token;
    tokenExpiry = Date.now() + ((tokens.expires_in - 60) * 1000);

    return tokens.access_token;
}

// Get OAuth token (with auto-refresh)
async function getOAuthToken(interactive = false) {
    // Check if we have a valid cached token
    if (cachedOAuthToken && tokenExpiry && Date.now() < tokenExpiry) {
        return cachedOAuthToken;
    }

    // Try to refresh the token
    try {
        return await refreshAccessToken();
    } catch (error) {
        if (interactive) {
            // If refresh fails and interactive, sign in again
            const result = await signInWithGoogle();
            if (result.success) {
                return result.token;
            }
        }
        throw new Error('Not authenticated. Please sign in.');
    }
}

// Get user info from Google
async function getGoogleUserInfo(token) {
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to get user info');
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting user info:', error);
        return null;
    }
}

// Sign out
async function signOut() {
    // Revoke the token if we have one
    if (cachedOAuthToken) {
        try {
            await fetch(`https://oauth2.googleapis.com/revoke?token=${cachedOAuthToken}`, {
                method: 'POST'
            });
        } catch (e) {
            console.log('Token revocation failed, continuing with sign out');
        }
    }

    cachedOAuthToken = null;
    cachedRefreshToken = null;
    tokenExpiry = null;

    await chrome.storage.local.set({
        authState: {
            isSignedIn: false,
            email: null,
            name: null,
            picture: null
        },
        refreshToken: null
    });

    return { success: true };
}

// Check if user is signed in
async function checkAuthState() {
    const result = await chrome.storage.local.get(['authState', 'refreshToken']);
    const authState = result.authState || { isSignedIn: false };

    // Try to get token silently to verify session
    if (authState.isSignedIn && result.refreshToken) {
        try {
            cachedRefreshToken = result.refreshToken;
            await getOAuthToken(false);
            return { isSignedIn: true, ...authState };
        } catch {
            // Token expired or revoked
            return { isSignedIn: false };
        }
    }

    return authState;
}

// ============================================
// GEMINI API CALLS
// ============================================

// Call Gemini API with OAuth token or API key
// With automatic fallback between local and cloud models
async function callGeminiAPI(prompt, apiKeyOverride = null, jsonMode = false) {
    const data = await loadData();
    const settings = data.settings || {};

    // Determine primary and fallback based on user preference
    const useLocalPrimary = !apiKeyOverride && settings.useLocalModel && settings.ollamaUrl && settings.ollamaModel;
    const hasCloudAuth = settings.geminiApiKey || apiKeyOverride;
    const hasLocalAuth = settings.ollamaUrl && settings.ollamaModel;

    // Local Model (Ollama)
    if (settings.useLocalModel) {
        // Use user selected model or fallback to llama3.1 (better than 3.2)
        const ollamaModel = (settings.ollamaModel) || 'llama3.1:latest';

        console.log('Using local Ollama model:', ollamaModel);

        try {
            return await callOllamaAPI(prompt, jsonMode, ollamaModel);
        } catch (localError) {
            console.warn('Local model failed, trying Gemini fallback:', localError.message);
            if (hasCloudAuth) {
                console.log('Falling back to Gemini API...');
                return await callGeminiAPIInternal(prompt, apiKeyOverride, jsonMode, settings);
            }
            throw localError; // No fallback available
        }
    } else {
        // Gemini is primary, local is fallback
        try {
            return await callGeminiAPIInternal(prompt, apiKeyOverride, jsonMode, settings);
        } catch (cloudError) {
            console.warn('Gemini API failed:', cloudError.message);
            if (hasLocalAuth && !apiKeyOverride) {
                console.log('Falling back to local Ollama model...');
                try {
                    return await callOllamaAPI(prompt, jsonMode);
                } catch (localError) {
                    console.warn('Local fallback also failed:', localError.message);
                    throw cloudError; // Throw original error
                }
            }
            throw cloudError;
        }
    }
}

// Internal Gemini API call (extracted from original callGeminiAPI)
async function callGeminiAPIInternal(prompt, apiKeyOverride, jsonMode, settings) {

    const MAX_RETRIES = 3;
    let retryCount = 0;

    while (retryCount < MAX_RETRIES) {
        try {
            let headers = {
                'Content-Type': 'application/json'
            };

            // Settings is now passed in, no need to reload

            // Determine model: specific JSON model override > user preference > default
            let model = 'gemini-2.0-flash';
            if (jsonMode) {
                // For JSON mode, stick to known stable models
                model = 'gemini-2.0-flash';
            } else if (settings.geminiModel) {
                model = settings.geminiModel;
            }

            let url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

            // Priority: 1) Override API key, 2) Stored API key, 3) OAuth token
            if (apiKeyOverride) {
                url += `?key=${apiKeyOverride}`;
            } else if (settings.geminiApiKey) {
                url += `?key=${settings.geminiApiKey}`;
            } else {
                // Try OAuth token
                try {
                    const token = await getOAuthToken(false);
                    headers['Authorization'] = `Bearer ${token}`;
                } catch (oauthError) {
                    throw new Error('No authentication available. Please sign in with Google or enter an API key.');
                }
            }

            const generationConfig = {
                temperature: 0.3,
                maxOutputTokens: 8192
            };

            // Enable JSON mode if requested
            if (jsonMode) {
                generationConfig.responseMimeType = "application/json";
            }

            // Prepare content parts
            let parts = [];
            if (Array.isArray(prompt)) {
                parts = prompt;
            } else {
                parts = [{ text: prompt }];
            }

            // Add timeout for the request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    contents: [{
                        parts: parts
                    }],
                    generationConfig: generationConfig
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                // Handle 503 (Service Unavailable) and 429 (Too Many Requests)
                if ((response.status === 503 || response.status === 429) && retryCount < MAX_RETRIES - 1) {
                    console.log(`API ${response.status} error, retrying (${retryCount + 1}/${MAX_RETRIES})...`);

                    // Default wait time
                    let waitTime = 2000 * (retryCount + 1);

                    // For 429, try to parse the message or wait longer
                    if (response.status === 429) {
                        waitTime = 5000 * (retryCount + 1); // Aggressive backoff for rate limits
                        try {
                            const errJson = await response.json();
                            const msg = errJson.error?.message || '';
                            // Try to extract "retry in X s"
                            const match = msg.match(/retry in ([0-9.]+)s/);
                            if (match && match[1]) {
                                waitTime = (parseFloat(match[1]) * 1000) + 1000; // Wait slightly longer than requested
                            }
                        } catch (e) { /* ignore parse error */ }
                    }

                    await new Promise(r => setTimeout(r, waitTime));
                    retryCount++;
                    continue;
                }

                // Handle 404 (Model not found) or 400 (Bad Request - possibly invalid model for key)
                if ((response.status === 404 || response.status === 400) && (model === 'gemini-2.5-flash' || model === 'gemini-2.0-flash')) {
                    console.log(`Model ${model} failed, falling back to gemini-2.0-flash-lite`);
                    model = 'gemini-2.0-flash-lite';
                    url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
                    if (apiKeyOverride) url += `?key=${apiKeyOverride}`;
                    else if (settings.geminiApiKey) url += `?key=${settings.geminiApiKey}`;
                    // Retry immediately with new model
                    continue;
                }

                const errorData = await response.json();
                throw new Error(errorData.error?.message || `API error: ${response.status}`);
            }

            const result = await response.json();
            return result.candidates[0].content.parts[0].text;

        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. Please check your internet connection.');
            }
            if (retryCount >= MAX_RETRIES - 1) {
                console.error('Gemini API Error:', error);
                throw error;
            }
            retryCount++;
            await new Promise(r => setTimeout(r, 1000));
        }
    }
}


// Build profile context for AI
function buildProfileContext(data) {
    const parts = [];

    if (data.profile?.personal) {
        const p = data.profile.personal;
        parts.push(`Name: ${p.firstName} ${p.lastName}`);
        parts.push(`Email: ${p.email}`);
        parts.push(`Phone: ${p.phone}`);
        if (p.linkedIn) parts.push(`LinkedIn: ${p.linkedIn}`);
        if (p.github) parts.push(`GitHub: ${p.github}`);
    }

    if (data.profile?.address) {
        const a = data.profile.address;
        parts.push(`Location: ${a.city}, ${a.state}, ${a.country}`);
    }

    if (data.profile?.summary) {
        parts.push(`Professional Summary: ${data.profile.summary}`);
    }

    if (data.experience?.length > 0) {
        parts.push('\nWork Experience:');
        data.experience.forEach(exp => {
            parts.push(`- ${exp.title} at ${exp.company} (${exp.startDate} - ${exp.current ? 'Present' : exp.endDate})`);
            if (exp.description) parts.push(`  ${exp.description.substring(0, 200)}...`);
        });
    }

    if (data.education?.length > 0) {
        parts.push('\nEducation:');
        data.education.forEach(edu => {
            parts.push(`- ${edu.degree} in ${edu.field} from ${edu.institution}`);
        });
    }

    if (data.skills) {
        if (data.skills.technical?.length > 0) {
            parts.push(`\nTechnical Skills: ${data.skills.technical.join(', ')}`);
        }
        if (data.skills.languages?.length > 0) {
            parts.push(`Languages: ${data.skills.languages.join(', ')}`);
        }
    }

    // Include Learned Q&A (Persistent Context)
    if (data.qna && data.qna.length > 0) {
        parts.push('\nAdditional Known Details (User Preferences):');
        data.qna.forEach(item => {
            // Only include relevant/short Q&A to avoid context bloat
            if (item.question && item.answer && item.answer.length < 500) {
                parts.push(`- ${item.question}: ${item.answer}`);
            }
        });
    }

    return parts.join('\n');
}

// Process form field with AI
// Heuristic: Try to match field directly to profile data without AI
function tryGetHeuristicValue(fieldInfo, data) {
    const l = fieldInfo.label.toLowerCase().trim().replace(/\*$/, '').trim(); // Remove trailing *
    const p = data.profile?.personal || {};
    const a = data.profile?.address || {};

    // 1. Personal Info
    if (l === 'first name' || l === 'firstname') return { value: p.firstName };
    if (l === 'last name' || l === 'lastname') return { value: p.lastName };
    if (l === 'full name' || l === 'fullname' || l === 'name') {
        if (p.firstName && p.lastName) return { value: `${p.firstName} ${p.lastName}` };
        if (p.firstName) return { value: p.firstName };
    }
    if (l.includes('email')) return { value: p.email };
    if (l.includes('phone') || l.includes('mobile')) return { value: p.phone };
    if (l.includes('linkedin')) return { value: p.linkedIn || p.linkedin };
    if (l.includes('github') || l.includes('git hub')) return { value: p.github };
    if (l.includes('portfolio') || l.includes('website')) return { value: p.portfolio };

    // 2. Address
    if (l.includes('street') || l === 'address') return { value: a.street };
    if (l.includes('city') || l === 'town') return { value: a.city };
    if (l.includes('state') || l === 'province') return { value: a.state };
    if (l.includes('zip') || l.includes('postal') || l.includes('pincode')) return { value: a.zip };
    if (l === 'country') return { value: a.country };

    return null; // No heuristic match, use AI
}

// Process form field with AI (or Heuristic)
async function processFieldWithAI(fieldInfo, data) {
    // Clean label for better matching (User screenshot showed "School name *")
    const originalLabel = fieldInfo.label;
    fieldInfo.label = fieldInfo.label.replace(/\*$/, '').trim();

    // 1. Try Heuristic First (Instant & Accurate)
    const heuristic = tryGetHeuristicValue(fieldInfo, data);
    if (heuristic) {
        console.log(`[SmartFill] Heuristic Match: "${fieldInfo.label}" -> "${heuristic.value}"`);
        return heuristic;
    }

    const profileContext = buildProfileContext(data);

    let specificInstructions = '';
    if (fieldInfo.type === 'button') {
        specificInstructions = '5. This is an "Add" button. If I have relevant data to add for this section (e.g. Work Experience, Education) and it seems appropriate to click to add another entry, respond with "CLICK". Otherwise "SKIP".';
    } else if (fieldInfo.type === 'date' || fieldInfo.type === 'month' || fieldInfo.label?.toLowerCase().includes('date')) {
        specificInstructions = '5. For dates, use the standard format YYYY-MM-DD unless the placeholder suggests otherwise. If the field asks for "Month" or "Year" specifically, provide only that.';
    }

    const prompt = `You are a form-filling assistant. 
Your ONLY goal is to extract the correct value for the target field in JSON format.

CRITICAL INSTRUCTIONS (FOLLOW STRICTLY):
1. **LEARNED ANSWERS FIRST**: If "Additional Known Details" section contains a match, use it.

2. **STRICT CONTEXT SCOPE**:
   - If Label is **EXACTLY** "Name" or "Full Name" -> Combine "First Name" and "Last Name". NEVER use Company Name.
   - If Label **contains** "School Name" or "Company Name" -> Treat as Organization Name. DO NOT use Personal Name.
   - If Label involves **"Company", "Employer", "Work", "Experience", "Title", "Role", "Position"** -> Look ONLY in "Work Experience" section.
   - If Label involves **"School", "University", "College", "Degree", "Faculty"** -> Look ONLY in "Education" section.
   - If Label involves **"Email", "Phone", "Mobile"** -> Look ONLY in "Personal Information".
   - If Label involves **"Skill", "Stack", "Language", "Technologies"** -> Look ONLY in "Technical Skills" / "Languages".

3. **NEGATIVE CONSTRAINTS** (Prevent Hallucinations):
   - **NEVER use a 6-digit number (Pincode) for a Company/School/City.** return "SKIP".
   - **NEVER use Company Name for "Name" or "Faculty".**
   - **NEVER use Personal Name for "Company" or "School".**
   - **NEVER use Phone Number for "Email".**

4. **FORMAT RULES**:
   - **Email**: MUST contain "@".
   - **Name**: "First Name Last Name" (e.g. "John Doe").
   - **Phone**: International format.
   - **Dates**: YYYY-MM-DD.
   - **Salary**: Numbers only.

5. If no valid value is found, return "SKIP".

CONTEXT (User Profile):
${profileContext}

JOB DESCRIPTION:
${data.jobDescription ? data.jobDescription.substring(0, 3000) : 'None provided'}

TARGET FIELD:
- Label: "${fieldInfo.label}"
- Type: ${fieldInfo.type}
${fieldInfo.nearbyText ? `- Context: ${fieldInfo.nearbyText}` : ''}
${fieldInfo.options ? `- Options: ${fieldInfo.options.join(', ')}` : ''}

${specificInstructions}

YOUR RESPONSE (JSON):`;


    try {
        let rawResponse;
        if (data.settings?.useLocalModel) {
            console.log(`[SmartFill] Using Local Model: ${data.settings.ollamaModel}`);
            rawResponse = await callOllamaAPI(prompt, true);
        } else {
            rawResponse = await callGeminiAPI(prompt, null, true);
        }

        if (!rawResponse) return cleanAIResponse('', fieldInfo, data);

        let value;
        try {
            const parsed = JSON.parse(rawResponse);
            value = parsed.value || parsed.Value || 'SKIP';
        } catch (jsonErr) {
            console.warn('JSON Parse failed, falling back to raw text cleaning');
            value = rawResponse;
        }

        return cleanAIResponse(value, fieldInfo, data);
    } catch (e) {
        console.error('AI processing error:', e);
        return cleanAIResponse('SKIP', fieldInfo, data);
    }
    return cleanAIResponse(rawResponse, fieldInfo, data);
}

// Helper to clean AI response (remove quotes, labels, hallucinations)
// Helper to clean AI response (remove quotes, labels, hallucinations) and VALIDATE against safeguards
function cleanAIResponse(response, fieldInfo, data) {
    if (!response || response === 'SKIP') return 'SKIP';

    let clean = response.trim();

    // 1. Basic Cleaning (Quotes and Markdown)
    clean = clean.replace(/^["']|["']$/g, '');
    clean = clean.replace(/^```json|```$/g, '').trim();

    // 2. Remove "Label: " prefixes
    const prefixes = [
        'field:', 'label:', 'value:', 'answer:', 'output:',
        'first name:', 'last name:', 'email:', 'phone:', 'job title:', 'address:', 'company:', 'school:'
    ];

    for (const prefix of prefixes) {
        if (clean.toLowerCase().startsWith(prefix)) {
            clean = clean.substring(prefix.length).trim();
        }
    }

    // 3. Check specific label prefix
    if (fieldInfo.label) {
        const labelRegex = new RegExp(`^${fieldInfo.label}:?\\s*`, 'i');
        clean = clean.replace(labelRegex, '');
    }

    // 4. --- NUCLEAR SAFEGUARD: Prevent Name Hallucination ---
    // If Answer matches User's Name, but Label is School/Company -> BLOCK IT
    if (data && data.profile) {
        const p = data.profile.personal || {};
        const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
        const ansLower = clean.toLowerCase().trim();
        const lblLower = (fieldInfo.label || '').toLowerCase();

        // Check if Answer is suspiciously close to Personal Name (First, Last, or Full)
        const isName = (p.firstName && ansLower === p.firstName.toLowerCase()) ||
            (p.lastName && ansLower === p.lastName.toLowerCase()) ||
            (ansLower === fullName);

        if (isName) {
            if (lblLower.includes('school') || lblLower.includes('university') ||
                lblLower.includes('company') || lblLower.includes('employer') ||
                lblLower.includes('faculty') || lblLower.includes('degree') ||
                lblLower.includes('major') || lblLower.includes('study')) {

                console.warn(`[SmartFill] BLOCKED Hallucination: AI tried to put Name "${clean}" into "${fieldInfo.label}"`);

                // Try to find correct value from profile manually fallback
                if (lblLower.includes('school') || lblLower.includes('university')) {
                    const edu = data.profile.education?.[0];
                    if (edu?.institution || edu?.school) return edu.institution || edu.school;
                } else if (lblLower.includes('company') || lblLower.includes('employer')) {
                    const exp = data.profile.experience?.[0];
                    if (exp?.company) return exp.company;
                } else if (lblLower.includes('faculty') || lblLower.includes('major') || lblLower.includes('study')) {
                    const edu = data.profile.education?.[0];
                    if (edu?.field) return edu.field;
                }
                return 'SKIP';
            }
        }
    }

    // 5. Final Formatting
    if (clean.length > 300) clean = clean.substring(0, 300);

    // Aggressive Job Title Cleaning
    if (fieldInfo.label?.toLowerCase().includes('title') || fieldInfo.label?.toLowerCase().includes('role')) {
        clean = cleanJobTitle(clean);
    }

    console.log(`[SmartFill] Validated Result: "${fieldInfo.label}" -> "${clean}"`);
    return clean.trim();
}

// ============================================
// MESSAGE HANDLERS
// ============================================

// Main message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getFieldValue') {
        // Pass job description if available
        const fieldData = { ...request.fieldInfo };
        if (request.jobDescription) {
            // We inject it into the data object passed to processFieldWithAI
            // But processFieldWithAI signature is (fieldInfo, data)
            // We need to modify handleGetFieldValue to accept it
        }
        handleGetFieldValue(request.fieldInfo, request.jobDescription).then(sendResponse);
        return true;
    }

    if (request.action === 'openTab') {
        chrome.tabs.create({ url: request.url, active: true });
        sendResponse({ success: true });
        return true;
    }

    if (request.action === 'fillForm') {
        handleFillForm(request.fields).then(sendResponse);
        return true;
    }

    if (request.action === 'testApiKey') {
        testApiKey(request.apiKey).then(sendResponse);
        return true;
    }

    if (request.action === 'analyzeJobMatch') {
        analyzeJobMatch(request.jobDescription).then(sendResponse);
        return true;
    }

    // OAuth actions
    if (request.action === 'signIn') {
        signInWithGoogle().then(sendResponse);
        return true;
    }

    if (request.action === 'signOut') {
        signOut().then(sendResponse);
        return true;
    }

    if (request.action === 'checkAuth') {
        checkAuthState().then(sendResponse);
        return true;
    }

    if (request.action === 'testOAuthConnection') {
        testOAuthConnection().then(sendResponse);
        return true;
    }

    // Resume parsing action
    if (request.action === 'parseResume') {
        parseResumeWithAI(request).then(sendResponse);
        return true;
    }

    // Generate Cover Letter
    if (request.action === 'generateCoverLetter') {
        generateCoverLetter(request.jobDescription).then(sendResponse);
        return true;
    }

    // Learn from page fields
    if (request.action === 'learnFromFields') {
        learnFromFieldsHandler(request.fields).then(sendResponse);
        return true;
    }

    // Update OAuth config
    if (request.action === 'updateOAuthConfig') {
        if (request.config) {
            OAUTH_CONFIG.clientId = request.config.clientId;
            OAUTH_CONFIG.clientSecret = request.config.clientSecret;
            console.log('OAuth config updated');
        }
        sendResponse({ success: true });
        return true;
    }
    // Test specific model
    if (request.action === 'testModel') {
        testSpecificModel(request.model, request.apiKey).then(sendResponse);
        return true;
    }
    // List available models
    if (request.action === 'listModels') {
        listGeminiModels(request.apiKey).then(sendResponse);
        return true;
    }
    // Ollama: Connect and list models
    if (request.action === 'connectOllama') {
        connectToOllamaServer(request.url)
            .then(sendResponse)
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }
    // Ollama: Test specific model
    if (request.action === 'testOllamaModel') {
        testOllamaModel(request.url, request.model)
            .then(sendResponse)
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }
    return false;
});

// List available Gemini models
async function listGeminiModels(apiKeyOverride = null) {
    try {
        let url = 'https://generativelanguage.googleapis.com/v1beta/models';

        // Determine auth method
        const data = await loadData();
        const settings = data.settings || {};
        let headers = {};

        // Priority: 1) Override API key, 2) Stored API key, 3) OAuth token
        if (apiKeyOverride) {
            url += `?key=${apiKeyOverride}`;
        } else if (settings.geminiApiKey) {
            url += `?key=${settings.geminiApiKey}`;
        } else {
            // Try OAuth token
            try {
                const token = await getOAuthToken(false);
                headers['Authorization'] = `Bearer ${token}`;
            } catch (oauthError) {
                return { success: false, error: 'No authentication available.' };
            }
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.error?.message || 'Failed to fetch models' };
        }

        const result = await response.json();
        // Filter for models that support generateContent
        const models = result.models.filter(m =>
            m.supportedGenerationMethods &&
            m.supportedGenerationMethods.includes('generateContent')
        );

        return { success: true, models };
    } catch (error) {
        console.error('List models error:', error);
        return { success: false, error: error.message };
    }
}

// Helper to clean job titles (remove appended skills)
function cleanJobTitle(title) {
    if (!title) return '';
    // Remove common skill separators like " - C++", " | Java"
    let clean = title.replace(/\s*[-|/,]\s*(C\+\+|Java|Python|SQL|AWS|React|Node|Spring|Docker|Kubernetes|Linux|embedded|algorithms|data structures).*/i, '');
    // Remove appended list patterns like "Title C++, Java"
    clean = clean.replace(/\s+(C\+\+|Java|Python|SQL|AWS|React|Node).*/i, '');
    return clean.trim();
}

// Normalize different JSON response formats to expected structure
function normalizeResumeData(data) {
    let normalized = data;

    // Check if we need to convert structure
    if (!data?.profile?.personal?.firstName) {
        normalized = {
            profile: {
                personal: {},
                address: {},
                summary: ''
            },
            experience: [],
            education: [],
            skills: { technical: [], languages: [], soft: [] }
        };

        // Extract name from top level or profile.name
        const name = data?.profile?.name || data?.name || '';
        if (name) {
            const nameParts = name.trim().split(/\s+/);
            normalized.profile.personal.firstName = nameParts[0] || '';
            normalized.profile.personal.lastName = nameParts.slice(1).join(' ') || '';
        }

        // Copy other fields (omitted for brevity, handled below)
    }

    // SANITIZATION: Fix common AI mistakes even if structure matches
    const personal = normalized.profile?.personal || {};
    let fName = personal.firstName || '';
    let lName = personal.lastName || '';

    // Fix: If First Name contains spaces and Last Name is identical, empty, or contained at the end
    // e.g. fName="Akash Ranjan", lName="Ranjan" -> Split it
    const lNameLower = lName.toLowerCase();
    if (fName.includes(' ') && (!lName || fName === lName || (lName.length > 2 && fName.toLowerCase().endsWith(lNameLower)))) {
        console.log('Detected full name in firstName field, splitting...');
        const parts = fName.trim().split(/\s+/);

        // If we found the duplication overlap, we can be more precise
        if (lName && fName.toLowerCase().endsWith(lNameLower)) {
            // Just remove the last name part from first name
            fName = fName.substring(0, fName.length - lName.length).trim();
        } else {
            // Standard split
            fName = parts[0];
            lName = parts.slice(1).join(' ');
        }

        // Update the object
        if (!normalized.profile) normalized.profile = {};
        if (!normalized.profile.personal) normalized.profile.personal = {};
        normalized.profile.personal.firstName = fName;
        normalized.profile.personal.lastName = lName;
    }

    // Continue with structure normalization if it wasn't already proper...
    if (data?.profile?.personal?.firstName) return normalized;

    // Extract contact info from various locations (fallback logic)
    normalized.profile.personal.email = data?.profile?.email || data?.profile?.personal?.email || data?.email || '';
    normalized.profile.personal.phone = data?.profile?.number || data?.profile?.phone || data?.profile?.personal?.phone || data?.phone || '';
    normalized.profile.personal.linkedIn = data?.profile?.linkedIn || data?.profile?.linkedin || data?.linkedIn || '';
    normalized.profile.personal.github = data?.profile?.github || data?.profile?.GitHub || data?.github || '';

    // Extract address
    const location = data?.profile?.location || data?.location || '';
    if (typeof location === 'string' && location) {
        const parts = location.split(',').map(s => s.trim());
        normalized.profile.address.city = parts[0] || '';
        normalized.profile.address.country = parts[parts.length - 1] || '';
    } else if (typeof location === 'object') {
        normalized.profile.address = { ...location };
    }

    // Extract summary
    normalized.profile.summary = data?.profile?.summary || data?.summary || data?.professionalSummary || '';

    // Normalize experience
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

    // Normalize education
    const edu = data?.education || [];
    const eduArray = Array.isArray(edu) ? edu : [edu];
    normalized.education = eduArray.map(e => ({
        institution: e?.institution || e?.university || e?.school || '',
        degree: e?.degree || '',
        field: e?.field || e?.major || '',
        startDate: e?.startDate || '',
        endDate: e?.endDate || e?.graduation_date || '',
        gpa: e?.gpa || e?.GPA || ''
    }));

    // Normalize skills
    const skills = data?.skills || {};
    normalized.skills.technical = skills?.technical || skills?.programmingLanguages || skills?.technologies || [];
    normalized.skills.languages = skills?.languages || skills?.spokenLanguages || [];
    normalized.skills.soft = skills?.soft || skills?.softSkills || [];

    // Ensure skills are arrays
    if (!Array.isArray(normalized.skills.technical)) normalized.skills.technical = [normalized.skills.technical];
    if (!Array.isArray(normalized.skills.languages)) normalized.skills.languages = [normalized.skills.languages];
    if (!Array.isArray(normalized.skills.soft)) normalized.skills.soft = [normalized.skills.soft];

    return normalized;
}

// Parse resume with AI and extract structured data
async function parseResumeWithAI(input) {
    let prompt;
    // Simplified prompt without example values that small models copy
    const getSystemInstruction = (resumeText) => `TASK: Extract information from the following resume into JSON.

RESUME:
${resumeText}

Extract the above resume into this JSON structure. Fill in values from the resume above:
{
  "profile": {
    "personal": {
      "firstName": "<first name from resume>",
      "lastName": "<last name from resume>",
      "email": "<email from resume>",
      "phone": "<phone from resume>",
      "linkedIn": "<linkedin url or null>",
      "github": "<github url or null>",
      "portfolio": null
    },
    "address": {
      "city": "<city>",
      "state": "<state>",
      "country": "<country>"
    },
    "summary": "<professional summary from resume>"
  },
  "experience": [
    {
      "company": "<company name>",
      "title": "<job title>",
      "location": "<location>",
      "startDate": "<start date>",
      "endDate": "<end date or Present>",
      "current": true or false,
      "description": "<job description>"
    }
  ],
  "education": [
    {
      "institution": "<school name>",
      "degree": "<degree>",
      "field": "<field of study>",
      "startDate": "<start year>",
      "endDate": "<end year>",
      "gpa": "<gpa or null>"
    }
  ],
  "skills": {
    "technical": ["<skill1>", "<skill2>"],
    "languages": ["<language1>"],
    "soft": ["<soft skill1>"]
  }
}

Return ONLY the JSON with actual values from the resume. No explanations.`;

    // Handle PDF Input (Multimodal) - for PDF we need to use a different approach
    if (input.resumeData && input.mimeType) {
        // Check if using local model - local models can't process PDFs
        const data = await loadData();
        const settings = data.settings || {};
        if (settings.useLocalModel && settings.ollamaUrl && settings.ollamaModel) {
            return {
                success: false,
                error: '⚠️ Local models cannot process PDF files. Please paste your resume as text instead, or disable "Use Local Model" in Settings to use Gemini API for PDF parsing.'
            };
        }

        // For Gemini API, we can use multimodal PDF parsing
        const pdfPrompt = `Extract all information from this resume PDF into JSON format.
Return a JSON object with: profile (personal info, address, summary), experience (array), education (array), skills (technical, languages, soft arrays).
Extract the actual names, emails, dates, companies from the document. Return ONLY valid JSON.`;
        prompt = [
            { text: pdfPrompt },
            {
                inlineData: {
                    mimeType: input.mimeType,
                    data: input.resumeData
                }
            }
        ];
    }
    // Handle Text Input - use the improved prompt with resume text first
    else {
        const text = input.resumeText || input;
        if (!text || (typeof text === 'string' && text.trim().length < 50)) {
            return { success: false, error: 'Please paste a complete resume with enough content to parse.' };
        }
        prompt = getSystemInstruction(text);
    }

    try {
        // Enable JSON mode for structured output
        const result = await callGeminiAPI(prompt, null, true);

        if (!result) {
            return { success: false, error: 'No response from AI. Please try again.' };
        }

        // Clean up the response - find valid JSON object
        let jsonStr = result.trim();

        // Remove markdown code blocks if present
        if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
        }

        // Locate the actual JSON object if there's extra text
        const firstCurly = jsonStr.indexOf('{');
        const lastCurly = jsonStr.lastIndexOf('}');

        if (firstCurly !== -1 && lastCurly !== -1) {
            jsonStr = jsonStr.substring(firstCurly, lastCurly + 1);
        }

        // Parse the JSON
        let parsedData = JSON.parse(jsonStr);

        // Normalize different JSON formats to expected structure
        parsedData = normalizeResumeData(parsedData);

        // Validate that we got actual data, not template/example data
        const firstName = parsedData?.profile?.personal?.firstName;
        const name = parsedData?.profile?.name || parsedData?.name;
        const email = parsedData?.profile?.personal?.email || parsedData?.profile?.email || parsedData?.email;

        // Check if we have any real data
        const hasRealData = (firstName && !firstName.toLowerCase().includes('<')) ||
            (name && !name.toLowerCase().includes('<')) ||
            (email && email.includes('@') && !email.includes('example'));

        if (!hasRealData) {
            console.warn('Parsed data may be template values:', parsedData);
            return { success: false, error: 'Could not extract data from resume. Please try again.' };
        }

        // If successful and we have PDF data, save it for future auto-uploads
        if (input.resumeData && input.mimeType) {
            try {
                const data = await loadData();
                if (!data.documents) data.documents = {};
                data.documents.resumeFile = {
                    data: input.resumeData,
                    mimeType: input.mimeType,
                    timestamp: Date.now()
                };
                await chrome.storage.local.set({ 'jobFillerData': data });
            } catch (storageError) {
                console.warn('Failed to save resume file:', storageError);
            }
        }

        return {
            success: true,
            data: parsedData,
            message: 'Resume parsed successfully!'
        };
    } catch (error) {
        console.error('Resume parsing error:', error);

        if (error.message.includes('JSON')) {
            return { success: false, error: 'Failed to parse AI response. Please try again.' };
        }

        return { success: false, error: error.message };
    }
}

async function handleGetFieldValue(fieldInfo) {
    const data = await loadData();

    // Try File Upload (Resume/CV)
    if (fieldInfo.type === 'file') {
        const label = (fieldInfo.label || '').toLowerCase();
        // Check if it looks like a resume field
        if (label.includes('resume') || label.includes('cv') || label.includes('curriculum')) {
            if (data.documents?.resumeFile) {
                return {
                    success: true,
                    value: data.documents.resumeFile,
                    method: 'file_upload'
                };
            }
        }
    }

    // Try direct match first
    let value = findDirectMatch(fieldInfo, data);
    if (value) {
        return { success: true, value, method: 'direct' };
    }

    // Try Q&A match
    value = findQnAMatch(fieldInfo, data);
    if (value) {
        return { success: true, value, method: 'qna' };
    }

    // Use AI if enabled
    const settings = data.settings || {};
    if (settings.enableAI !== false) {
        try {
            value = await processFieldWithAI(fieldInfo, data);
            if (value && value !== 'SKIP') {
                return { success: true, value, method: 'ai' };
            }
        } catch (error) {
            console.error('AI processing error:', error);
        }
    }

    return { success: false, reason: 'No match found' };
}

async function handleFillForm(fields) {
    const results = [];
    const data = await loadData();

    for (const field of fields) {
        const result = await handleGetFieldValue(field);
        results.push({
            fieldId: field.id || field.name,
            ...result
        });
    }

    return { success: true, results };
}

async function testApiKey(apiKey) {
    try {
        // Use direct fetch with short timeout for fast testing
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'Say "valid"' }] }],
                generationConfig: { maxOutputTokens: 10 }
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errData = await response.json();
            return { success: false, error: errData.error?.message || `Error ${response.status}` };
        }

        const result = await response.json();
        if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
            return { success: true };
        }
        return { success: false, error: 'No response from model' };
    } catch (error) {
        if (error.name === 'AbortError') {
            return { success: false, error: 'Request timed out (10s). Check your connection.' };
        }
        return { success: false, error: error.message };
    }
}

async function testSpecificModel(model, apiKey) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'Say "ok"' }] }],
                generationConfig: { maxOutputTokens: 5 }
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errData = await response.json();
            return { success: false, error: errData.error?.message || `Error ${response.status}` };
        }

        const result = await response.json();
        if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
            return { success: true };
        }
        return { success: false, error: 'No response from model' };
    } catch (error) {
        if (error.name === 'AbortError') {
            return { success: false, error: 'Timeout - model may be slow or unavailable' };
        }
        return { success: false, error: error.message };
    }
}

async function testOAuthConnection() {
    try {
        const token = await getOAuthToken(false);
        if (!token) {
            return { success: false, error: 'Not signed in' };
        }

        // Test the connection with a simple prompt
        const result = await callGeminiAPI('Say "Connected" in exactly that word.');
        if (result) {
            return { success: true, message: 'OAuth connection working!' };
        }
        return { success: false, error: 'API call failed' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Initialize
chrome.runtime.onInstalled.addListener(() => {
    console.log('JobFiller AI installed');
});

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
        const userName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Candidate';
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

        const result = await callGeminiAPI(prompt);

        if (!result) {
            return { success: false, error: 'Failed to generate cover letter.' };
        }

        return { success: true, text: result.trim() };
    } catch (error) {
        console.error('Cover letter generation error:', error);
        return { success: false, error: error.message };
    }
}

// Analyze Job Match (Resume vs JD)
async function analyzeJobMatch(jobDescription) {
    if (!jobDescription || jobDescription.length < 50) {
        return { success: false, error: 'Job description too short.' };
    }

    try {
        const data = await loadData();
        const profile = data.profile || {};
        const experience = data.experience || [];
        const skills = data.skills || {};
        const storedResume = data.documents?.resume || '';

        // Build User Context
        let userContext = storedResume;
        if (!userContext || userContext.length < 100) {
            userContext = JSON.stringify({ profile, experience, skills }, null, 2);
        }

        // OPTIMIZATION: Limit Context Size (Speed Hack)
        const MAX_CONTEXT = 3000;
        const truncatedJD = jobDescription.substring(0, MAX_CONTEXT);
        const truncatedResume = userContext.substring(0, MAX_CONTEXT);

        const prompt = `Task: Compare Resume vs Job Description.
RETURN JSON ONLY.

JOB:
${truncatedJD}

RESUME:
${truncatedResume}

OUTPUT Format:
{
  "score": 0-100,
  "summary": "1 sentence summary",
  "missingSkills": ["skill1", "skill2"],
  "matchingSkills": ["skill1", "skill2"]
}`;

        const result = await callGeminiAPI(prompt, { temperature: 0 }, true); // JSON Mode
        if (result) {
            const parsed = JSON.parse(result);
            return { success: true, data: parsed };
        }
        return { success: false, error: 'Analysis failed.' };

    } catch (error) {
        console.error('Match analysis error:', error);
        return { success: false, error: error.message };
    }
}

// Learn from fields handler
async function learnFromFieldsHandler(newFields) {
    if (!newFields || !Array.isArray(newFields) || newFields.length === 0) {
        return { success: false, count: 0 };
    }

    try {
        const data = await loadData();
        const qna = data.qna || [];
        let addedCount = 0;

        for (const field of newFields) {
            // Check if this question already exists (fuzzy match)
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
            }
        }

        if (addedCount > 0) {
            data.qna = qna;
            await chrome.storage.local.set({ 'jobFillerData': data });
        }

        return { success: true, count: addedCount };
    } catch (error) {
        console.error('Learn handler error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// OLLAMA LOCAL MODEL API
// ============================================

async function connectToOllamaServer(url) {
    Logger.info(`[Ollama] Connecting to ${url}...`);
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        Logger.debug(`[Ollama] Fetching tags from ${url}/api/tags`);
        const response = await fetch(`${url}/api/tags`, {
            method: 'GET',
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const text = await response.text();
            return { success: false, error: `Server returned ${response.status}: ${text || 'Unknown error'}` };
        }

        const text = await response.text();
        if (!text || text.trim() === '') {
            return { success: false, error: 'Empty response from Ollama. Is the server running correctly?' };
        }

        try {
            const data = JSON.parse(text);
            return { success: true, models: data.models || [] };
        } catch (parseError) {
            return { success: false, error: `Invalid JSON response: ${text.substring(0, 100)}` };
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            return { success: false, error: 'Connection timeout. Is Ollama running?' };
        }
        if (error.message.includes('Failed to fetch')) {
            return { success: false, error: 'Cannot connect. Is Ollama running? (ollama serve)' };
        }
        return { success: false, error: error.message };
    }
}

async function testOllamaModel(url, model) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(`${url}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                prompt: 'Say "ok"',
                stream: false,
                options: { num_predict: 5 }
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errData = await response.json();
            return { success: false, error: errData.error || `Error ${response.status}` };
        }

        const data = await response.json();
        if (data.response) {
            return { success: true };
        }
        return { success: false, error: 'No response from model' };
    } catch (error) {
        if (error.name === 'AbortError') {
            return { success: false, error: 'Timeout - model may be loading' };
        }
        return { success: false, error: error.message };
    }
}

// ------------------------------------------------------------------
// 4. AI API CALLS (Brain / Gemini)
// ------------------------------------------------------------------

// Call the Local AI Brain (MCP Server)
async function callBrainAPI(prompt, jsonMode, model) {
    const data = await chrome.storage.local.get(['settings']);
    const useBrain = data.settings?.useAIBrain ?? true;

    // DIRECT MODE: If Brain is disabled by user, go straight to legacy
    if (!useBrain) {
        Logger.info('[AI] Brain disabled, switching to direct connection.');
        return callOllamaAPI_Direct(prompt, jsonMode, model);
    }

    // CHECK: If user selected Gemini but has no key, switch to Local
    const apiKey = data.settings?.geminiApiKey;
    if (model?.startsWith('gemini') && !apiKey) {
        Logger.warn('[AI] Gemini requested but no API Key found. Switching to Local Model (Llama 3.1).');
        model = 'llama3.1:latest';
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout // Changed timeout from 5s to 30s

    try {
        Logger.info('[AI] Contacting Brain Server...', { url: BRAIN_API_URL, model }); // Added Logger.info

        const messages = [];
        if (typeof prompt === 'string') {
            messages.push({ role: 'user', content: prompt });
        } else if (Array.isArray(prompt)) {
            messages.push({ role: 'user', content: prompt[0].text });
        }

        const response = await fetch(BRAIN_API_URL, { // Changed URL to BRAIN_API_URL
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: messages, // Changed body structure
                model: model, // Changed body structure
                stream: false,
                json: jsonMode // Added jsonMode to body
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Brain Server Error: ${response.status}`);
        }

        const json = await response.json();
        Logger.info('[AI] Brain Response Received', { length: json.choices?.[0]?.message?.content?.length }); // Added Logger.info
        let content = json.choices?.[0]?.message?.content || '';

        // Safely parse if JSON mode requested
        if (jsonMode) {
            try {
                // Attempt to parse the content as JSON.
                // If the model was instructed to output JSON, it should be valid.
                // If it's not, we'll log an error but still return the raw content.
                const parsedContent = JSON.parse(content);
                // If parsing is successful, we might want to return the parsed object
                // or stringify it back depending on the expected return type of callBrainAPI.
                // For now, let's assume the caller expects a string, so we'll keep 'content' as is
                // unless we explicitly want to return the object.
                // The instruction implies returning content, so we'll just log the success.
                Logger.info('[AI] Successfully parsed JSON from Brain response.');
            } catch (e) {
                Logger.error('[AI] JSON Parse failed', { error: e.message, content: content.substring(0, 200) }); // Added Logger.error
                // If parsing fails, we still return the raw content, as it might be a partial
                // or malformed JSON that the caller can handle, or it might not have been JSON
                // despite jsonMode being true (e.g., model error).
            }
        }
        return content;

    } catch (error) {
        clearTimeout(timeoutId);
        Logger.error('[AI] Brain Unreachable, triggering Fallback', { error: error.message }); // Changed console.warn to Logger.error

        // AUTO-FALLBACK: Connect directly to Ollama
        return callOllamaAPI_Direct(prompt, jsonMode, model);
    }
}

// Renamed original Ollama caller to _Direct to avoid recursion
async function callOllamaAPI_Direct(prompt, jsonMode, model) {
    const data = await chrome.storage.local.get(['settings']);
    const ollamaUrl = data.settings?.ollamaUrl || 'http://localhost:11434';
    const ollamaModel = model || data.settings?.ollamaModel || 'llama3.1:latest';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const isDeepSeek = ollamaModel.toLowerCase().includes('deepseek');

    try {
        let systemPrompt = "You are a helpful form filling assistant. Output strictly JSON.";
        let userPrompt = prompt;

        if (Array.isArray(prompt)) {
            userPrompt = prompt[0].text;
        }

        const messages = [];
        if (jsonMode) { // If JSON mode is requested, ensure system prompt guides it
            messages.push({ role: 'system', content: "You are a helpful assistant designed to output JSON." });
        }

        if (isDeepSeek) {
            messages.push({ role: 'user', content: `${systemPrompt}\n\nTask: ${userPrompt}` });
        } else {
            if (!jsonMode) { // Only add generic system prompt if not already added for JSON
                messages.push({ role: 'system', content: systemPrompt });
            }
            messages.push({ role: 'user', content: userPrompt });
        }

        const body = {
            model: ollamaModel,
            messages: messages,
            stream: false,
            options: { temperature: 0.1 }
        };

        if (jsonMode) {
            body.format = "json";
        }

        const response = await fetch(`${ollamaUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Ollama Error: ${response.status}`);
        }

        const responseData = await response.json();
        return responseData.message.content;

    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

async function callOllamaAPI(prompt, jsonMode, model) {
    // Wrapper that now decides: Brain or Direct?
    return callBrainAPI(prompt, jsonMode, model);
}

async function callGeminiAPI(prompt, apiKeyOverride, jsonMode) {
    try {
        const data = await chrome.storage.local.get(['settings', 'profile']);
        const settings = data.settings || {};
        const apiKey = apiKeyOverride || settings.geminiApiKey;
        const model = settings.geminiModel || 'gemini-pro';

        if (!apiKey) {
            throw new Error('Gemini API Key not set.');
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

        const requestBody = {
            contents: [{ role: 'user', parts: Array.isArray(prompt) ? prompt : [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
            }
        };

        if (jsonMode) {
            requestBody.generationConfig.responseMimeType = 'application/json';
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Gemini API Error: ${response.status} - ${errorData.error.message}`);
        }

        const result = await response.json();
        return result.candidates[0].content.parts[0].text;

    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        console.error('Gemini API Error:', error);
        throw error;
    }
}

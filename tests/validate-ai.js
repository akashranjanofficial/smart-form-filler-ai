
const fs = require('fs');

// USER PROFILE (From your request)
const profile = {
    "profile": {
        "address": {
            "city": "San Francisco",
            "country": "United States",
            "state": "California",
            "street": "123 Tech Avenue",
            "zip": "94105"
        },
        "personal": {
            "email": "johndoe@example.com",
            "firstName": "John",
            "github": "https://github.com/johndoe",
            "lastName": "Doe",
            "linkedIn": "linkedin.com/in/johndoe",
            "phone": "+1 555-0123-456",
            "portfolio": "https://johndoe.com"
        },
        "summary": "Experienced Software Engineer with 5+ years in full-stack development, specializing in JavaScript, React, and Node.js."
    },
    "experience": [
        {
            "company": "Tech Solutions Inc.",
            "current": true,
            "description": "Leading frontend development for cloud-based dashboard. Optimized performance by 40% using React and Redux.",
            "endDate": "",
            "id": "exp1",
            "location": "San Francisco, CA",
            "startDate": "Jan 2022",
            "title": "Senior Frontend Engineer"
        },
        {
            "company": "StartUp Late",
            "current": false,
            "description": "Developed MVP for e-commerce platform using MERN stack. Integrated Stripe payments and Auth0 authentication.",
            "endDate": "Dec 2021",
            "id": "exp2",
            "location": "Remote",
            "startDate": "Jun 2020",
            "title": "Software Developer"
        }
    ],
    "education": [
        {
            "degree": "Bachelor of Science in Computer Science",
            "endDate": "2020",
            "field": "Computer Science",
            "gpa": "3.8/4.0",
            "id": "edu1",
            "institution": "University of Technology",
            "startDate": "2016"
        }
    ],
    "qna": [
        { "answer": "Yes", "question": "Are you authorized to work in US?" },
        { "answer": "No", "question": "Will you now or in the future require sponsorship?" },
        { "answer": "2 Weeks", "question": "What is your notice period?" }
    ]
};

// COMPREHENSIVE TEST CASES (20+ Questions)
const testCases = [
    // --- PERSONAL ---
    { label: "First Name", type: "text", nearbyText: "Personal Info", expected: "John" },
    { label: "Last Name", type: "text", nearbyText: "Personal Info", expected: "Doe" },
    { label: "Email Address", type: "email", nearbyText: "Contact", expected: "johndoe@example.com" },
    { label: "Phone Number", type: "tel", nearbyText: "Contact", expected: "+1 555-0123-456" },
    { label: "LinkedIn Profile", type: "url", nearbyText: "Social", expected: "linkedin.com/in/johndoe" },
    { label: "GitHub URL", type: "url", nearbyText: "Social", expected: "https://github.com/johndoe" },

    // --- ADDRESS ---
    { label: "Street Address", type: "text", nearbyText: "Address", expected: "123 Tech Avenue" },
    { label: "City", type: "text", nearbyText: "Address", expected: "San Francisco" },
    { label: "State", type: "text", nearbyText: "Address", expected: "California" },
    { label: "Postal Code", type: "text", nearbyText: "Address", expected: "94105" },

    // --- EDUCATION ---
    { label: "University/School", type: "text", nearbyText: "Education", expected: "University of Technology" },
    { label: "Degree", type: "text", nearbyText: "Education", expected: "Bachelor of Science in Computer Science" },
    { label: "Major/Field of Study", type: "text", nearbyText: "Education", expected: "Computer Science" },
    { label: "GPA", type: "text", nearbyText: "Education", expected: "3.8/4.0" },
    { label: "Graduation Year", type: "text", nearbyText: "Education", expected: "2020" },

    // --- EXPERIENCE ---
    { label: "Company Name", type: "text", nearbyText: "Work Experience 1", expected: "Tech Solutions Inc." },
    { label: "Job Title", type: "text", nearbyText: "Work Experience 1", expected: "Senior Frontend Engineer" },
    { label: "Start Date", type: "text", nearbyText: "Work Experience 1", expected: "Jan 2022" },
    { label: "Job Description", type: "textarea", nearbyText: "Work Experience 1", expected: "Leading frontend development..." },

    // --- Skills & Open Ended ---
    { label: "Skills", type: "textarea", nearbyText: "List your technical skills" },
    { label: "Programming Languages", type: "text" },
    { label: "Why should we hire you?", type: "textarea" },
    { label: "How did you hear about us?", type: "select-one", options: ["LinkedIn", "Glassdoor", "Social Media", "Other"] },

    // --- Logistics / Q&A ---
    { label: "Are you willing to relocate?", type: "radio", options: ["Yes", "No"] },
    { label: "Do you require sponsorship?", type: "radio", options: ["Yes", "No"] },
    { label: "How soon can you start?", type: "text" },

    // --- Demographics (EEO) ---
    { label: "Gender", type: "select-one", options: ["Male", "Female", "Decline to Identify"] },
    { label: "Veteran Status", type: "select-one", options: ["I am a veteran", "I am not a veteran"] },
    { label: "Disability Status", type: "select-one", options: ["Yes", "No", "Decline"] },

    // --- Q&A / TRICKY ---
    { label: "Notice Period", type: "text", nearbyText: "Additional Info", expected: "2 Weeks" },
    { label: "Are you authorized to work in India?", type: "radio", options: ["Yes", "No"], expected: "Yes" },
    { label: "Expected Salary", type: "text", nearbyText: "Expectations", expected: "SKIP" },

    // --- BYTEDANCE / COMPLEX FORM SIMULATION (From Screenshot) ---
    // These test if the "Name" rule is strictly applied (should NOT match Personal Name)
    { label: "School Name", type: "text", nearbyText: "Education History", expected: "University of Technology" },
    { label: "Name of Employer", type: "text", nearbyText: "Work Experience", expected: "Tech Solutions Inc." },
    { label: "Project Name", type: "text", nearbyText: "Project Experience", expected: "SKIP" }, // Should not be John Doe
    { label: "City of Residence", type: "text", nearbyText: "Address", expected: "San Francisco" },
    { label: "Nationality", type: "select-one", options: ["Indian", "American", "Other"], expected: "SKIP" }, // Profile doesn't strictly say
    { label: "Gender", type: "select-one", options: ["Male", "Female"], expected: "Male" }
];

async function runTests() {
    const model = process.argv[2] || 'llama3.1:latest';
    console.log(`🚀 Starting Comprehensive AI Validation (using local Ollama: ${model})...\n`);
    console.log("| Field Label | Expected (approx) | AI Response | Status |");
    console.log("|---|---|---|---|");

    for (const test of testCases) {
        await processField(test, model);
    }
}

// Heuristic: Try to match field directly to profile data without AI
function tryGetHeuristicValue(fieldInfo, data) {
    const l = fieldInfo.label.toLowerCase().trim().replace(/\*$/, '').trim();
    const p = data.profile?.personal || {};
    const a = data.profile?.address || {};

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
    if (l.includes('street') || l === 'address') return { value: a.street };
    if (l.includes('city') || l === 'town') return { value: a.city };
    if (l.includes('state') || l === 'province') return { value: a.state };
    if (l.includes('zip') || l.includes('postal') || l.includes('pincode')) return { value: a.zip };
    if (l === 'country') return { value: a.country };
    return null;
}

async function processField(fieldInfo, model) {
    // 0. HEURISTIC CHECK
    const heuristic = tryGetHeuristicValue(fieldInfo, profile);
    if (heuristic) {
        const actual = heuristic.value;
        const expected = fieldInfo.expected || "";
        let status = "✅";
        if (actual.toLowerCase() !== expected.toLowerCase() && !actual.toLowerCase().includes(expected.toLowerCase())) {
            // Heuristic should be EXACT or close.
            status = "❌";
        }

        const dispExpected = expected.length > 30 ? expected.substring(0, 27) + "..." : expected;
        const dispActual = actual.length > 30 ? actual.substring(0, 27) + "..." : actual;
        console.log(`| ${fieldInfo.label} | ${dispExpected} | ${dispActual} (Heuristic) | ${status} |`);
        return;
    }

    // 1. Construct Prompt ...
    const profileContext = JSON.stringify(profile, null, 2);

    // Improved Prompt Construction
    const prompt = `You are a form-filling assistant. 
Your ONLY goal is to extract the correct value for the target field in JSON format.

CONTEXT (User Profile):
${profileContext}

TARGET FIELD:
- Label: "${fieldInfo.label}"
- Type: ${fieldInfo.type}
- Context: ${fieldInfo.nearbyText || ''}

CRITICAL INSTRUCTIONS (FOLLOW STRICTLY):
1. **LEARNED ANSWERS FIRST**: If "qna" section contains a match, use it.

2. **STRICT CONTEXT SCOPE**:
   - If Label is **EXACTLY** "Name" or "Full Name" -> Combine "First Name" and "Last Name". NEVER use Company Name.
   - If Label is **"School Name"** or **"Company Name"** -> Treat as Organization Name. DO NOT use Personal Name.
   - If Label involves **"Company", "Employer", "Work", "Experience", "Title", "Role", "Position"** -> Look ONLY in "experience" array.
   - If Label involves **"School", "University", "College", "Degree", "Faculty"** -> Look ONLY in "education" array.
   - If Label involves **"Email", "Phone", "Mobile"** -> Look ONLY in "personal".
   - If Label involves **"Skill", "Stack", "Language", "Technologies"** -> Look ONLY in "skills" array (Technical, Languages).
   - If Label is **"Description"** inside a Work/Experience section -> Generate a summary of roles/responsibilities. Do NOT put "Notice Period".

3. **NEGATIVE CONSTRAINTS** (Prevent Hallucinations):
   - **NEVER use a 6-digit number (like "560001") for a Company Name, School Name, Faculty, or City.** That is a Pincode. If you find only numbers for a name field, return "SKIP".
   - **NEVER use "60 Days" or "Notice Period" for a "Description" field**.

4. **FORMAT RULES**:
   - Pincode/Postal Code: ONLY numbers (e.g., "560001"). 
   - Phone/Mobile: International format.

5. Return ONLY valid JSON: { "value": "your answer" }

YOUR RESPONSE (JSON):`;

    try {
        // Call Ollama
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                stream: false,
                format: 'json'
            })
        });

        const data = await response.json();
        const result = JSON.parse(data.response);
        const actual = result.value || "SKIP";
        const expected = fieldInfo.expected || "";

        let status = "✅";
        // Basic fuzzy check
        if (!actual.toLowerCase().includes(expected.toLowerCase().substring(0, 10)) && expected !== "SKIP") {
            status = "❌";
        }
        if (expected === "SKIP" && actual !== "SKIP" && actual !== "") {
            status = "❓"; // Maybe AI knew something we didn't?
        }

        // Check for Specific Failures
        if (fieldInfo.label.includes("Company") && actual.match(/\d{6}/)) status = "❌ PINCODE DETECTED";
        if (fieldInfo.label.includes("School") && actual.match(/\d{6}/)) status = "❌ PINCODE DETECTED";

        // Truncate for display
        const dispExpected = expected.length > 30 ? expected.substring(0, 27) + "..." : expected;
        const dispActual = actual.length > 30 ? actual.substring(0, 27) + "..." : actual;

        console.log(`| ${fieldInfo.label} | ${dispExpected} | ${dispActual} | ${status} |`);

    } catch (e) {
        console.error(`| ${fieldInfo.label} | ERROR | ${e.message} | ❌ |`);
    }
}

// Run
runTests();

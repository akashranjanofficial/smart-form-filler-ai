// Storage utilities for JobFiller AI

// Default profile structure
const DEFAULT_PROFILE = {
  personal: {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    linkedIn: "",
    portfolio: "",
    github: ""
  },
  address: {
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "India"
  },
  summary: ""
};

const DEFAULT_DATA = {
  profile: DEFAULT_PROFILE,
  experience: [],
  education: [],
  skills: {
    technical: [],
    languages: [],
    soft: []
  },
  documents: {
    resume: "",
    coverLetter: ""
  },
  qna: [
    { id: "1", question: "Are you authorized to work in India?", answer: "Yes" },
    { id: "2", question: "Will you now or in the future require sponsorship?", answer: "No" },
    { id: "3", question: "What is your expected salary?", answer: "" },
    { id: "4", question: "What is your notice period?", answer: "" },
    { id: "5", question: "Are you willing to relocate?", answer: "Yes" }
  ],
  settings: {
    geminiApiKey: "",
    autoShowButton: true,
    enableAI: true
  }
};

// Get all stored data
export async function getAllData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (result) => {
      if (Object.keys(result).length === 0) {
        resolve(DEFAULT_DATA);
      } else {
        // Merge with defaults to ensure all fields exist
        resolve({
          profile: { ...DEFAULT_DATA.profile, ...result.profile },
          experience: result.experience || DEFAULT_DATA.experience,
          education: result.education || DEFAULT_DATA.education,
          skills: { ...DEFAULT_DATA.skills, ...result.skills },
          documents: { ...DEFAULT_DATA.documents, ...result.documents },
          qna: result.qna || DEFAULT_DATA.qna,
          settings: { ...DEFAULT_DATA.settings, ...result.settings }
        });
      }
    });
  });
}

// Save specific section
export async function saveSection(section, data) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [section]: data }, resolve);
  });
}

// Get specific section
export async function getSection(section) {
  return new Promise((resolve) => {
    chrome.storage.local.get(section, (result) => {
      resolve(result[section] || DEFAULT_DATA[section]);
    });
  });
}

// Save all data
export async function saveAllData(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, resolve);
  });
}

// Clear all data
export async function clearAllData() {
  return new Promise((resolve) => {
    chrome.storage.local.clear(resolve);
  });
}

// Export data as JSON
export async function exportData() {
  const data = await getAllData();
  // Don't export API key for security
  const exportData = { ...data };
  if (exportData.settings) {
    exportData.settings = { ...exportData.settings, geminiApiKey: "" };
  }
  return JSON.stringify(exportData, null, 2);
}

// Import data from JSON
export async function importData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    // Preserve existing API key
    const currentSettings = await getSection('settings');
    if (data.settings && currentSettings.geminiApiKey) {
      data.settings.geminiApiKey = currentSettings.geminiApiKey;
    }
    await saveAllData(data);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Generate unique ID
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

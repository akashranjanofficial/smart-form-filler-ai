# Privacy Policy for Smart Form Filler AI

**Last Updated:** February 3, 2026

## Overview

Smart Form Filler AI ("the Extension") is committed to protecting your privacy. This policy explains how we handle your data.

## Data Collection

### What We Collect
**Nothing.** We do not collect, transmit, or store any of your data on external servers.

### What You Store Locally
The Extension stores the following data **locally in your browser** using Chrome's storage API:

- **Profile Information**: Name, email, phone, address (that you enter)
- **Professional Data**: Work experience, education, skills
- **Learned Q&A**: Questions and answers learned from forms you fill
- **Settings**: Your AI preferences and configuration

## Data Storage

- All data is stored **locally** in Chrome's `chrome.storage.local`
- Data never leaves your device unless you explicitly export it
- You can delete all stored data at any time through the extension

## AI Processing

### Local AI (Ollama)
- Runs entirely on your computer
- No data sent to external servers
- 100% private

### Google Gemini (Optional)
- If you choose to use Gemini AI, your form field prompts are sent to Google's API
- Only field labels and your profile data are sent (to determine appropriate values)
- Subject to [Google's Privacy Policy](https://policies.google.com/privacy)

### AI Brain Server (Optional)
- Runs locally on your computer (localhost:3000)
- No external data transmission
- Memory stored in local vector database

## Permissions Explained

| Permission | Purpose |
|------------|---------|
| `storage` | Store your profile data locally |
| `activeTab` | Read form fields on the current page |
| `scripting` | Inject the autofill script |

## Third-Party Services

The Extension may connect to:
- **Ollama** (localhost:11434) - Local AI, no external servers
- **Google Gemini API** - Only if you enable and provide an API key
- **AI Brain Server** (localhost:3000) - Local server you run yourself

## Data Sharing

We do **NOT**:
- Sell your data
- Share your data with third parties
- Use your data for advertising
- Track your browsing activity
- Collect analytics

## Your Rights

You can:
- **Export** your data at any time (JSON format)
- **Delete** all data via "Clear All Data" in Settings
- **Disable** the extension to stop all processing

## Children's Privacy

This Extension is not intended for children under 13. We do not knowingly collect data from children.

## Changes to This Policy

We may update this policy occasionally. Changes will be noted with a new "Last Updated" date.

## Contact

For privacy concerns:
- **Email**: privacy@smartformfiller.com
- **GitHub**: https://github.com/akashranjan/smart-form-filler/issues

## Summary

✅ All data stored locally on your device  
✅ No data collection or tracking  
✅ No external servers (unless you opt-in to Gemini)  
✅ You control your data completely  
✅ Delete everything anytime  

---

© 2026 Akash Ranjan. All rights reserved.

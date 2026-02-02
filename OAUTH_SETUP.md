# JobFiller AI - OAuth Setup Guide

To enable **Sign in with Google** for automatic Gemini API access, you need to set up OAuth credentials in Google Cloud Console.

## Quick Start (5 minutes)

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Name it: `JobFiller AI`
4. Click **Create**

### Step 2: Enable Required APIs

1. Go to **APIs & Services** → **Library**
2. Search and enable:
   - **Generative Language API** (for Gemini)
   
### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** and click **Create**
3. Fill in:
   - App name: `JobFiller AI`
   - User support email: Your email
   - Developer contact: Your email
4. Click **Save and Continue**
5. On Scopes page, click **Add or Remove Scopes**
6. Add these scopes:
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
7. Click **Save and Continue**
8. Add your email as a test user
9. Click **Save and Continue**

### Step 4: Create OAuth Client ID

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Chrome Extension**
4. Name: `JobFiller AI Extension`
5. **Item ID**: Get this from your extension:
   - Load the extension in Brave
   - Go to `brave://extensions`
   - Copy the extension ID (e.g., `abcdefghijklmnopqrstuvwxyz123456`)
6. Click **Create**
7. Copy the **Client ID** (looks like: `123456789.apps.googleusercontent.com`)

### Step 5: Update manifest.json

1. Open `/Users/akashranjan/formfiller/manifest.json`
2. Replace the placeholder values:

```json
"oauth2": {
  "client_id": "YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com",
  "scopes": [
    "https://www.googleapis.com/auth/generative-language.retriever",
    "https://www.googleapis.com/auth/userinfo.email"
  ]
}
```

3. For the `"key"` field, you can remove it or generate one:
   - Go to `brave://extensions`
   - Enable Developer mode
   - Click "Pack extension" on your extension
   - This will generate a `.pem` file - the key is inside

### Step 6: Reload Extension

1. Go to `brave://extensions`
2. Click the reload button on JobFiller AI
3. Open the extension and try **Sign in with Google**

---

## Alternative: Use API Key Instead

If OAuth setup seems complex, you can simply use a Gemini API key:

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **Create API Key**
3. Copy the key
4. Paste it in JobFiller AI → Settings → Manual API Key

Both methods work! OAuth is more convenient (no key to manage), while the API key is simpler to set up initially.

---

## Troubleshooting

### "Authorization Error" when signing in
- Make sure your Client ID is correct in manifest.json
- Reload the extension after changing manifest.json
- Add your email as a test user in OAuth consent screen

### "Invalid Client" error
- Double-check the extension ID matches what you entered in Google Cloud Console
- Make sure you selected "Chrome Extension" as the application type

### API calls failing after sign-in
- Ensure "Generative Language API" is enabled in your Google Cloud project
- Check that the OAuth scopes in manifest.json include the required permissions

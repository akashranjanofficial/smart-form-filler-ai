# Changelog

All notable changes to Smart Form Filler AI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-02-03

### Added
- 🧠 **AI Brain Server** - Optional RAG-powered memory server for smarter, context-aware form filling
- 📚 **Learning Mode** - Learn from manually filled forms and reuse answers
- 🔄 **Q&A Storage** - Stored learned Q&A pairs are used in future autofills
- 📊 **Comprehensive Testing** - 112 unit tests covering all major functionality
- 📝 **Better Field Matching** - Improved algorithm with specificity sorting (longer keys match first)
- 🎯 **Workday Support** - Better detection of `data-automation-id` fields
- 📖 **Documentation** - Complete README, CHANGELOG, LICENSE, and Privacy Policy

### Changed
- ⚡ **Optimized Permissions** - Moved to optional permissions model for better privacy
- 🔧 **Manifest v3** - Full compliance with Chrome's Manifest V3 requirements
- 📦 **Cleaner Storage** - Q&A data stored at root level for consistency
- 🎨 **UI Improvements** - Clearer AI Brain settings with explanatory text

### Fixed
- 🐛 **IIFE Scope Bug** - Fixed `init()` function being outside the closure
- 🐛 **Profile Path Bug** - Fixed profile data check using wrong nested paths
- 🐛 **Full Name Matching** - Fixed "fullname" incorrectly matching "name" first
- 🐛 **Learn Storage Bug** - Fixed learn handler saving to wrong storage key
- 🐛 **Label Extraction** - Improved sibling and parent label detection

### Security
- 🔒 Removed unnecessary `identity` permission
- 🔒 Made `unlimitedStorage` optional
- 🔒 Made `<all_urls>` host permission optional

## [1.1.0] - 2025-12-15

### Added
- Gemini AI support as alternative to Ollama
- Resume PDF parsing
- Cover letter generation
- Rich text (contenteditable) field support

### Changed
- Improved field detection heuristics
- Better error handling for AI calls

### Fixed
- Select dropdown fuzzy matching
- Radio button group handling

## [1.0.0] - 2025-10-01

### Added
- Initial release
- Profile management (personal info, address, experience, education, skills)
- AutoFill functionality for web forms
- Ollama local AI integration
- Floating autofill button on pages
- Chrome storage for data persistence
- Basic field matching (name, email, phone, address fields)

---

## Upgrade Guide

### From 1.x to 2.0

1. **Backup your data** - Export your profile before upgrading
2. **Update the extension** - The new version handles migration automatically
3. **Enable AI Brain (Optional)** - For smarter fills, enable in Settings → AI Brain tab
4. **Review Permissions** - You may need to grant optional permissions for full functionality

### Breaking Changes in 2.0

- Q&A data is now stored at the root level (`qna`) instead of nested in `jobFillerData`
- Old learned data will be migrated automatically on first load

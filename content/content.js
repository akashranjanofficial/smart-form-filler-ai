// JobFiller AI - Content Script
// Injects autofill button and handles form filling

(function () {
    'use strict';

    // State
    let isButtonVisible = false;
    let autofillButton = null;
    let statusToast = null;
    let observer = null;
    let autoApplyActive = false; // Local state tracking global persistence
    let isFilling = false;
    let isAutofillCancelled = false;
    let hasManuallyStopped = false; // Fix for aggressive re-triggering
    let observerTimeout = null; // Fix ReferenceError

    // Check if page has forms or is a known job site
    function hasFormsOnPage() {
        // Always show on known job sites (even before forms load)
        const jobSitePatterns = [
            'greenhouse.io', 'lever.co', 'workday.com', 'myworkdayjobs.com',
            'linkedin.com/jobs', 'indeed.com', 'careers', 'jobs',
            'apply', 'application', 'icims.com', 'jobvite.com',
            'smartrecruiters.com', 'ashbyhq.com', 'bamboohr.com'
        ];
        const url = window.location.href.toLowerCase();
        const isJobSite = jobSitePatterns.some(pattern => url.includes(pattern));

        if (isJobSite) {
            console.log('Smart Form Filler: Job site detected, showing button');
            return true;
        }

        // Check for forms or any inputs (more lenient - inputs > 0 instead of > 3)
        const forms = document.querySelectorAll('form');
        const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select');
        return forms.length > 0 || inputs.length > 0;
    }

    // Create floating autofill button
    function createAutofillButton() {
        if (autofillButton) return;

        autofillButton = document.createElement('div');
        autofillButton.id = 'jobfiller-autofill-btn';
        autofillButton.innerHTML = `
      <div class="jobfiller-menu">
          <!-- Auto Apply and Analyze Fit buttons removed - backend kept for future -->
          <button id="jobfiller-cover-letter-btn" class="jobfiller-menu-item" title="Generate Cover Letter">
              <span class="jobfiller-icon-small">📝</span> Cover Letter
          </button>
          <button id="jobfiller-learn-btn" class="jobfiller-menu-item" title="Save filled fields as Q&A">
              <span class="jobfiller-icon-small">💾</span> Learn
          </button>
      </div>
      <div class="jobfiller-btn-content">
        <span class="jobfiller-icon">🚀</span>
        <span class="jobfiller-text">AutoFill</span>
      </div>
    `;

        // Inject Analysis Details Panel (Hidden)
        if (!document.getElementById('jf-match-details')) {
            const detailsPanel = document.createElement('div');
            detailsPanel.id = 'jf-match-details';
            detailsPanel.style.display = 'none';
            detailsPanel.innerHTML = `
            <div class="jf-header">
                <h3>Resume Fit</h3>
                <span id="jf-close">×</span>
            </div>
            <div id="jf-content">Loading...</div>
        `;
            // Inline CSS for details panel (since we removed widget injection)
            detailsPanel.style.cssText = `
            position: fixed; bottom: 80px; right: 20px; width: 300px; z-index: 10001;
            background: white; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            padding: 16px; font-size: 14px; display: none;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;
            // Close handler
            detailsPanel.querySelector('#jf-close').addEventListener('click', () => {
                detailsPanel.style.display = 'none';
            });
            document.body.appendChild(detailsPanel);
        }

        // Make it draggable
        let isDragging = false;
        let offsetX, offsetY;

        autofillButton.addEventListener('mousedown', (e) => {
            if (e.target.closest('.jobfiller-btn-content')) {
                isDragging = true;
                offsetX = e.clientX - autofillButton.getBoundingClientRect().left;
                offsetY = e.clientY - autofillButton.getBoundingClientRect().top;
                autofillButton.style.transition = 'none';
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                autofillButton.style.left = (e.clientX - offsetX) + 'px';
                autofillButton.style.top = (e.clientY - offsetY) + 'px';
                autofillButton.style.right = 'auto';
                autofillButton.style.bottom = 'auto';
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (isDragging) {
                isDragging = false;
                autofillButton.style.transition = 'all 0.3s ease';

                // Save position
                const rect = autofillButton.getBoundingClientRect();
                localStorage.setItem('jobfiller-btn-pos', JSON.stringify({
                    left: rect.left,
                    top: rect.top
                }));
            }
        });

        // Click handler (only if not dragging)
        let clickStartTime = 0;
        autofillButton.addEventListener('mousedown', () => {
            clickStartTime = Date.now();
        });

        autofillButton.addEventListener('click', (e) => {
            if (Date.now() - clickStartTime < 200) {
                if (isFilling) {
                    isAutofillCancelled = true;
                    hasManuallyStopped = true; // PERMANENT STOP until manual restart
                    showToast('🛑 Stopping... finishing current field', 'info');
                } else {
                    hasManuallyStopped = false; // Reset on manual start
                    handleAutofill();
                }
            }
        });

        // Cover letter click handler
        const coverLetterBtn = autofillButton.querySelector('#jobfiller-cover-letter-btn');
        if (coverLetterBtn) {
            coverLetterBtn.addEventListener('mousedown', (e) => e.stopPropagation()); // Prevent drag
            coverLetterBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleCoverLetter();
            });
        }

        // Learn click handler
        const learnBtn = autofillButton.querySelector('#jobfiller-learn-btn');
        if (learnBtn) {
            learnBtn.addEventListener('mousedown', (e) => e.stopPropagation());
            learnBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleLearnMode();
            });
        }

        // Analyze click handler
        const analyzeBtn = autofillButton.querySelector('#jobfiller-analyze-btn');
        if (analyzeBtn) {
            analyzeBtn.addEventListener('mousedown', (e) => e.stopPropagation());
            analyzeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const panel = document.getElementById('jf-match-details');
                // If already analyzed, just toggle panel
                if (analyzeBtn.innerText.includes('% Match')) {
                    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
                } else {
                    runAnalysis(); // Run analysis
                }
            });
        }

        // Auto Apply click handler - NOW WITH TOGGLE SUPPORT
        const applyBtn = autofillButton.querySelector('#jobfiller-auto-apply-btn');
        if (applyBtn) {
            applyBtn.addEventListener('mousedown', (e) => e.stopPropagation());
            applyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // CRITICAL FIX: Check if already running to toggle stop/start
                if (autoApplyActive) {
                    stopAutoApply(); // STOP if running
                } else {
                    if (confirm('Start Auto Apply? This will fill fields and click "Next/Apply" automatically.')) {
                        startAutoApply();
                    }
                }
            });
        }

        document.body.appendChild(autofillButton);

        // Restore position if saved
        const savedPos = localStorage.getItem('jobfiller-btn-pos');
        if (savedPos) {
            try {
                const pos = JSON.parse(savedPos);
                autofillButton.style.left = pos.left + 'px';
                autofillButton.style.top = pos.top + 'px';
                autofillButton.style.right = 'auto';
                autofillButton.style.bottom = 'auto';
            } catch (e) { }
        }

        isButtonVisible = true;
    }

    // Create status toast
    function createToast() {
        if (statusToast) return statusToast;

        statusToast = document.createElement('div');
        statusToast.id = 'jobfiller-toast';
        document.body.appendChild(statusToast);
        return statusToast;
    }

    // Show toast message
    function showToast(message, type = 'info') {
        const toast = createToast();
        toast.textContent = message;
        toast.className = `jobfiller-toast jobfiller-toast-${type}`;
        toast.classList.add('jobfiller-toast-show');

        setTimeout(() => {
            toast.classList.remove('jobfiller-toast-show');
        }, 3000);
    }

    // Extract field information
    function extractFieldInfo(element) {
        const info = {
            element: element,
            type: element.type || element.tagName.toLowerCase(),
            id: element.id,
            name: element.name,
            label: '',
            placeholder: element.placeholder || '',
            ariaLabel: element.getAttribute('aria-label') || '',
            nearbyText: '',
            options: [],
            // Workday-specific attributes
            automationId: element.getAttribute('data-automation-id') || '',
            uxiElementId: element.getAttribute('data-uxi-element-id') || ''
        };

        // Get associated label by 'for' attribute
        if (element.id) {
            const root = element.getRootNode();
            const scope = (root && root.querySelector) ? root : document;
            const label = scope.querySelector(`label[for="${element.id}"]`);
            if (label) {
                info.label = label.textContent.trim();
            }
        }

        // Try parent label (input inside label)
        if (!info.label) {
            const parentLabel = element.closest('label');
            if (parentLabel) {
                info.label = parentLabel.textContent.replace(element.value || '', '').trim();
            }
        }

        // Try sibling label (label before input in same container) - COMMON PATTERN
        if (!info.label) {
            const parent = element.parentElement;
            if (parent) {
                // Look for label element that's a sibling
                const siblingLabel = parent.querySelector('label');
                if (siblingLabel && !siblingLabel.contains(element)) {
                    info.label = siblingLabel.textContent.trim();
                }
                
                // Also check previous sibling directly
                if (!info.label) {
                    let prev = element.previousElementSibling;
                    while (prev) {
                        if (prev.tagName === 'LABEL') {
                            info.label = prev.textContent.trim();
                            break;
                        }
                        prev = prev.previousElementSibling;
                    }
                }
            }
        }

        // Extract label from data-automation-id (Workday pattern)
        if (!info.label && info.automationId) {
            // Convert "legalNameSection_firstName" -> "First Name"
            const parts = info.automationId.split('_');
            const lastPart = parts[parts.length - 1];
            // Convert camelCase to words: firstName -> First Name
            info.label = lastPart
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, str => str.toUpperCase())
                .trim();
        }

        // Get nearby text as fallback
        if (!info.label) {
            const parent = element.parentElement;
            if (parent) {
                const textNodes = [];
                parent.childNodes.forEach(node => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        textNodes.push(node.textContent.trim());
                    } else if (node !== element && node.tagName !== 'INPUT' && node.tagName !== 'SELECT' && node.textContent) {
                        textNodes.push(node.textContent.trim());
                    }
                });
                const nearbyText = textNodes.filter(t => t).join(' ').substring(0, 100);
                if (nearbyText && !info.label) {
                    info.label = nearbyText;
                }
                info.nearbyText = nearbyText;
            }
        }

        // DEEP CONTEXT SCAN: Find Section Headers (Critical for "Experience 1" vs "Experience 2")
        // Walk up DOM to find <fieldset>, <legend>, or Headers H1-H6
        let current = element.parentElement;
        let depth = 0;
        let sectionContext = '';

        while (current && depth < 5) {
            const tagName = current.tagName;

            // Start building context
            let foundHeader = '';

            // Check for Legend
            if (tagName === 'FIELDSET') {
                const legend = current.querySelector('legend');
                if (legend) foundHeader = legend.textContent.trim();
            }

            // Check for explicit headers immediately preceding container
            if (!foundHeader && current.previousElementSibling && /^H[1-6]$/.test(current.previousElementSibling.tagName)) {
                foundHeader = current.previousElementSibling.textContent.trim();
            }

            // Check for headers INSIDE the container
            if (!foundHeader) {
                const header = current.querySelector('h1, h2, h3, h4, h5, h6');
                if (header && !current.contains(element.closest('.form-group'))) {
                    foundHeader = header.textContent.trim();
                }
            }

            if (foundHeader) {
                // Calculate Ordinal Index (Is this the 1st, 2nd, or 3rd "Experience" section?)
                // specific logic: count how many times this specific header text appears in previous siblings or cousins up to this point
                // Simple heuristic: Count how many elements with this same structure/header exist before this one in the document

                // For performance, we'll just check if this header text appears multiple times in the document
                // If so, we try to determine our index

                // We can't easily scan the whole document every time. 
                // Instead, let's look at the parent's children. If this is a list of similar items.

                let index = 1;
                let sibling = current.previousElementSibling;
                while (sibling) {
                    if (sibling.textContent.includes(foundHeader) ||
                        (sibling.previousElementSibling && sibling.previousElementSibling.textContent.includes(foundHeader))) {
                        index++;
                    }
                    sibling = sibling.previousElementSibling;
                }

                if (index > 1) {
                    foundHeader += ` ${index}`; // e.g. "Work Experience 2"
                }

                sectionContext = foundHeader + ' - ' + sectionContext;
            }

            // Workday specific: data-automation-id often has context (e.g. "workExperienceSection")
            const automationId = current.getAttribute('data-automation-id');
            if (automationId && automationId.includes('Section')) {
                // sectionContext += automationId + ' ';
            }

            depth++;
            current = current.parentElement;
        }

        if (sectionContext) {
            info.nearbyText = `[Section: ${sectionContext}] ` + (info.nearbyText || '');
        }

        // Get options for select elements
        if (element.tagName === 'SELECT') {
            info.options = Array.from(element.options).map(opt => opt.text.trim());
        }

        // For radio buttons and checkboxes, get the question/group label
        if (info.type === 'radio' || info.type === 'checkbox') {
            const fieldset = element.closest('fieldset');
            if (fieldset) {
                const legend = fieldset.querySelector('legend');
                if (legend) {
                    info.label = legend.textContent.trim();
                }
            }
            // Also get the label for this specific option
            info.optionLabel = '';
            const optLabel = document.querySelector(`label[for="${element.id}"]`);
            if (optLabel) {
                info.optionLabel = optLabel.textContent.trim();
            }
        }

        return info;
    }

    // Get all fillable fields
    function getFillableFields() {
        const selectors = [
            'input[type="text"]', 'input[type="email"]', 'input[type="tel"]', 'input[type="url"]',
            'input[type="number"]', 'input[type="date"]', 'input[type="month"]', 'input[type="file"]',
            'input:not([type])', 'textarea', 'select',
            'div[contenteditable="true"]', 'div[role="textbox"]',
            'input[type="radio"]', 'input[type="checkbox"]'
        ];

        const fields = [];

        // Helper to process input elements
        const processElement = (el) => {
            // Check visibility (offsetParent is null for hidden elements)
            // EXCEPTION: File inputs match ATS specific hidden inputs
            // EXCEPTION: Radio/Checkbox inputs hidden by custom UI
            const isFileInput = el.type === 'file';
            const isCheckable = el.type === 'radio' || el.type === 'checkbox';

            // Basic visibility check
            // Relaxed check: Only return if BOTH offsetParent is null AND client rects are empty
            // This fixes issues with position:fixed elements or specific container contexts
            const isHidden = el.offsetParent === null && el.getClientRects().length === 0;
            if (isHidden && !isFileInput && !isCheckable) return;

            if (el.disabled || el.readOnly) return;

            // Skip filled fields unless special types
            if (el.tagName !== 'SELECT' && !isFileInput && !isCheckable && el.type !== 'hidden') {
                const val = el.value || '';
                if (val.trim().length > 50) return; // Skip filled long fields
                if (el.isContentEditable) {
                    const text = el.innerText || '';
                    if (text.trim().length > 50) return;
                }
            }

            // Skip tiny inputs
            if (el.offsetWidth < 5 || el.offsetHeight < 5 && !isFileInput && !isCheckable) return;

            fields.push(extractFieldInfo(el));
        };

        // Helper to process buttons
        const processButton = (btn) => {
            const text = btn.innerText?.toLowerCase().trim() || '';
            const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase().trim() || '';

            const isAddButton =
                text === 'add' ||
                text.includes('add work experience') ||
                text.includes('add education') ||
                text.includes('add another') ||
                ariaLabel.includes('add work experience') ||
                ariaLabel.includes('add education') ||
                (text === '+' && (ariaLabel.includes('add') || btn.title?.includes('add')));

            if (isAddButton && btn.offsetParent !== null && !btn.disabled) {
                fields.push({
                    element: btn,
                    type: 'button',
                    action: 'click',
                    label: text || ariaLabel || 'Add Button',
                    nearbyText: text
                });
            }
        };

        // Recursive Scanner
        const scan = (root) => {
            // 1. Scan Inputs
            const els = root.querySelectorAll(selectors.join(', '));
            els.forEach(processElement);

            // 2. Scan Buttons
            const btns = root.querySelectorAll('button, a[role="button"], div[role="button"], span[role="button"]');
            btns.forEach(processButton);

            // 3. Scan Shadow DOM
            // Querying '*' is expensive but necessary for deep traversal.
            const all = root.querySelectorAll('*');
            all.forEach(el => {
                if (el.shadowRoot) {
                    scan(el.shadowRoot);
                }
            });
        };

        scan(document);
        console.log(`[JobFiller] Scan complete. Found ${fields.length} fillable fields.`);
        if (fields.length === 0) console.warn('[JobFiller] No fields found. Check visibility logic.');
        return fields;
    }

    // Get radio button groups
    function getRadioGroups() {
        const radios = document.querySelectorAll('input[type="radio"]');
        const groups = {};

        radios.forEach(radio => {
            if (radio.offsetParent === null || radio.disabled) return;
            const name = radio.name;
            if (!groups[name]) {
                groups[name] = [];
            }
            groups[name].push(extractFieldInfo(radio));
        });

        return groups;
    }

    // Set field value with proper event dispatch
    function setFieldValue(element, value) {
        if (!value || value === 'SKIP') return false;

        const tagName = element.tagName.toLowerCase();
        const type = element.type?.toLowerCase();

        // Handle different input types
        if (tagName === 'select') {
            // Find matching option with improved fuzzy logic
            const options = Array.from(element.options);
            const valLower = value.toLowerCase().trim();

            // Map common abbreviations
            const degreeMap = {
                'bs': 'bachelor', 'b.s.': 'bachelor', 'b.s': 'bachelor', 'btech': 'bachelor',
                'ms': 'master', 'm.s.': 'master', 'm.s': 'master', 'mtech': 'master',
                'phd': 'doctor', 'ph.d': 'doctor', 'doctorate': 'doctor'
            };

            const normalize = (str) => str.toLowerCase().replace(/[^a-z]/g, '');
            const target = degreeMap[valLower] || valLower;

            const match = options.find(opt => {
                const optText = opt.text.toLowerCase();
                const optVal = opt.value.toLowerCase();

                // Exact value match
                if (optVal === valLower) return true;

                // Text includes value or value includes text
                if (optText.includes(valLower) || valLower.includes(optText)) return true;

                // Degree mapping check - broad simple match
                if (target !== valLower && (optText.includes(target) || optVal.includes(target))) return true;

                // Keyword fallback for common fields
                if (valLower.includes('bachelor') && (optText.includes('bachelor') || optVal.includes('bachelor'))) return true;
                if (valLower.includes('master') && (optText.includes('master') || optVal.includes('master'))) return true;
                if (valLower.includes('doctor') && (optText.includes('doctor') || optVal.includes('doctor'))) return true;
                if (valLower.includes('phd') && (optText.includes('phd') || optVal.includes('phd'))) return true;

                return false;
            });

            if (match) {
                // React-safe value setter Hack
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set;
                nativeSetter.call(element, match.value);

                element.dispatchEvent(new Event('change', { bubbles: true }));
                element.dispatchEvent(new Event('input', { bubbles: true }));
                return true;
            }
        } else if (type === 'file') {
            // Handle File Upload (Resume)
            if (value && typeof value === 'object' && value.data && value.mimeType) {
                try {
                    // Convert Base64 to Blob/File
                    const byteCharacters = atob(value.data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: value.mimeType });
                    const file = new File([blob], "resume.pdf", { type: value.mimeType });

                    // Use DataTransfer to set files
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    element.files = dataTransfer.files;

                    // Trigger events
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    return true;
                } catch (e) {
                    console.error('File upload error:', e);
                    return false;
                }
            }
            return false;
        } else if (type === 'radio' || type === 'checkbox') {
            // These are handled separately
            return false;
        } else if (element.isContentEditable) {
            // Handle Rich Text (Workday/ATS)
            element.focus();

            // Try execCommand first (better for preserving editor state)
            const success = document.execCommand('insertText', false, value);

            if (!success) {
                // Fallback to innerText/innerHTML
                element.innerText = value;
            }

            // Dispatch events
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true })); // Some editors listen to change
            element.dispatchEvent(new Event('blur', { bubbles: true }));
            return true;
        } else if (tagName === 'button' || element.getAttribute('role') === 'button') {
            // Handle "Add" buttons
            if (value === 'CLICK') {
                // Scroll into view first
                element.scrollIntoView({ block: 'center', behavior: 'smooth' });
                setTimeout(() => element.click(), 300);
                return true;
            }
            return false;
        } else {
            // Text inputs and textareas
            element.focus();
            element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.blur();
            return true;
        }

        return false;
    }

    // Handle radio button selection
    function handleRadioGroup(groupName, fields, answer) {
        if (!answer || answer === 'SKIP') return false;

        const answerLower = answer.toLowerCase();

        for (const field of fields) {
            const optionLabel = (field.optionLabel || field.element.value || '').toLowerCase();

            if (optionLabel.includes(answerLower) || answerLower.includes(optionLabel)) {
                field.element.checked = true;
                field.element.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
            }
        }

        // Try matching common patterns
        const yesPatterns = ['yes', 'true', 'agree', 'accept', 'confirm'];
        const noPatterns = ['no', 'false', 'disagree', 'decline'];

        if (yesPatterns.some(p => answerLower.includes(p))) {
            for (const field of fields) {
                const optionLabel = (field.optionLabel || field.element.value || '').toLowerCase();
                if (yesPatterns.some(p => optionLabel.includes(p))) {
                    field.element.checked = true;
                    field.element.dispatchEvent(new Event('change', { bubbles: true }));
                    return true;
                }
            }
        }

        if (noPatterns.some(p => answerLower.includes(p))) {
            for (const field of fields) {
                const optionLabel = (field.optionLabel || field.element.value || '').toLowerCase();
                if (noPatterns.some(p => optionLabel.includes(p))) {
                    field.element.checked = true;
                    field.element.dispatchEvent(new Event('change', { bubbles: true }));
                    return true;
                }
            }
        }

        return false;
    }

    // Handle Learn Mode
    async function handleLearnMode() {
        showToast('🧠 Learning from your inputs...', 'info');

        const fields = getFillableFields();
        const learnedItems = [];

        fields.forEach(field => {
            let val = field.element.value;
            // Handle contenteditable (Workday Rich Text)
            if (field.element.isContentEditable) {
                val = field.element.innerText;
            } else if (field.type === 'radio' || field.type === 'checkbox') {
                // ONLY learn from CHECKED inputs
                if (!field.element.checked) return;

                // For Q&A, the label is usually the meaningful answer (e.g. "Male" vs value="12345")
                if (field.label) {
                    val = field.label;
                } else if (val === 'on' || val === 'true') {
                    // Fallback for unlabeled checkboxes
                    val = 'Yes';
                }
            }

            // Ignore empty values
            if (!val) return;

            // For text inputs, require min length to avoid junk. For radio/checkbox (e.g. "No", "M"), allow short.
            const isText = field.type !== 'radio' && field.type !== 'checkbox' && field.type !== 'select-one';
            if (isText && val.trim().length < 2) return;

            // Ignore sensitive fields
            if (field.type === 'password' || field.type === 'hidden') return;
            // Ignore fields without labels (questions)
            if (!field.label || field.label.length < 2) return;

            learnedItems.push({
                question: field.label,
                answer: val,
                context: field.nearbyText
            });
        });

        if (learnedItems.length === 0) {
            showToast('No filled fields found to learn from.', 'warning');
            return;
        }

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'learnFromFields',
                fields: learnedItems
            });

            if (response.success) {
                const count = response.count || 0;
                if (count > 0) {
                    showToast(`✓ Learned from ${count} fields! Learning Complete.`, 'success');
                } else {
                    showToast('Already knew everything here!', 'success');
                }
            } else {
                showToast('Failed to save learned items.', 'error');
            }
        } catch (error) {
            console.error('Learn mode error:', error);
            showToast('Error sending data to extension.', 'error');
        }
    }

    // Handle Cover Letter Generation
    async function handleCoverLetter() {
        showToast('📝 Reading job description...', 'info');

        // Extract page text - basic implementation
        // In a real scenario, we might want to target the main content
        const pageText = document.body.innerText.substring(0, 15000); // Limit to ~15k chars for API

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'generateCoverLetter',
                jobDescription: pageText
            });

            if (response.success && response.text) {
                showResultModal('Generated Cover Letter', response.text);
            } else {
                showToast(response.error || 'Failed to generate cover letter', 'error');
            }
        } catch (error) {
            console.error('Cover letter error:', error);
            showToast('Error generating cover letter', 'error');
        }
    }

    // Show result modal
    function showResultModal(title, text) {
        // Remove existing modal if any
        const existing = document.getElementById('jobfiller-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'jobfiller-modal';
        modal.innerHTML = `
        <div class="jobfiller-modal-content">
            <div class="jobfiller-modal-header">
                <h3>${title}</h3>
                <button class="jobfiller-modal-close">×</button>
            </div>
            <textarea class="jobfiller-modal-text" readonly>${text}</textarea>
            <div class="jobfiller-modal-footer">
                <button class="jobfiller-btn-secondary jobfiller-modal-close-btn">Close</button>
                <button class="jobfiller-btn-primary" id="jobfiller-copy-btn">📋 Copy to Clipboard</button>
            </div>
        </div>
        `;

        // Styles are handled in content.css ideally, but for safety injecting some inline if needing to rely on existing styling
        // We will assume content.css covers the basics or we add them next

        document.body.appendChild(modal);

        // Event listeners
        const closeBtns = modal.querySelectorAll('.jobfiller-modal-close, .jobfiller-modal-close-btn');
        closeBtns.forEach(btn => btn.addEventListener('click', () => modal.remove()));

        const copyBtn = modal.querySelector('#jobfiller-copy-btn');
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(text).then(() => {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = '✓ Copied!';
                setTimeout(() => copyBtn.textContent = originalText, 2000);
            });
        });
    }

    // ============================================
    // RESUME MATCHER LOGIC
    // ============================================

    // Extract Job Description Text
    function extractJobDescription() {
        // Heuristic 1: Look for standard headers
        const headers = Array.from(document.querySelectorAll('h1, h2, h3, h4, strong'));
        const jdKeywords = ['about the job', 'job description', 'role description', 'responsibilities', 'qualifications', 'requirements', 'what you will do'];

        for (const header of headers) {
            const text = header.innerText.toLowerCase();
            if (jdKeywords.some(kw => text.includes(kw))) {
                // Try parent container first
                const parser = header.closest('div, section, article');
                if (parser && parser.innerText.length > 200) {
                    console.log('JD found via header:', header.innerText);
                    return parser.innerText;
                }
                // Try siblings
                let sibling = header.nextElementSibling;
                while (sibling) {
                    if (sibling.innerText && sibling.innerText.length > 200) {
                        return sibling.innerText;
                    }
                    sibling = sibling.nextElementSibling;
                }
            }
        }

        // Heuristic 2: Find largest text block (Fallback)
        let bestBlock = null;
        let maxScore = 0;
        const blocks = document.querySelectorAll('div, section, article, main');

        blocks.forEach(block => {
            // Skip hidden or tiny blocks
            if (block.offsetHeight < 100 || block.offsetWidth < 100) return;

            const text = block.innerText;
            if (text.length < 500) return;

            // Simple text density score
            const linkCount = block.querySelectorAll('a').length;
            const score = text.length - (linkCount * 50); // Penalize link-heavy areas (navs/footers)

            if (score > maxScore) {
                maxScore = score;
                bestBlock = block;
            }
        });

        if (bestBlock) {
            console.log('JD found via density score:', maxScore);
            return bestBlock.innerText;
        }

        // HEURISTIC 3: Fallback for YCombinator / Generic Sites
        // If we found nothing good, just grab the main body text but limited length
        // This ensures the match widget ALWAYS appears on job sites
        if (location.href.includes('ycombinator') || location.href.includes('workatastartup') || document.body.innerText.length > 500) {
            return document.body.innerText.substring(0, 10000);
        }

        return null;
    }

    // Inject Floating Match Widget (DEPRECATED - Merged into AutoFill Button)
    // Removed to consolidate UI


    // Auto Apply State Machine
    let isAutoApplying = false;
    async function startAutoApply() {
        if (isAutoApplying) return;
        isAutoApplying = true;
        showToast('🚀 Auto Apply Started...', 'info');

        let attempts = 0;
        const maxPages = 10;

        while (attempts < maxPages) {
            // 1. Fill Form
            await handleAutofill();

            // Wait for fill to settle
            await new Promise(r => setTimeout(r, 2000));

            // 2. Find Next/Submit Button
            // Expanded selector to catch <a> tags that look like buttons (common in Modern JS apps)
            const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a, div[role="button"]'));

            const nextBtn = buttons.find(b => {
                // Must be visible
                if (!b.offsetParent) return false;
                if (b.disabled) return false;

                // Get clean text (handling nested spans)
                const text = (b.innerText || b.value || b.getAttribute('aria-label') || '').trim().toLowerCase();

                if (text.length > 30) return false; // Avoid long paragraphs

                // Critical Keywords
                const isApply = text === 'apply' || text === 'easy apply' || text === 'quick apply' || text === 'apply now';
                const isNext = text === 'next' || text === 'continue' || text === 'review' || text === 'submit' || text === 'submit application';

                // For links, be stricter: must be exact match or contain strong signal
                if (b.tagName === 'A') {
                    return isApply || (isNext && text.length < 15) || (text.includes('apply') && text.length < 25);
                }

                return isApply || isNext || text.includes('next') || text.includes('continue') || text.includes('submit') || text.includes('apply');
            });

            if (nextBtn) {
                console.log('Auto Apply: Clicking', nextBtn.innerText);
                showToast(`➡️ Clicking ${nextBtn.innerText}...`, 'info');
                nextBtn.click();

                // Wait for navigation
                await new Promise(r => setTimeout(r, 4000));
                attempts++;
            } else {
                showToast('🛑 No "Next" button found. Stopping.', 'warning');
                break;
            }
        }

        isAutoApplying = false;
        showToast('✅ Auto Apply Finished', 'success');
    }

    // Run Analysis
    let cachedAnalysis = null;
    async function runAnalysis(silent = false) {
        const scoreText = document.getElementById('jf-score-text');
        const content = document.getElementById('jf-content');

        if (!silent) scoreText.innerText = 'Thinking...';

        const jdText = extractJobDescription();
        if (!jdText) {
            if (!silent) scoreText.innerText = 'No JD';
            return;
        }

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'analyzeJobMatch',
                jobDescription: jdText
            });

            if (response.success && response.data) {
                cachedAnalysis = response.data;
                if (!silent) {
                    renderMatchResults(response.data);
                } else {
                    // Update UI silently if widget exists
                    if (scoreText) {
                        scoreText.innerText = `${response.data.score}% Match`;
                        // Color update
                        if (response.data.score >= 80) scoreText.style.color = '#2e7d32';
                        else if (response.data.score >= 50) scoreText.style.color = '#f9a825';
                        else scoreText.style.color = '#d32f2f';
                    }
                }
            } else {
                if (!silent) scoreText.innerText = 'Error';
            }
        } catch (e) {
            console.error(e);
            if (!silent) scoreText.innerText = 'Error';
        }
    }

    function renderMatchResults(data) {
        const scoreText = document.getElementById('jf-score-text');
        const content = document.getElementById('jf-content');
        const score = data.score || 0;

        // Color code
        let color = '#d32f2f'; // Red
        if (score >= 80) color = '#2e7d32'; // Green
        else if (score >= 50) color = '#f9a825'; // Yellow

        scoreText.style.color = color;
        scoreText.innerText = `${score}% Match`;

        let html = `<p><strong>Summary:</strong> ${data.summary}</p>`;

        if (data.missingSkills && data.missingSkills.length > 0) {
            html += `<h4>⚠️ Missing Keywords:</h4><div>`;
            data.missingSkills.forEach(skill => {
                html += `<span class="jf-tag jf-missing">${skill}</span>`;
            });
            html += `</div>`;
        }

        if (data.matchingSkills && data.matchingSkills.length > 0) {
            html += `<h4>✅ Matched:</h4><div>`;
            data.matchingSkills.forEach(skill => {
                html += `<span class="jf-tag jf-good">${skill}</span>`;
            });
            html += `</div>`;
        }

        content.innerHTML = html;
        document.querySelector('#jf-match-details').style.display = 'block';
    }

    // Setup Mutation Observer for dynamic fields
    function setupObserver() {
        if (observer) return; // Already running

        observer = new MutationObserver((mutations) => {
            let shouldRefill = false;

            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Check if added nodes contain inputs
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.matches('input, select, textarea') || node.querySelector('input, select, textarea')) {
                                shouldRefill = true;
                                break;
                            }
                        }
                    }
                }
                if (shouldRefill) break;
            }

            if (shouldRefill) {
                // If user stopped manually, DO NOT RESTART
                if (hasManuallyStopped || isAutofillCancelled) return;

                // Debounce the refill
                if (observerTimeout) clearTimeout(observerTimeout);
                observerTimeout = setTimeout(() => {
                    console.log('Dynamic fields detected, triggering autofill...');
                    showToast('⚡ detected new fields...', 'info');
                    handleAutofill(0); // Restart autofill scan
                }, 1000); // 1 second buffer for UI animation
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('Autofill Observer started');
    }

    // Auto Apply State Machine (Persistent)
    async function startAutoApply(isResumed = false) {
        if (autoApplyActive && !isResumed) return; // Already running

        autoApplyActive = true;
        // Persist State
        await chrome.storage.local.set({ 'jobFillerAutoApply': { active: true, timestamp: Date.now() } });

        // Update UI
        if (autofillButton) {
            const btn = autofillButton.querySelector('#jobfiller-auto-apply-btn');
            if (btn) {
                btn.innerHTML = '<span class="jobfiller-icon-small">⏹</span> Stop Auto Apply';
                btn.style.color = '#d32f2f';
                btn.style.background = '#ffebee';
            }
        }

        showToast(isResumed ? '♻️ Resuming Auto Apply...' : '🚀 Auto Apply Started...', 'info');

        let attempts = 0;
        const maxPages = 5; // Reduced for safety
        let tabsOpened = 0; // CRITICAL: Prevent tab explosion
        const maxTabsPerSession = 1; // Only open ONE external tab per session

        while (autoApplyActive && attempts < maxPages) {
            // 0. Refresh Context (ensure logic has latest data)
            const jd = extractJobDescription();
            if (jd && !document.getElementById('jf-match-details')) {
                try { chrome.runtime.sendMessage({ action: 'analyzeJobMatch', jobDescription: jd }); } catch (e) { }
            }

            // 1. Fill Form
            await handleAutofill();

            // Wait for fill to settle
            await new Promise(r => setTimeout(r, 2000));
            if (!autoApplyActive) break; // Check stop

            // 2. Find Next/Submit Button - ENHANCED DETECTION
            const buttons = Array.from(document.querySelectorAll(
                'button, input[type="submit"], input[type="button"], a[href], div[role="button"], ' +
                'span[role="button"], .artdeco-button, [data-control-name*="apply"], [data-control-name*="submit"]'
            ));

            console.log('Auto Apply: Found', buttons.length, 'potential buttons');

            const nextBtn = buttons.find(b => {
                // Skip hidden/disabled elements - but be more lenient for modals
                const rect = b.getBoundingClientRect();
                const style = window.getComputedStyle(b);

                // Must have some size
                if (rect.width === 0 || rect.height === 0) return false;

                // Skip if explicitly disabled
                if (b.disabled || b.getAttribute('aria-disabled') === 'true') return false;

                // Skip if not visible (but allow fixed/absolute positioned elements in modals)
                if (style.display === 'none' || style.visibility === 'hidden') return false;

                // Check if it's actually in the viewport (modal buttons should be)
                const inViewport = rect.top >= 0 && rect.left >= 0 &&
                    rect.bottom <= window.innerHeight &&
                    rect.right <= window.innerWidth;

                // Get text from multiple sources (LinkedIn uses nested spans)
                const innerSpan = b.querySelector('.artdeco-button__text, span');
                const text = (innerSpan?.innerText || b.innerText || b.value || '').replace(/\s+/g, ' ').trim().toLowerCase();
                const ariaLabel = (b.getAttribute('aria-label') || '').toLowerCase();
                const className = (b.className || '').toLowerCase();
                const dataControl = (b.getAttribute('data-control-name') || '').toLowerCase();

                // Skip our own extension buttons
                if (className.includes('jobfiller')) return false;

                // Skip close/dismiss buttons
                if (className.includes('close') || text === '×' || text === 'x' || text === 'close') return false;

                // Specific LinkedIn & ATS Classes - HIGH PRIORITY
                if (className.includes('jobs-apply-button') ||
                    className.includes('easy-apply-button') ||
                    dataControl.includes('apply') ||
                    dataControl.includes('submit')) {
                    console.log('Auto Apply: Matched by class/data-control:', text);
                    return true;
                }

                if (text.length > 50) return false;

                // Critical Keywords - Apply
                const isApply =
                    text === 'apply' || text === 'easy apply' || text === 'quick apply' ||
                    text === 'apply now' || text === 'apply for job' || text === 'view job' ||
                    ariaLabel.includes('easy apply') || ariaLabel.includes('apply now') ||
                    ariaLabel.includes('apply for');

                // Critical Keywords - Navigation (EXPANDED for modals)
                const isNext =
                    text === 'next' || text === 'continue' || text === 'review' ||
                    text === 'submit' || text === 'submit application' ||
                    text === 'send' || text === 'send application' || text === 'done' ||
                    text.includes('submit') || // Catch "Submit application" etc.
                    ariaLabel.includes('next') || ariaLabel.includes('submit');

                // For <a> tags - be more careful
                if (b.tagName === 'A') {
                    return isApply || (isNext && text.length < 25);
                }

                // Match if it's an apply or next button
                const matched = isApply || isNext ||
                    text.includes('next') || text.includes('continue') ||
                    text.includes('submit') || text.includes('apply');

                if (matched) {
                    console.log('Auto Apply: Matched by text:', text, 'inViewport:', inViewport);
                }

                return matched;
            });

            if (nextBtn) {
                const btnText = (nextBtn.innerText || nextBtn.getAttribute('aria-label') || 'Button').trim();
                console.log('Auto Apply: Found button:', btnText);
                showToast(`➡️ Clicking "${btnText.substring(0, 20)}"...`, 'info');

                // INTELLIGENT NAVIGATION HANDLING
                const isExternalLink = nextBtn.tagName === 'A' && nextBtn.href &&
                    !nextBtn.href.includes('javascript:') &&
                    !nextBtn.href.includes('#') &&
                    !nextBtn.href.startsWith(window.location.origin) &&
                    !nextBtn.getAttribute('onclick');

                if (isExternalLink) {
                    // SAFETY: Only open ONE tab per session
                    if (tabsOpened >= maxTabsPerSession) {
                        console.log('Auto Apply: Tab limit reached, stopping');
                        showToast('⚠️ Tab limit reached', 'info');
                        stopAutoApply();
                        return;
                    }

                    tabsOpened++;
                    console.log('Auto Apply: Opening tab (' + tabsOpened + '/' + maxTabsPerSession + '):', nextBtn.href);
                    showToast('🔗 Opening job in new tab...', 'success');
                    chrome.runtime.sendMessage({ action: 'openTab', url: nextBtn.href });

                    // IMMEDIATELY STOP - prevents tab explosion
                    autoApplyActive = false;
                    await stopAutoApply();
                    return; // EXIT FUNCTION NOW
                }

                // USE NATIVE MOUSE EVENT (more reliable than .click())
                const clickEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                nextBtn.dispatchEvent(clickEvent);

                attempts++;
                // Wait for navigation/modal with longer timeout
                await new Promise(r => setTimeout(r, 3500));

                // Also wait for any animations to complete
                await new Promise(r => setTimeout(r, 500));
            } else {
                console.log('No next button found. DOM state:', document.body.innerHTML.substring(0, 500));
                showToast('🏁 Endpoint reached (No Next Button)', 'success');
                stopAutoApply();
                break;
            }
        }
    }

    // Stop Auto Apply
    async function stopAutoApply(clearGlobal = true) {
        autoApplyActive = false;
        if (clearGlobal) {
            await chrome.storage.local.remove('jobFillerAutoApply');
            showToast('⏹ Auto Apply Stopped', 'info');
        } else {
            showToast('⏳ Continuing in new tab...', 'info');
        }

        // Reset UI
        if (autofillButton) {
            const btn = autofillButton.querySelector('#jobfiller-auto-apply-btn');
            if (btn) {
                btn.innerHTML = '<span class="jobfiller-icon-small">⚡</span> Auto Apply';
                btn.style.color = '';
                btn.style.background = '';
            }
        }
    }
    // Main autofill handler
    async function handleAutofill(retryCount = 0) {
        if (isFilling) return; // Prevent double click
        isFilling = true;
        isAutofillCancelled = false;

        if (retryCount === 0) showToast('🔍 Analyzing form...', 'info');
        if (retryCount > 2) { isFilling = false; return; }

        const fields = getFillableFields();
        const radioGroups = getRadioGroups();

        let filledCount = 0;
        let totalFields = fields.length + Object.keys(radioGroups).length;
        let actionTriggered = false; // Track if we clicked any "Add" buttons
        let lastError = null; // Track backend errors

        // Update button to show Stop
        if (autofillButton) {
            const txt = autofillButton.querySelector('.jobfiller-text');
            const icon = autofillButton.querySelector('.jobfiller-icon');
            if (txt) {
                txt.innerText = 'Stop';
                txt.style.color = 'white';
            }
            if (icon) icon.innerText = '⏹';
            autofillButton.querySelector('.jobfiller-btn-content').style.background = '#d32f2f'; // Red
        }
        if (autofillButton) {
            autofillButton.classList.add('jobfiller-loading');
        }

        // Start observer if not already running
        setupObserver();

        // Start observer if not already running
        setupObserver();

        try {
            // Process regular fields
            const jobDescription = extractJobDescription(); // Get current page context

            for (const field of fields) {
                if (isAutofillCancelled) { break; }
                let response = null;
                
                // Debug: Log field info being sent
                console.log('[AutoFill] Processing field:', {
                    type: field.type,
                    id: field.id,
                    name: field.name,
                    label: field.label,
                    placeholder: field.placeholder
                });
                
                try {
                    response = await chrome.runtime.sendMessage({
                        action: 'getFieldValue',
                        fieldInfo: {
                            type: field.type,
                            id: field.id,
                            name: field.name,
                            label: field.label,
                            placeholder: field.placeholder,
                            ariaLabel: field.ariaLabel,
                            nearbyText: field.nearbyText,
                            options: field.options,
                            action: field.action
                        },
                        jobDescription: jobDescription // Pass JD context
                    });
                    
                    // Debug: Log response
                    console.log('[AutoFill] Response for field:', field.label || field.name, response);

                    if (response && response.success && response.value) {
                        const filled = setFieldValue(field.element, response.value);
                        if (filled) {
                            filledCount++;
                            // Check if this was a button click
                            if (field.type === 'button' || field.action === 'click') {
                                actionTriggered = true;
                                // Wait for UI update
                                await new Promise(r => setTimeout(r, 800));
                            } else {
                                // Visual feedback for standard fields
                                field.element.style.outline = '2px solid #22c55e';
                                setTimeout(() => {
                                    field.element.style.outline = '';
                                }, 1500);
                            }
                        } else {
                            // Success response, but setFieldValue returned false (likely 'SKIP')
                            if (response.value === 'SKIP') {
                                console.warn(`[AutoFill] Field "${field.label || field.name}" was SKIPPED by AI - no matching data found`);
                            }
                        }
                    } else if (response && response.error) {
                        lastError = response.error;
                        console.error(`[AutoFill] Error for field "${field.label || field.name}":`, response.error);
                    }
                } catch (err) {
                    console.error('Error filling field:', err);
                    lastError = err.message;
                }

                // Dynamic delay to avoid rate limiting
                // If it was a direct/qna/cache match, go fast. If AI call, wait 500ms.
                const method = response?.method || '';
                const isFastMatch = ['direct', 'qna', 'cache', 'file_upload'].includes(method);
                const delay = isFastMatch ? 30 : 500;
                await new Promise(r => setTimeout(r, delay));
            }

    // Process radio button groups
    for (const [groupName, groupFields] of Object.entries(radioGroups)) {
        if (isAutofillCancelled) { break; }
        try {
            // Use the first field's info as representative
            const firstField = groupFields[0];
            const response = await chrome.runtime.sendMessage({
                action: 'getFieldValue',
                fieldInfo: {
                    type: 'radio',
                    name: groupName,
                    label: firstField.label,
                    nearbyText: firstField.nearbyText,
                    options: groupFields.map(f => f.optionLabel || f.element.value)
                }
            });

            if (response.success && response.value) {
                const handled = handleRadioGroup(groupName, groupFields, response.value);
                if (handled) filledCount++;
            }
        } catch (err) {
            console.error('Error handling radio group:', err);
        }
    }

    // Show result or recurse
    if (actionTriggered) {
        showToast('🔄 Found new fields, continuing...', 'info');
        // Allow DOM to settle then recurse
        setTimeout(() => handleAutofill(retryCount + 1), 1500);
    } else {
        if (isAutofillCancelled) {
            showToast('🛑 Autofill Stopped by User', 'info');
        } else if (filledCount > 0) {
            showToast(`✅ Filled ${filledCount} fields!`, 'success');
        } else if (retryCount === 0) {
            // Diagnostic: Distinguish detection vs filling failure
            if (fields.length === 0) {
                showToast('⚠️ No fillable fields detected on this page.', 'warning');
                console.warn('[JobFiller] getFillableFields returned 0 items.');
            } else {
                let msg = '';
                if (lastError) {
                    if (lastError.includes('Profile is empty') || lastError.includes('profile data')) {
                        msg = 'Please fill your profile in the extension popup first!';
                    } else if (lastError.includes('Ollama') || lastError.includes('fetch')) {
                        msg = 'AI service not available. Start Ollama or add Gemini API key.';
                    } else {
                        msg = lastError;
                    }
                } else {
                    msg = 'No profile data matched. Open popup and fill your profile.';
                }
                showToast(`❌ Could not fill form. ${msg}`, 'error');
                console.error(`[JobFiller] Detected ${fields.length} fields but filledCount is 0. Last Error: ${lastError}`);
            }
        }

        // Reset State
        isFilling = false;

        // Reset Button
        if (autofillButton) {
            const txt = autofillButton.querySelector('.jobfiller-text');
            const icon = autofillButton.querySelector('.jobfiller-icon');
            if (txt) {
                txt.innerText = 'AutoFill';
                txt.style.color = '';
            }
            if (icon) icon.innerText = '🚀';
            autofillButton.querySelector('.jobfiller-btn-content').style.background = ''; // Default
            autofillButton.classList.remove('jobfiller-loading');
        }
    }
        } catch (error) {
            console.error('Autofill error:', error);
            showToast(`Error: ${error.message || 'Unknown error during autofill'}`, 'error');
        } finally {
            isFilling = false;
            if (autofillButton && !actionTriggered) {
                autofillButton.classList.remove('jobfiller-loading');
            }
        }
    }

    // Initialize
    async function init() {
        // Wait for page to be fully loaded
        if (document.readyState !== 'complete') {
            await new Promise(resolve => window.addEventListener('load', resolve));
        }

        // Check settings
        try {
            const result = await chrome.storage.local.get('settings');
            const settings = result.settings || {};

            if (settings.autoShowButton === false) {
                return;
            }
        } catch (e) {
            // Extension context might be invalid, ignore
            return;
        }

        // Check if page has forms
        if (hasFormsOnPage()) {
            createAutofillButton();
        }

        // AUTO-RESUME CHECK
        try {
            const persistence = await chrome.storage.local.get('jobFillerAutoApply');
            if (persistence.jobFillerAutoApply && persistence.jobFillerAutoApply.active) {
                // Check timestamp to avoid stale resume (e.g. > 1 hour old)
                const age = Date.now() - (persistence.jobFillerAutoApply.timestamp || 0);
                if (age < 3600000) { // 1 hour
                    console.log('Resuming Auto Apply...');
                    startAutoApply(true); // Resume
                } else {
                    // Cleanup stale state
                    chrome.storage.local.remove('jobFillerAutoApply');
                }
            }
        } catch (e) { console.error(e); }

        // Try to inject Match Widget (Merged into Main Button if JD exists)
        if (extractJobDescription() && hasFormsOnPage()) {
            createAutofillButton(); // Ensure button exists even if forms not strong signal
        }

        // Watch for dynamic content
        const observer = new MutationObserver(() => {
            if (!isButtonVisible && hasFormsOnPage()) {
                createAutofillButton();
            }
        });


        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'autofill') {
            // Show progress toast and trigger autofill
            showToast('🤖 AutoFill starting...', 'info');
            handleAutofill().then(() => {
                // handleAutofill shows its own completion toast
            }).catch(err => {
                showToast('❌ AutoFill failed: ' + err.message, 'error');
            });
            sendResponse({ success: true });
        } else if (request.action === 'learn') {
            // Trigger learn
            showToast('💾 Learning from form...', 'info');
            handleLearnMode();
            sendResponse({ success: true });
        } else if (request.action === 'generateCoverLetter') {
            // Trigger cover letter generation
            showToast('📝 Generating cover letter...', 'info');
            handleCoverLetter();
            sendResponse({ success: true });
        }
    });

    // Start
    init();
})();

// Auto Input Helper - Content Script v2.1
// Scroll wheel inline suggestions with keyboard navigation and draggable feedback

(function () {
    'use strict';

    let suggestionsList = [];
    let currentSuggestionIndex = 0;
    let usedSuggestions = new Set();

    // Current input state
    let activeInput = null;
    let availableSuggestions = []; // up to 8 suggestions to show
    let selectedIndex = 0; // which suggestion is selected
    let filteredSuggestions = []; // filtered by search
    let inlineSuggestionBox = null;
    let floatingFeedbackButton = null;

    // Load suggestions from t.txt and custom additions
    async function loadSuggestions() {
        try {
            const data = await chrome.storage.local.get(['usedSuggestions', 'currentIndex', 'customSuggestions', 'useTxtFile']);

            const customSuggestions = data.customSuggestions || [];
            const useTxtFile = data.useTxtFile !== false;

            if (useTxtFile) {
                const response = await fetch(chrome.runtime.getURL('t.txt'));
                const text = await response.text();
                const txtSuggestions = text.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0);

                suggestionsList = [...new Set([...txtSuggestions, ...customSuggestions])];
            } else {
                suggestionsList = customSuggestions;
            }

            if (data.usedSuggestions) {
                usedSuggestions = new Set(data.usedSuggestions);
            }
            if (data.currentIndex !== undefined) {
                currentSuggestionIndex = data.currentIndex;
            }

            console.log('📝 Auto Input Helper loaded', suggestionsList.length, 'suggestions');
        } catch (error) {
            console.error('Failed to load suggestions:', error);
        }
    }

    // Get next N available suggestions (default 8)
    function getNextSuggestions(count = 8) {
        if (suggestionsList.length === 0) return [];

        console.log('🔍 Getting suggestions. Current index:', currentSuggestionIndex, 'Used:', usedSuggestions.size);

        const suggestions = [];
        let attempts = 0;
        let index = currentSuggestionIndex;

        while (suggestions.length < count && attempts < suggestionsList.length) {
            const suggestion = suggestionsList[index];

            if (!usedSuggestions.has(suggestion)) {
                suggestions.push(suggestion);
            }

            index = (index + 1) % suggestionsList.length;
            attempts++;
        }

        // If we couldn't find enough unused, reset and get from start
        if (suggestions.length < 2) {
            console.log('♻️ All suggestions used, resetting...');
            usedSuggestions.clear();
            chrome.storage.local.set({ usedSuggestions: [] });
            return suggestionsList.slice(0, Math.min(count, suggestionsList.length));
        }

        console.log('💡 Showing', suggestions.length, 'suggestions');
        return suggestions;
    }

    // Mark suggestion as used
    async function markSuggestionUsed(suggestion) {
        usedSuggestions.add(suggestion);
        currentSuggestionIndex = (currentSuggestionIndex + 1) % suggestionsList.length;

        await chrome.storage.local.set({
            usedSuggestions: Array.from(usedSuggestions),
            currentIndex: currentSuggestionIndex
        });
    }

    // Render the suggestion options inside the scroll container
    function renderSuggestionOptions(suggestions) {
        if (!inlineSuggestionBox) return;
        const scrollContainer = inlineSuggestionBox.querySelector('.inline-scroll-container');
        const counterEl = inlineSuggestionBox.querySelector('.inline-counter');
        if (!scrollContainer) return;

        filteredSuggestions = suggestions;
        selectedIndex = 0;

        scrollContainer.innerHTML = suggestions.map((sug, idx) => `
            <div class="inline-option ${idx === 0 ? 'selected' : ''}" data-index="${idx}">
                <span class="option-number">${idx + 1}</span>
                <span class="option-text">${sug}</span>
                <span class="option-arrow">↵</span>
            </div>
        `).join('');

        if (counterEl) {
            counterEl.textContent = `1 of ${suggestions.length}`;
        }

        // Attach click listeners
        scrollContainer.querySelectorAll('.inline-option').forEach((option, idx) => {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                selectedIndex = idx;
                updateSelection();
                setTimeout(() => acceptSuggestion(), 100);
            });
        });
    }

    // Create inline suggestion box below input — scroll wheel UI
    function createInlineSuggestionBox(inputElement) {
        removeInlineSuggestionBox();

        availableSuggestions = getNextSuggestions(8);
        if (availableSuggestions.length === 0) return;

        filteredSuggestions = [...availableSuggestions];
        selectedIndex = 0;

        const box = document.createElement('div');
        box.className = 'ainput-inline-suggestions';
        box.innerHTML = `
            <div class="inline-header-bar">
                <span class="inline-logo">⚡</span>
                <span class="inline-title">AI4COLAB Suggestions</span>
                <span class="inline-counter">1 of ${availableSuggestions.length}</span>
            </div>
            <div class="inline-search-wrapper">
                <span class="inline-search-icon">🔍</span>
                <input type="text" class="inline-search-input" placeholder="Filter suggestions..." autocomplete="off" />
            </div>
            <div class="inline-scroll-container">
                ${availableSuggestions.map((sug, idx) => `
                    <div class="inline-option ${idx === 0 ? 'selected' : ''}" data-index="${idx}">
                        <span class="option-number">${idx + 1}</span>
                        <span class="option-text">${sug}</span>
                        <span class="option-arrow">↵</span>
                    </div>
                `).join('')}
            </div>
            <div class="inline-footer-bar">
                <span class="inline-hint">↑↓ Navigate &nbsp;·&nbsp; Enter Accept &nbsp;·&nbsp; Esc Close &nbsp;·&nbsp; Scroll Wheel</span>
            </div>
        `;

        const rect = inputElement.getBoundingClientRect();
        const boxHeight = 380;
        const viewportHeight = window.innerHeight;

        const spaceBelow = viewportHeight - rect.bottom;
        const showAbove = spaceBelow < boxHeight && rect.top > boxHeight;

        box.style.position = 'fixed';
        box.style.left = `${rect.left}px`;
        box.style.width = `${Math.max(rect.width, 380)}px`;

        if (showAbove) {
            box.style.bottom = `${viewportHeight - rect.top + 5}px`;
            box.classList.add('show-above');
        } else {
            box.style.top = `${rect.bottom + 5}px`;
        }

        document.body.appendChild(box);
        inlineSuggestionBox = box;
        activeInput = inputElement;

        // --- Prevent blur when clicking anywhere inside the suggestion box ---
        box.addEventListener('mousedown', (e) => {
            // Allow focus on search input, prevent blur on everything else
            if (!e.target.classList.contains('inline-search-input')) {
                e.preventDefault();
            }
        });

        // --- Click listeners ---
        box.querySelectorAll('.inline-option').forEach((option, idx) => {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                selectedIndex = idx;
                updateSelection();
                setTimeout(() => acceptSuggestion(), 100);
            });
        });

        // --- Mouse wheel navigation ---
        const scrollContainer = box.querySelector('.inline-scroll-container');
        scrollContainer.addEventListener('wheel', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.deltaY > 0) {
                updateSelection('down');
            } else if (e.deltaY < 0) {
                updateSelection('up');
            }
        }, { passive: false });

        // --- Search/filter ---
        const searchInput = box.querySelector('.inline-search-input');
        searchInput.addEventListener('input', (e) => {
            e.stopPropagation();
            const query = e.target.value.toLowerCase().trim();
            if (query === '') {
                renderSuggestionOptions(availableSuggestions);
            } else {
                const filtered = availableSuggestions.filter(s => s.toLowerCase().includes(query));
                renderSuggestionOptions(filtered.length > 0 ? filtered : availableSuggestions);
            }
        });

        // Prevent search input from triggering suggestion box removal
        searchInput.addEventListener('focus', (e) => e.stopPropagation());
        searchInput.addEventListener('keydown', (e) => {
            // Allow typing in search but capture nav keys
            if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape', 'Tab'].includes(e.key)) {
                e.stopPropagation();
                if (e.key === 'ArrowUp') { e.preventDefault(); updateSelection('up'); }
                else if (e.key === 'ArrowDown') { e.preventDefault(); updateSelection('down'); }
                else if (e.key === 'Tab') { e.preventDefault(); updateSelection('tab'); }
                else if (e.key === 'Enter') { e.preventDefault(); acceptSuggestion(); }
                else if (e.key === 'Escape') { e.preventDefault(); removeInlineSuggestionBox(); activeInput && activeInput.focus(); }
            }
        });
    }

    // Update selected suggestion — vertical scroll wheel style
    function updateSelection(direction) {
        const list = filteredSuggestions.length > 0 ? filteredSuggestions : availableSuggestions;
        if (!inlineSuggestionBox || list.length === 0) return;

        if (direction === 'up') {
            selectedIndex = Math.max(0, selectedIndex - 1);
        } else if (direction === 'down') {
            selectedIndex = Math.min(list.length - 1, selectedIndex + 1);
        } else if (direction === 'tab') {
            selectedIndex = (selectedIndex + 1) % list.length;
        }
        // If no direction, just update UI with current selectedIndex

        // Update UI
        const options = inlineSuggestionBox.querySelectorAll('.inline-option');
        options.forEach((opt, idx) => {
            opt.classList.toggle('selected', idx === selectedIndex);
        });

        // Scroll selected into view smoothly
        if (options[selectedIndex]) {
            options[selectedIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Update counter
        const counterEl = inlineSuggestionBox.querySelector('.inline-counter');
        if (counterEl) {
            counterEl.textContent = `${selectedIndex + 1} of ${list.length}`;
        }
    }

    // Accept selected suggestion
    async function acceptSuggestion() {
        if (!activeInput || availableSuggestions.length === 0) return;

        // Use filtered list if search was active, otherwise full list
        const activeList = filteredSuggestions.length > 0 ? filteredSuggestions : availableSuggestions;
        const selectedSuggestion = activeList[selectedIndex];
        const combinedSuggestions = selectedSuggestion; // use single selected suggestion

        const inputElement = activeInput; // Store reference

        console.log('✅ Accepting suggestion:', selectedSuggestion);
        console.log('📝 Using BOTH suggestions:', combinedSuggestions);

        // Check if this is a contenteditable element
        const isContentEditable = inputElement.getAttribute('contenteditable') === 'true';

        if (isContentEditable) {
            // For contenteditable elements (like Grok)
            const selection = window.getSelection();

            // If text is selected, replace it
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(document.createTextNode(combinedSuggestions));

                // Move cursor to end
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            } else {
                // No selection, just set content
                inputElement.textContent = combinedSuggestions;
            }

            // Trigger events for contenteditable
            inputElement.dispatchEvent(new Event('input', { bubbles: true }));
            inputElement.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            // For regular input/textarea elements
            const hasSelection = inputElement.selectionStart !== inputElement.selectionEnd;

            if (hasSelection) {
                // Replace selected text with BOTH suggestions
                const start = inputElement.selectionStart;
                const end = inputElement.selectionEnd;
                const currentValue = inputElement.value;

                inputElement.value = currentValue.substring(0, start) + combinedSuggestions + currentValue.substring(end);

                // Set cursor after inserted text
                const newCursorPos = start + combinedSuggestions.length;
                inputElement.setSelectionRange(newCursorPos, newCursorPos);
            } else {
                // No selection, replace entire value with BOTH suggestions
                inputElement.value = combinedSuggestions;
            }

            inputElement.dispatchEvent(new Event('input', { bubbles: true }));
            inputElement.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Remove inline box
        removeInlineSuggestionBox();

        // Clear activeInput to allow next input to work
        activeInput = null;

        // Show inline feedback panel on webpage
        console.log('🎯 Showing inline feedback panel...');
        showInlineFeedbackPanel(selectedSuggestion);

        // Mark as used (but don't wait, do it async)
        markSuggestionUsed(selectedSuggestion).then(() => {
            console.log('📝 Suggestion marked as used, will show next suggestions next time');
        });

        // Give user 1.5 seconds to interact with feedback before allowing form submission
        // This prevents the feedback from disappearing on Google search
        inputElement.dataset.ainputSubmitDelay = Date.now();
    }

    // Remove inline suggestion box
    function removeInlineSuggestionBox() {
        if (inlineSuggestionBox) {
            inlineSuggestionBox.remove();
            inlineSuggestionBox = null;
        }
        // Don't reset activeInput here - it should persist until blur
        availableSuggestions = [];
        selectedIndex = 0;
    }

    // Show inline feedback panel on webpage
    async function showInlineFeedbackPanel(suggestion) {
        console.log('📍 Creating inline feedback on page for:', suggestion);

        // Remove existing inline feedback
        const existingInline = document.querySelector('.ainput-inline-feedback-panel');
        if (existingInline) {
            existingInline.remove();
        }

        const panel = document.createElement('div');
        panel.className = 'ainput-inline-feedback-panel';
        panel.innerHTML = `
            <div class="inline-feedback-header">
                <span class="inline-drag-handle">⋮⋮</span>
                💡 Suggestion Applied
                <span class="inline-feedback-close">✕</span>
            </div>
            <div class="inline-feedback-text">"${suggestion.substring(0, 50)}${suggestion.length > 50 ? '...' : ''}"</div>
            <div class="inline-feedback-actions">
                <button class="inline-feedback-btn like-btn">👍 Like</button>
                <button class="inline-feedback-btn dislike-btn">👎 Dislike</button>
            </div>
        `;

        // Get saved position and hide timer setting
        let hideTimerSec = 60; // default 1 minute
        try {
            const data = await chrome.storage.local.get(['inlinePanelPosition', 'feedbackHideTimer']);
            const pos = data.inlinePanelPosition || { bottom: '20px', left: '20px' };
            hideTimerSec = data.feedbackHideTimer || 60;

            panel.style.position = 'fixed';
            panel.style.zIndex = '2147483645';

            if (pos.top) {
                panel.style.top = pos.top;
            } else {
                panel.style.bottom = pos.bottom;
            }

            if (pos.left) {
                panel.style.left = pos.left;
            }
        } catch (error) {
            panel.style.position = 'fixed';
            panel.style.bottom = '20px';
            panel.style.left = '20px';
            panel.style.zIndex = '2147483645';
        }

        document.body.appendChild(panel);
        console.log('✨ Draggable inline feedback panel added');

        // Make draggable
        makeInlinePanelDraggable(panel);

        // Close button
        panel.querySelector('.inline-feedback-close').addEventListener('click', () => {
            console.log('🚪 Closing inline panel');
            panel.remove();
        });

        // Like/Dislike buttons
        panel.querySelector('.like-btn').addEventListener('click', async () => {
            console.log('👍 Like clicked');
            await toggleFeedback(suggestion, 'like');
            panel.querySelector('.like-btn').classList.add('active');
            panel.querySelector('.dislike-btn').classList.remove('active');
            setTimeout(() => panel.remove(), hideTimerSec * 1000);
        });

        panel.querySelector('.dislike-btn').addEventListener('click', async () => {
            console.log('👎 Dislike clicked');
            await toggleFeedback(suggestion, 'dislike');
            panel.querySelector('.dislike-btn').classList.add('active');
            panel.querySelector('.like-btn').classList.remove('active');
            setTimeout(() => panel.remove(), hideTimerSec * 1000);
        });

        // Auto-hide after configured time
        setTimeout(() => {
            if (panel.parentElement) {
                panel.style.opacity = '0';
                setTimeout(() => panel.remove(), 300);
            }
        }, hideTimerSec * 1000);
    }

    // Make inline panel draggable
    function makeInlinePanelDraggable(element) {
        let isDragging = false;
        let offsetX, offsetY;

        const header = element.querySelector('.inline-feedback-header');

        header.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);

        function startDrag(e) {
            if (e.target.classList.contains('inline-feedback-close')) return;
            if (e.target.classList.contains('inline-feedback-btn')) return;

            isDragging = true;
            const rect = element.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            element.style.cursor = 'grabbing';
        }

        function drag(e) {
            if (!isDragging) return;
            e.preventDefault();

            let x = e.clientX - offsetX;
            let y = e.clientY - offsetY;

            // Keep within viewport
            const maxX = window.innerWidth - element.offsetWidth;
            const maxY = window.innerHeight - element.offsetHeight;

            x = Math.max(0, Math.min(x, maxX));
            y = Math.max(0, Math.min(y, maxY));

            element.style.left = x + 'px';
            element.style.top = y + 'px';
            element.style.bottom = 'auto';
            element.style.right = 'auto';
        }

        function stopDrag() {
            if (!isDragging) return;
            isDragging = false;
            element.style.cursor = '';

            // Save position
            chrome.storage.local.set({
                inlinePanelPosition: {
                    top: element.style.top,
                    left: element.style.left
                }
            }).then(() => console.log('💾 Panel position saved'));
        }
    }

    // Show feedback in borderless popup window
    function showFloatingFeedback(suggestion) {
        console.log('🪟 Opening feedback popup for:', suggestion);

        // Encode suggestion for URL
        const encodedSuggestion = encodeURIComponent(suggestion);

        // Get extension URL for feedback popup
        const popupUrl = chrome.runtime.getURL(`feedback-popup.html?text=${encodedSuggestion}`);

        // Calculate center position
        const width = 500;
        const height = 400;
        const left = (screen.width - width) / 2;
        const top = (screen.height - height) / 2;

        // Open borderless popup window
        const popup = window.open(
            popupUrl,
            'AI4COLAB_Feedback',
            `width=${width},height=${height},left=${left},top=${top},resizable=no,scrollbars=no,status=no,toolbar=no,menubar=no,location=no`
        );

        if (popup) {
            popup.focus();
            console.log('✨ Feedback popup opened successfully');
        } else {
            console.error('❌ Popup blocked! Please allow popups for this site.');
            // Fallback: show alert
            alert('Please enable popups to rate suggestions!');
        }

        floatingFeedbackButton = popup;
    }

    // Toggle like/dislike feedback
    async function toggleFeedback(suggestion, action) {
        try {
            const data = await chrome.storage.local.get(['likedSuggestions', 'dislikedSuggestions']);
            let liked = new Set(data.likedSuggestions || []);
            let disliked = new Set(data.dislikedSuggestions || []);

            if (action === 'like') {
                liked.add(suggestion);
                disliked.delete(suggestion);
                console.log('👍 Liked suggestion:', suggestion);
            } else if (action === 'dislike') {
                disliked.add(suggestion);
                liked.delete(suggestion);
                console.log('👎 Disliked suggestion:', suggestion);
            }

            await chrome.storage.local.set({
                likedSuggestions: Array.from(liked),
                dislikedSuggestions: Array.from(disliked)
            });

            console.log('✅ Feedback saved to chrome.storage.local');
        } catch (error) {
            console.error('❌ Error saving feedback:', error);
        }
    }

    // Hide text after like/dislike clicked
    function hideTextAfterFeedback(panel) {
        const textContainer = panel.querySelector('.glassy-text-container');
        const actions = panel.querySelector('.glassy-actions');

        textContainer.style.opacity = '0';
        textContainer.style.maxHeight = '0';
        textContainer.style.marginBottom = '0';

        setTimeout(() => {
            textContainer.style.display = 'none';

            // Show confirmation
            const confirmation = document.createElement('div');
            confirmation.className = 'glassy-confirmation';
            confirmation.textContent = '✅ Thanks for your feedback!';
            actions.insertAdjacentElement('beforebegin', confirmation);

            // Remove confirmation after 3 seconds but keep panel visible
            setTimeout(() => {
                confirmation.style.opacity = '0';
                setTimeout(() => confirmation.remove(), 300);
            }, 3000);

            // Panel stays visible - user must manually close
        }, 300);
    }

    // Make glassy panel draggable
    function makeGlassyDraggable(element) {
        let isDragging = false;
        let currentX, currentY, initialX, initialY;

        const header = element.querySelector('.glassy-header');

        header.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);

        function dragStart(e) {
            if (e.target.classList.contains('glassy-close')) return;

            const rect = element.getBoundingClientRect();
            initialX = e.clientX - rect.left;
            initialY = e.clientY - rect.top;
            isDragging = true;
            element.style.cursor = 'grabbing';
            header.style.cursor = 'grabbing';
        }

        function drag(e) {
            if (!isDragging) return;
            e.preventDefault();

            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            // Keep within viewport
            const maxX = window.innerWidth - element.offsetWidth;
            const maxY = window.innerHeight - element.offsetHeight;

            currentX = Math.max(0, Math.min(currentX, maxX));
            currentY = Math.max(0, Math.min(currentY, maxY));

            element.style.left = currentX + 'px';
            element.style.top = currentY + 'px';
            element.style.right = 'auto';
            element.style.bottom = 'auto';
        }

        function dragEnd() {
            if (!isDragging) return;

            isDragging = false;
            element.style.cursor = '';
            header.style.cursor = 'grab';

            // Save position
            const pos = {
                top: element.style.top,
                left: element.style.left
            };
            chrome.storage.local.set({ panelPosition: pos });
        }
    }

    // Toggle like/dislike feedback
    async function toggleFeedback(suggestion, action) {
        const data = await chrome.storage.local.get(['feedback']);
        const feedback = data.feedback || { liked: [], disliked: [] };

        if (action === 'like') {
            if (feedback.liked.includes(suggestion)) {
                feedback.liked = feedback.liked.filter(s => s !== suggestion);
            } else {
                feedback.liked.push(suggestion);
                feedback.disliked = feedback.disliked.filter(s => s !== suggestion);
            }
        } else if (action === 'dislike') {
            if (feedback.disliked.includes(suggestion)) {
                feedback.disliked = feedback.disliked.filter(s => s !== suggestion);
            } else {
                feedback.disliked.push(suggestion);
                feedback.liked = feedback.liked.filter(s => s !== suggestion);
            }
        }

        await chrome.storage.local.set({ feedback });
    }

    // Handle input focus
    function handleInputFocus(event) {
        const input = event.target;

        // Check value safely (contenteditable uses textContent, inputs use value)
        const inputValue = input.value !== undefined ? input.value : (input.textContent || '');

        if (inputValue.length === 0) {
            setTimeout(() => createInlineSuggestionBox(input), 100);
        }
    }

    // Handle input value changes (cut, paste, clear)
    function handleInputChange(event) {
        const input = event.target;

        // Check value safely for different input types
        const inputValue = input.value !== undefined ? input.value : (input.textContent || '');

        // If input becomes empty, show suggestions (handles backspace, delete, cut, clear)
        if (inputValue.length === 0 && document.activeElement === input) {
            console.log('🗑️ Input cleared - showing suggestions');
            setTimeout(() => createInlineSuggestionBox(input), 100);
        } else if (inputValue.length > 0) {
            // If user starts typing, hide suggestions
            removeInlineSuggestionBox();
        }
    }

    // Handle keydown for backspace/delete detection
    function handleInputKeydown(event) {
        const input = event.target;

        // Detect Ctrl+A (select all) followed by Backspace or Delete
        if ((event.key === 'Backspace' || event.key === 'Delete')) {
            const inputValue = input.value !== undefined ? input.value : (input.textContent || '');
            const hasSelection = input.selectionStart !== undefined ?
                (input.selectionStart !== input.selectionEnd) :
                (window.getSelection().toString().length > 0);

            // If all text is selected or entire content is about to be deleted
            if (hasSelection || inputValue.length === 1) {
                console.log('⌨️ Delete detected - will show suggestions after clear');
                setTimeout(() => {
                    const newValue = input.value !== undefined ? input.value : (input.textContent || '');
                    if (newValue.length === 0) {
                        createInlineSuggestionBox(input);
                    }
                }, 50);
            }
        }
    }

    // Handle input blur
    function handleInputBlur(event) {
        setTimeout(() => {
            // Only remove if we're not clicking on the suggestion box or its children
            const activeEl = document.activeElement;
            const isInsideBox = inlineSuggestionBox && (
                inlineSuggestionBox.contains(activeEl) ||
                inlineSuggestionBox.contains(document.querySelector(':hover'))
            );
            if (activeEl !== event.target && !isInsideBox) {
                removeInlineSuggestionBox();
                activeInput = null; // Clear when truly blurring
            }
        }, 250);
    }

    // Handle keyboard events
    function handleKeyDown(event) {
        if (!inlineSuggestionBox || !activeInput) {
            // Handle second Enter press for form submission — 2 minute delay
            if (event.key === 'Enter' && event.target && event.target.dataset && event.target.dataset.ainputSubmitDelay) {
                const delay = Date.now() - parseInt(event.target.dataset.ainputSubmitDelay);
                if (delay < 120000) { // 2 minutes (120,000ms)
                    // Prevent immediate submission, user needs to wait or press Enter again
                    event.preventDefault();
                    event.stopPropagation();
                    event.target.dataset.ainputSubmitDelay = null;
                    console.log('⏸️  Prevented immediate submit. Press Enter again to search.');

                    // Show a premium styled notification
                    const notification = document.createElement('div');
                    notification.className = 'ainput-submit-notice';
                    notification.style.cssText = `
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%) scale(0.92);
                        background: rgba(12, 12, 20, 0.96);
                        backdrop-filter: blur(20px);
                        color: #e8e8f0;
                        padding: 18px 32px;
                        border-radius: 14px;
                        font-size: 14px;
                        font-weight: 600;
                        z-index: 2147483647;
                        font-family: 'Poppins', -apple-system, sans-serif;
                        border: 1px solid rgba(66, 133, 244, 0.3);
                        box-shadow: 0 12px 40px rgba(0,0,0,0.5), 0 0 20px rgba(66,133,244,0.1);
                        animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                        letter-spacing: 0.3px;
                    `;
                    notification.innerHTML = '✅ Suggestion accepted! Press <kbd style="background:rgba(66,133,244,0.2);border:1px solid rgba(66,133,244,0.3);padding:2px 8px;border-radius:5px;font-size:12px;margin:0 3px;">Enter</kbd> again to search.';
                    document.body.appendChild(notification);
                    setTimeout(() => {
                        notification.style.opacity = '0';
                        notification.style.transform = 'translate(-50%, -50%) scale(0.96)';
                        notification.style.transition = 'all 0.3s ease';
                        setTimeout(() => notification.remove(), 300);
                    }, 2000);
                    return false;
                }
            }
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            updateSelection('up');
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            updateSelection('down');
        } else if (event.key === 'Tab') {
            event.preventDefault();
            event.stopPropagation();
            updateSelection('tab');
        } else if (event.key === 'a' && (event.ctrlKey || event.metaKey)) {
            console.log('📝 Text will be selected - press Enter to replace with suggestion');
        } else if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            acceptSuggestion();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            removeInlineSuggestionBox();
        }
    }

    // Attach listeners to input fields
    function attachListeners() {
        // Expanded selectors for advanced input methods (Grok, ChatGPT, etc.)
        const inputs = document.querySelectorAll(`
            input[type="text"],
            input[type="search"],
            input[type="email"],
            input[type="url"],
            input:not([type]),
            textarea,
            [contenteditable="true"],
            [role="textbox"]
        `);

        inputs.forEach(input => {
            // Skip inputs that are inside the suggestion box (e.g., the search filter)
            if (input.closest('.ainput-inline-suggestions')) return;

            if (!input.hasAttribute('data-ainput-attached')) {
                input.setAttribute('data-ainput-attached', 'true');
                input.addEventListener('focus', handleInputFocus);
                input.addEventListener('blur', handleInputBlur);
                input.addEventListener('input', handleInputChange);
                input.addEventListener('keydown', handleInputKeydown); // Detect backspace/delete

                // For contenteditable elements
                if (input.getAttribute('contenteditable') === 'true') {
                    console.log('📝 Attached to contenteditable element');
                }
            }
        });

        if (!document.body.hasAttribute('data-ainput-keyboard')) {
            document.body.setAttribute('data-ainput-keyboard', 'true');
            document.addEventListener('keydown', handleKeyDown);
        }
    }

    // Watch for dynamic input fields
    const observer = new MutationObserver(() => {
        attachListeners();
    });

    // Initialize
    async function init() {
        await loadSuggestions();
        attachListeners();

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('✅ Auto Input Helper v2.1 active - Scroll wheel suggestions enabled');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

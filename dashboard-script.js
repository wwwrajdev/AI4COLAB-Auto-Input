// Dashboard Script - Manage suggestions, likes/dislikes, import/export

let allSuggestions = [];
let customSuggestions = [];
let feedback = { liked: [], disliked: [] };
let usedSuggestions = [];
let currentTab = 'all';
let useTxt = true;
let feedbackHideTimer = 60; // seconds, default 1 minute

// Load all data
async function loadData() {
    const data = await chrome.storage.local.get(['feedback', 'usedSuggestions', 'customSuggestions', 'useTxtFile', 'feedbackHideTimer']);

    feedback = data.feedback || { liked: [], disliked: [] };
    usedSuggestions = data.usedSuggestions || [];
    customSuggestions = data.customSuggestions || [];
    useTxt = data.useTxtFile !== false; // Default true

    // Load from t.txt if enabled
    if (useTxt) {
        try {
            const response = await fetch(chrome.runtime.getURL('t.txt'));
            const text = await response.text();
            const txtSuggestions = text.split('\n').map(line => line.trim()).filter(line => line);
            allSuggestions = [...new Set([...txtSuggestions, ...customSuggestions])];
        } catch (error) {
            allSuggestions = customSuggestions;
        }
    } else {
        allSuggestions = customSuggestions;
    }

    updateStats();
    displaySuggestions();
    document.getElementById('useTxtToggle').checked = useTxt;

    // Load hide timer setting
    feedbackHideTimer = data.feedbackHideTimer || 60;
    document.getElementById('hideTimerSlider').value = feedbackHideTimer;
    document.getElementById('hideTimerValue').textContent = formatTimerValue(feedbackHideTimer);
}

// Format timer value for display
function formatTimerValue(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins} min`;
}

// Update stats
function updateStats() {
    document.getElementById('totalCount').textContent = allSuggestions.length;
    document.getElementById('likedCount').textContent = feedback.liked.length;
    document.getElementById('dislikedCount').textContent = feedback.disliked.length;
    document.getElementById('usedCount').textContent = usedSuggestions.length;
}

// Display suggestions based on current tab
function displaySuggestions() {
    const container = document.getElementById('suggestionsList');
    let suggestions = [];

    switch (currentTab) {
        case 'all':
            suggestions = allSuggestions;
            break;
        case 'liked':
            suggestions = feedback.liked;
            break;
        case 'disliked':
            suggestions = feedback.disliked;
            break;
        case 'custom':
            suggestions = customSuggestions;
            break;
    }

    if (suggestions.length === 0) {
        container.innerHTML = '<p class="empty-state">No suggestions in this category</p>';
        return;
    }

    container.innerHTML = suggestions.map(suggestion => {
        const isLiked = feedback.liked.includes(suggestion);
        const isDisliked = feedback.disliked.includes(suggestion);
        const isUsed = usedSuggestions.includes(suggestion);
        const isCustom = customSuggestions.includes(suggestion);

        return `
            <div class="suggestion-item">
                <div class="suggestion-text">${suggestion}</div>
                <div class="suggestion-meta">
                    ${isLiked ? '<span class="badge liked">👍 Liked</span>' : ''}
                    ${isDisliked ? '<span class="badge disliked">👎 Disliked</span>' : ''}
                    ${isUsed ? '<span class="badge used">Used</span>' : ''}
                    ${isCustom ? '<span class="badge custom">Custom</span>' : ''}
                    <button class="delete-btn" data-suggestion="${suggestion}">Delete</button>
                </div>
            </div>
        `;
    }).join('');

    // Add delete listeners
    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const suggestion = e.target.dataset.suggestion;
            await deleteSuggestion(suggestion);
        });
    });
}

// Delete suggestion
async function deleteSuggestion(suggestion) {
    if (!confirm(`Delete "${suggestion}"?`)) return;

    // Remove from custom suggestions
    customSuggestions = customSuggestions.filter(s => s !== suggestion);

    // Remove from feedback
    feedback.liked = feedback.liked.filter(s => s !== suggestion);
    feedback.disliked = feedback.disliked.filter(s => s !== suggestion);

    // Remove from used
    usedSuggestions = usedSuggestions.filter(s => s !== suggestion);

    await chrome.storage.local.set({
        customSuggestions,
        feedback,
        usedSuggestions
    });

    loadData();
}

// Add new suggestion(s) — each new line = separate suggestion
document.getElementById('addBtn').addEventListener('click', async () => {
    const rawText = document.getElementById('newTextInput').value;
    const lines = rawText.split('\n').map(line => line.trim()).filter(line => line);

    if (lines.length === 0) {
        alert('Please enter some text');
        return;
    }

    let added = 0;
    let duplicates = 0;

    for (const line of lines) {
        if (!customSuggestions.includes(line)) {
            customSuggestions.push(line);
            added++;
        } else {
            duplicates++;
        }
    }

    if (added > 0) {
        await chrome.storage.local.set({ customSuggestions });
        document.getElementById('newTextInput').value = '';
        loadData();
    }

    if (duplicates > 0 && added === 0) {
        alert('All suggestions already exist');
    } else if (duplicates > 0) {
        alert(`Added ${added} suggestion(s). ${duplicates} duplicate(s) skipped.`);
    }
});

// Toggle t.txt usage
document.getElementById('useTxtToggle').addEventListener('change', async (e) => {
    useTxt = e.target.checked;
    await chrome.storage.local.set({ useTxtFile: useTxt });
    loadData();
});

// Hide timer slider
document.getElementById('hideTimerSlider').addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    document.getElementById('hideTimerValue').textContent = formatTimerValue(val);
});

document.getElementById('hideTimerSlider').addEventListener('change', async (e) => {
    feedbackHideTimer = parseInt(e.target.value);
    await chrome.storage.local.set({ feedbackHideTimer });
    console.log('⏱️ Feedback hide timer set to', feedbackHideTimer, 'seconds');
});

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        currentTab = e.target.dataset.tab;
        displaySuggestions();
    });
});

// Copy liked text
document.getElementById('copyLikedBtn').addEventListener('click', () => {
    if (feedback.liked.length === 0) {
        alert('No liked suggestions to copy');
        return;
    }

    const text = feedback.liked.join('\n');
    navigator.clipboard.writeText(text);
    alert(`Copied ${feedback.liked.length} liked suggestions to clipboard!`);
});

// Export all data
document.getElementById('exportBtn').addEventListener('click', () => {
    const exportData = {
        customSuggestions,
        feedback,
        usedSuggestions,
        useTxtFile: useTxt,
        exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auto-input-helper-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

// Import data
document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
});

document.getElementById('importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const importData = JSON.parse(text);

        // Validate and import
        if (importData.customSuggestions) customSuggestions = importData.customSuggestions;
        if (importData.feedback) feedback = importData.feedback;
        if (importData.usedSuggestions) usedSuggestions = importData.usedSuggestions;
        if (importData.useTxtFile !== undefined) useTxt = importData.useTxtFile;

        await chrome.storage.local.set({
            customSuggestions,
            feedback,
            usedSuggestions,
            useTxtFile: useTxt
        });

        loadData();
        alert('Data imported successfully!');
    } catch (error) {
        alert('Failed to import: ' + error.message);
    }

    e.target.value = '';
});

// Clear all data
document.getElementById('clearAllBtn').addEventListener('click', async () => {
    if (!confirm('Are you sure you want to clear ALL data? This cannot be undone!')) return;

    await chrome.storage.local.clear();
    customSuggestions = [];
    feedback = { liked: [], disliked: [] };
    usedSuggestions = [];

    loadData();
    alert('All data cleared!');
});

// Initialize
loadData();

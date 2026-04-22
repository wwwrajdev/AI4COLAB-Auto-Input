// Popup script
async function loadStats() {
    const data = await chrome.storage.local.get(['usedSuggestions']);
    const used = data.usedSuggestions || [];

    // Load total suggestions from t.txt
    const response = await fetch(chrome.runtime.getURL('t.txt'));
    const text = await response.text();
    const total = text.split('\n').filter(line => line.trim()).length;

    document.getElementById('totalSuggestions').textContent = total;
    document.getElementById('usedCount').textContent = used.length;
}

document.getElementById('resetBtn').addEventListener('click', async () => {
    await chrome.storage.local.set({
        usedSuggestions: [],
        currentIndex: 0
    });
    loadStats();
    alert('All suggestions reset! You can use them again.');
});

document.getElementById('dashboardBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'dashboard.html' });
});

loadStats();

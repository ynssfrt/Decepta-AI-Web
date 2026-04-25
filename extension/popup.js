document.getElementById('scan-btn').addEventListener('click', async () => {
    const btn = document.getElementById('scan-btn');
    const loading = document.getElementById('loading');
    const success = document.getElementById('success');
    const error = document.getElementById('error');
    
    btn.disabled = true;
    btn.classList.add('hidden');
    loading.classList.remove('hidden');
    error.classList.add('hidden');
    
    try {
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab.url.includes("trendyol.com") && !tab.url.includes("hepsiburada.com")) {
            throw new Error("Lütfen Trendyol veya Hepsiburada ürün sayfasında çalıştırın.");
        }
        
        // Execute the content script to extract DOM
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
        });
        
        const pageData = results[0].result;
        
        // Send the extracted data to our FastAPI backend
        const response = await fetch('http://127.0.0.1:8000/api/v1/scan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: tab.url,
                html_content: pageData.html,
                text_content: pageData.text
            })
        });
        
        if (!response.ok) {
            throw new Error("Backend'e ulaşılamadı.");
        }
        
        const data = await response.json();
        
        loading.classList.add('hidden');
        success.classList.remove('hidden');
        
        // Pass the task ID back to the main Web App using a custom event or let the user open the Web App
        // For MVP, we just show success.
        
    } catch (err) {
        loading.classList.add('hidden');
        error.textContent = "❌ " + err.message;
        error.classList.remove('hidden');
        btn.classList.remove('hidden');
        btn.disabled = false;
    }
});

// Decepta AI - Popup v9
// Trendyol: /yorumlar sayfasına yönlendir + auto-scroll
// Hepsiburada: -yorumlari sayfasına yönlendir + pagination tarama
// Cache: Tarama sonuçları popup kapansa bile korunur

let pollInterval = null;

// ========== SAYFA AÇILDIĞINDA CACHE KONTROL ==========
(async function loadCachedResults() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const pageUrl = tab.url.split('?')[0].split('#')[0]; // Normalize URL
        const cacheKey = 'decepta_cache_' + pageUrl;
        
        const cached = await chrome.storage.local.get(cacheKey);
        if (cached[cacheKey]) {
            handleCacheState(cached[cacheKey], tab.id);
        }
    } catch(e) {
        console.log('[Decepta AI] Cache yükleme hatası:', e);
    }
})();

function handleCacheState(data, tabId) {
    const btn = document.getElementById('scan-btn');
    const rescanBtn = document.getElementById('rescan-btn');
    const loading = document.getElementById('loading');
    const success = document.getElementById('success');
    const error = document.getElementById('error');
    const debugInfo = document.getElementById('debug-info');
    const statusText = document.getElementById('status-text');

    if (data.status === 'scanning') {
        btn.classList.add('hidden');
        rescanBtn.classList.remove('hidden'); // Kilitlenmeyi önlemek için Yeniden Tara butonu tarama esnasında da açık kalsın!
        loading.classList.remove('hidden');
        success.classList.add('hidden');
        error.classList.add('hidden');
        debugInfo.classList.add('hidden');
        statusText.textContent = 'Arka planda taranıyor... Lütfen bekleyin.';
        startPolling(tabId);
    } 
    else if (data.status === 'completed') {
        stopPolling();
        loading.classList.add('hidden');
        btn.classList.add('hidden');
        rescanBtn.classList.remove('hidden');
        
        debugInfo.classList.remove('hidden');
        debugInfo.innerHTML = data.debugHtml;
        
        success.classList.remove('hidden');
        success.innerHTML = data.successHtml;
        statusText.textContent = 'Son tarama sonuçları gösteriliyor.';
    }
    else if (data.status === 'error') {
        stopPolling();
        loading.classList.add('hidden');
        btn.classList.add('hidden');
        rescanBtn.classList.remove('hidden');
        error.classList.remove('hidden');
        error.innerHTML = data.errorMsg || '❌ Hata oluştu.';
        statusText.textContent = 'Tarama başarısız oldu.';
    }
}

function startPolling(tabId) {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        // Eğer kullanıcı sekme değiştirdiyse polling durmasın, ama doğru URL kontrol edilsin
        if (!tab || tab.id !== tabId) return; 
        
        const pageUrl = tab.url.split('?')[0].split('#')[0];
        const cacheKey = 'decepta_cache_' + pageUrl;
        const cached = await chrome.storage.local.get(cacheKey);
        
        if (cached[cacheKey] && cached[cacheKey].status !== 'scanning') {
            handleCacheState(cached[cacheKey], tabId);
        }
    }, 1000);
}

function stopPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
}

// ========== TARAMA FONKSİYONU (Background'ı tetikler) ==========
async function startScan() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const pageUrl = tab.url.split('?')[0].split('#')[0];
        const cacheKey = 'decepta_cache_' + pageUrl;
        
        // Önceki kilitlenmeleri önlemek için cache'i tamamen temizle ve scanning set et
        await chrome.storage.local.remove(cacheKey);
        
        // UI'ı loading state'ine geçir
        handleCacheState({ status: 'scanning' }, tab.id);
        
        // Cache'i scanning olarak işaretle (popup kapanırsa diye)
        await chrome.storage.local.set({ [cacheKey]: {
            status: 'scanning',
            timestamp: Date.now()
        }});
        
        // Background script'e mesaj gönder
        chrome.runtime.sendMessage({ 
            action: 'startScan', 
            tabId: tab.id, 
            url: tab.url 
        });
        
    } catch(err) {
        console.error(err);
    }
}

// ========== EVENT LISTENERS ==========
document.getElementById('scan-btn').addEventListener('click', startScan);
document.getElementById('rescan-btn').addEventListener('click', startScan);

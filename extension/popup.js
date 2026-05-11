document.getElementById('scan-btn').addEventListener('click', async () => {
    const btn = document.getElementById('scan-btn');
    const loading = document.getElementById('loading');
    const success = document.getElementById('success');
    const error = document.getElementById('error');
    const debugInfo = document.getElementById('debug-info');
    
    btn.disabled = true;
    btn.classList.add('hidden');
    loading.classList.remove('hidden');
    error.classList.add('hidden');
    debugInfo.classList.add('hidden');
    
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        let targetUrl = tab.url;
        
        // Ürün sayfasındaysak (/yorumlar değilse), yorumlar sayfasına geç
        if (targetUrl.includes('trendyol.com') && !targetUrl.includes('/yorumlar')) {
            // URL'den query string ve hash'i temizle, /yorumlar ekle
            const cleanUrl = targetUrl.split('?')[0].split('#')[0];
            targetUrl = cleanUrl + '/yorumlar';
            
            // Sayfayı yorumlar sayfasına yönlendir
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (url) => { window.location.href = url; },
                args: [targetUrl]
            });
            
            // Sayfa yüklenene kadar bekle
            await new Promise(resolve => {
                const checkLoaded = setInterval(async () => {
                    try {
                        const result = await chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            func: () => document.readyState
                        });
                        if (result[0].result === 'complete') {
                            clearInterval(checkLoaded);
                            // Biraz daha bekle - React render tamamlansın
                            setTimeout(resolve, 3000);
                        }
                    } catch(e) {
                        // Sayfa hâlâ yükleniyor, devam et
                    }
                }, 500);
                
                // Maximum 15 saniye bekle
                setTimeout(() => { clearInterval(checkLoaded); resolve(); }, 15000);
            });
        } else if (targetUrl.includes('hepsiburada.com') && !targetUrl.includes('-yorumlari')) {
            // Hepsiburada: Ürün sayfasından yorumlar sayfasına git
            // HB URL yapısı: .../urun-adi-p-HBCVXXXXX  →  .../urun-adi-p-HBCVXXXXX-yorumlari
            const navResult = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    // Yöntem 1: Sayfadaki "X Değerlendirme" linki (href*="-yorumlari")
                    const reviewsLink = document.querySelector('a[href*="-yorumlari"]');
                    if (reviewsLink) return reviewsLink.href;
                    // Yöntem 2: URL'den yorumlar sayfasını oluştur
                    const url = window.location.href.split('?')[0].split('#')[0];
                    if (url.match(/-p-[A-Za-z0-9]+$/)) return url + '-yorumlari';
                    return null;
                }
            });
            
            const reviewsUrl = navResult?.[0]?.result;
            if (reviewsUrl) {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: (url) => { window.location.href = url; },
                    args: [reviewsUrl]
                });
                
                // Sayfa yüklenene kadar bekle
                await new Promise(resolve => {
                    const checkLoaded = setInterval(async () => {
                        try {
                            const result = await chrome.scripting.executeScript({
                                target: { tabId: tab.id },
                                func: () => document.readyState
                            });
                            if (result[0].result === 'complete') {
                                clearInterval(checkLoaded);
                                setTimeout(resolve, 3000);
                            }
                        } catch(e) {}
                    }, 500);
                    setTimeout(() => { clearInterval(checkLoaded); resolve(); }, 15000);
                });
            } else {
                // Yorumlar linki bulunamadı, scroll ile devam et
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => { window.scrollTo(0, document.body.scrollHeight * 0.6); }
                });
                await new Promise(r => setTimeout(r, 3000));
            }
        } else {
            // Zaten yorumlar sayfasındayız veya başka site, kısa bekle
            await new Promise(r => setTimeout(r, 1000));
        }
        
        // Verileri çek
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
        });
        
        const pageData = results[0].result;
        
        // DEBUG göster
        debugInfo.classList.remove('hidden');
        if (pageData && pageData.extracted_data) {
            const ed = pageData.extracted_data;
            const photoCount = ed.photo_reviews_count || 0;
            let debugHtml = `
                <b>🔍 Eklenti Çıktısı (v19 - 1.3.13):</b><br>
                📊 Puan: <b>${ed.score}</b> (${ed.debug_source || '?'})<br>
                📝 Değerlendirme: <b>${ed.total_ratings}</b><br>
                💬 Yorum: <b>${ed.total_reviews}</b><br>
                📸 Fotoğraflı yorum: <b>${photoCount}</b>
            `;
            if (ed.total_reviews === 0 && ed.comments.length === 0) {
                debugHtml += `<br><br>⚠️ <b>Yorum bulunamadı.</b>`;
            }
            debugInfo.innerHTML = debugHtml;
        } else {
            debugInfo.innerHTML = `<b>HATA:</b> Veri çekilemedi!<br>${JSON.stringify(pageData).substring(0, 300)}`;
            loading.classList.add('hidden');
            btn.classList.remove('hidden');
            btn.disabled = false;
            return;
        }
        
        // Backend'e gönder
        // Navigasyon sonrası güncel URL'yi al
        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const postBody = {
            url: currentTab.url,
            extracted_data: pageData.extracted_data
        };
        
        console.log('[Decepta AI] Backend\'e gönderilen:', JSON.stringify(postBody, null, 2));
        
        const response = await fetch('http://127.0.0.1:8000/api/v1/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postBody)
        });
        
        if (!response.ok) throw new Error("Backend hatası: " + response.status);
        
        const data = await response.json();
        
        loading.classList.add('hidden');
        success.classList.remove('hidden');
        success.innerHTML = `✅ Başarılı!<br><a href="http://localhost:5173/?taskId=${data.task_id}" target="_blank" style="color:#3b82f6;">Sonuçları Görmek İçin Tıkla</a>`;
        
    } catch (err) {
        loading.classList.add('hidden');
        error.textContent = "❌ " + err.message;
        error.classList.remove('hidden');
        btn.classList.remove('hidden');
        btn.disabled = false;
    }
});

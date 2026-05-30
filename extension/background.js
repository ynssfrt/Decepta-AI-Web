// Decepta AI - Extension Background Worker
// Tarama işlemlerini arka planda yürüterek popup kapandığında işlemin kesilmesini önler.

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startScan') {
        startScanInBackground(request.tabId, request.url)
            .then(() => console.log('Arka plan tarama tamamlandı.'))
            .catch(e => console.error('Arka plan tarama hatası:', e));
        sendResponse({ success: true });
    }
    return true; // Asenkron response için gerekli
});

async function startScanInBackground(tabId, targetUrl) {
    let scanLogs = [];
    const logScan = (msg) => {
        console.log("[Decepta AI Log] " + msg);
        scanLogs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    };
    
    try {
        const isTrendyol = targetUrl.includes('trendyol.com');
        const isHepsiburada = targetUrl.includes('hepsiburada.com');
        const isN11 = targetUrl.includes('n11.com');

        // ======== Sayfa 1'e Yönlendirme ve Temizleme Kontrolü ========
        if (isTrendyol) {
            const cleanUrl = targetUrl.split('?')[0].split('#')[0];
            const reviewsUrl = cleanUrl.includes('/yorumlar') ? cleanUrl : cleanUrl + '/yorumlar';
            
            // Trendyol'da temiz bir başlangıç ve scroll sıfırlaması için her zaman sayfayı reviewsUrl'e yönlendiriyoruz.
            targetUrl = reviewsUrl;
            await navigateTabToUrl(tabId, targetUrl, 3000);
        } else if (isHepsiburada) {
            const cleanUrl = targetUrl.split('?')[0].split('#')[0];
            const reviewsUrl = cleanUrl.includes('-yorumlari') ? cleanUrl : cleanUrl + '-yorumlari';
            
            // Hepsiburada'da SPA navigasyonu nedeniyle URL değişmeden sayfa 2, 3 vb. aktif kalmış veya
            // URL ?sayfa=N parametresiyle kirlenmiş olabilir. Temiz bir başlangıç için her zaman
            // sayfayı ana yorumlar sayfasına yönlendirip temiz bir reload gerçekleştiriyoruz.
            targetUrl = reviewsUrl;
            await navigateTabToUrl(tabId, targetUrl, 3000);
        } else {
            await new Promise(r => setTimeout(r, 1000));
        }
        
        // ======== Trendyol Scroll ========
        if (isTrendyol) {
            await chrome.scripting.executeScript({
                target: { tabId },
                func: async () => {
                    await new Promise(resolve => {
                        let totalScrolled = 0; const scrollStep = 600; const delayMs = 400;
                        const scrollDown = () => {
                            window.scrollBy(0, scrollStep); totalScrolled += scrollStep;
                            if (totalScrolled < document.documentElement.scrollHeight) setTimeout(scrollDown, delayMs);
                            else setTimeout(resolve, 1500);
                        };
                        scrollDown();
                    });
                }
            });
            await new Promise(r => setTimeout(r, 2000));
        }
        
        // ======== Hepsiburada Scroll + Bekleme ========
        // ReviewCard'ların DOM'a eklenmesi ve görsellerin lazy-load edilmesi için scroll gerekli
        if (isHepsiburada) {
            // ReviewCard'ların render edilmesini bekle (max 8 saniye)
            await waitForReviewCards(tabId, 8000);
            
            // Yorum kartlarının tam yüklenmesi ve pagination barın render edilmesi için sayfayı aşağı kaydır
            await chrome.scripting.executeScript({
                target: { tabId },
                func: async () => {
                    await new Promise(resolve => {
                        let step = 0; const steps = 8;
                        const scroll = () => {
                            step++;
                            // Her adımda sayfayı 1500px kaydır ve dinamik maksimum yüksekliğe scroll et
                            window.scrollBy(0, 1500);
                            window.scrollTo(0, document.documentElement.scrollHeight || document.body.scrollHeight);
                            if (step < steps) setTimeout(scroll, 400);
                            else setTimeout(resolve, 1000);
                        };
                        scroll();
                    });
                }
            });
            await new Promise(r => setTimeout(r, 1500));
        }
        
        // ======== n11 Redirection + Coordinated Scroll ========
        if (isN11) {
            const isReviewsPage = targetUrl.includes('product-reviews');
            if (!isReviewsPage) {
                logScan("n11 Yorum tabının yüklenmesi bekleniyor...");
                // Sayfayı hafifçe kaydırıp yorum tabını aktif etmek için ilk tabı ara ve tıklat
                await chrome.scripting.executeScript({
                    target: { tabId },
                    func: async () => {
                        const reviewTab = document.querySelector('#tabReviews, .tabPanelReviews, a[href="#reviews"], [data-testid="reviews-tab"]');
                        if (reviewTab) {
                            reviewTab.scrollIntoView({ behavior: 'instant', block: 'center' });
                            await new Promise(r => setTimeout(r, 400));
                            reviewTab.click();
                        } else {
                            window.scrollTo(0, document.body.scrollHeight * 0.4);
                        }
                    }
                }).catch(() => {});
                await new Promise(r => setTimeout(r, 1500));

                logScan("n11 'Tüm Yorumları Gör' linki DOM'dan taranıyor...");
                const reviewsUrlResult = await chrome.scripting.executeScript({
                    target: { tabId },
                    func: () => {
                        const linkEl = document.querySelector('a.product-reviews__link, a[href*="product-reviews"]');
                        if (linkEl && linkEl.getAttribute('href')) return linkEl.getAttribute('href');
                        const links = Array.from(document.querySelectorAll('a'));
                        const seeAllLink = links.find(el => el.textContent.includes('Tüm Yorumları Gör'));
                        return seeAllLink ? seeAllLink.getAttribute('href') : null;
                    }
                }).catch(() => null);

                const reviewsHref = reviewsUrlResult?.[0]?.result;
                if (reviewsHref) {
                    const reviewsUrl = 'https://www.n11.com' + reviewsHref;
                    logScan(`n11 Bağımsız yorumlar sayfasına yönlendiriliyor: ${reviewsUrl}`);
                    targetUrl = reviewsUrl;
                    await navigateTabToUrl(tabId, reviewsUrl, 3000);
                } else {
                    logScan("n11 'Tüm Yorumları Gör' bağlantısı bulunamadı, mevcut sayfada kalınarak devam ediliyor.");
                }
            }

            // n11 standalone reviews sayfasında yorumların infinite scroll ile yüklenmesini sağla
            logScan("n11 Yorum sayfasında yavaşça aşağı kaydırılarak yorumların yüklenmesi bekleniyor...");
            await chrome.scripting.executeScript({
                target: { tabId },
                func: async () => {
                    await new Promise(resolve => {
                        let step = 0; const steps = 12;
                        const scroll = () => {
                            step++;
                            window.scrollBy(0, 800);
                            if (step < steps) setTimeout(scroll, 300);
                            else setTimeout(resolve, 1000);
                        };
                        scroll();
                    });
                }
            }).catch(() => {});
            await new Promise(r => setTimeout(r, 1500));
        }

        // ======== Hepsiburada Pagination ========
        let hbPhotoCount = 0;
        let hbTextReviewCount = 0;
        let hbStats = null;
        if (isHepsiburada) {
            hbStats = await scanHepsiburadaAllPages(tabId, targetUrl, logScan);
            hbPhotoCount = hbStats.photoCount;
            hbTextReviewCount = hbStats.textReviewCount;
        }

        
        // ======== Veri Çekme ========
        const results = await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content.js']
        });
        
        const pageData = results[0]?.result;
        if (!pageData || !pageData.extracted_data) throw new Error("Veri çekilemedi veya sayfa engelledi.");
        
        if (isHepsiburada) {
            const ratingsCount = pageData.extracted_data.total_ratings || 0;
            pageData.extracted_data.photo_reviews_count = ratingsCount > 0 ? Math.min(hbPhotoCount, ratingsCount) : hbPhotoCount;
            pageData.extracted_data.total_reviews = ratingsCount > 0 ? Math.min(hbTextReviewCount, ratingsCount) : hbTextReviewCount;
            
            // Tüm sayfalar taranarak biriktirilen eşsiz yorumları inject et
            if (hbStats && hbStats.comments && hbStats.comments.length > 0) {
                pageData.extracted_data.comments = hbStats.comments;
                pageData.extracted_data.detailed_reviews = hbStats.detailedReviews;
            }
        }
        
        // ======== Debug UI Oluştur ========
        const ed = pageData.extracted_data;
        const photoCount = ed.photo_reviews_count || 0;
        let debugHtml = `
            <b>🔍 Eklenti Çıktısı (v10):</b><br>
            📊 Puan: <b>${ed.score}</b> (${ed.debug_source || '?'})<br>
            📝 Değerlendirme: <b>${ed.total_ratings}</b><br>
            💬 Yorum: <b>${ed.total_reviews}</b><br>
            📸 Fotoğraflı yorum: <b>${photoCount}</b>
        `;
        if (isHepsiburada && hbPhotoCount > 0) debugHtml += `<br>📄 HB tarama: <b>${hbTextReviewCount} yorum, ${hbPhotoCount} fotoğraf</b>`;
        // Tarama günlüklerini ekle!
        if (scanLogs.length > 0) {
            debugHtml += `<br><br><b>📋 Tarama Günlüğü:</b><br><div style="font-size:10px; max-height:160px; overflow-y:auto; background:#1e293b; color:#cbd5e1; padding:6px; border-radius:4px; font-family:monospace; text-align:left; line-height:1.3; border: 1px solid #475569; white-space: nowrap;">${scanLogs.join('<br>')}</div>`;
        }
        // Yorum bulunamadı uyarısı: Sadece değerlendirme de yoksa göster (sadece yıldız-only geçerli bir durum)
        if (ed.total_reviews === 0 && ed.comments.length === 0 && ed.total_ratings === 0) debugHtml += `<br><br>⚠️ <b>Yorum bulunamadı.</b>`;
        
        // ======== Backend'e Gönder ========
        const postBody = { url: targetUrl, extracted_data: ed };
        console.log('[Decepta AI] Backend\'e gönderilen:', postBody);
        
        let successHtml = '';
        try {
            const response = await fetch('http://127.0.0.1:8000/api/v1/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(postBody)
            });
            
            if (!response.ok) throw new Error("Backend hatası: " + response.status);
            const data = await response.json();
            successHtml = `✅ Başarılı!<br><a href="http://localhost:5173/?taskId=${data.task_id}" target="_blank" style="color:#3b82f6;">Sonuçları Görmek İçin Tıkla</a>`;
        } catch (fetchErr) {
            console.warn("[Decepta AI] Backend fetch hatası yoksayılıyor:", fetchErr);
            successHtml = `⚠️ Tarama tamamlandı ama yerel sunucuya kaydedilemedi.<br><span style="font-size:10px; color:#ef4444;">Hata: ${fetchErr.message}</span>`;
        }
        
        // ======== Cache'e Kaydet ========
        const cacheKey = 'decepta_cache_' + targetUrl.split('?')[0].split('#')[0];
        await chrome.storage.local.set({ [cacheKey]: {
            status: 'completed',
            debugHtml: debugHtml,
            successHtml: successHtml,
            timestamp: Date.now()
        }});
        
    } catch (err) {
        console.error("[Decepta AI Background]", err);
        const cacheKey = 'decepta_cache_' + targetUrl.split('?')[0].split('#')[0];
        await chrome.storage.local.set({ [cacheKey]: {
            status: 'error',
            errorMsg: "❌ " + err.message,
            timestamp: Date.now()
        }});
    }
}

// ============================================================
// YARDIMCI FONKSİYONLAR
// ============================================================
async function waitForPageLoad(tabId, maxWaitMs = 15000, extraDelayMs = 3000) {
    await new Promise(resolve => {
        const checkLoaded = setInterval(async () => {
            try {
                const result = await chrome.scripting.executeScript({
                    target: { tabId },
                    func: () => document.readyState
                });
                if (result[0]?.result === 'complete') {
                    clearInterval(checkLoaded);
                    setTimeout(resolve, extraDelayMs);
                }
            } catch(e) {}
        }, 500);
        setTimeout(() => { clearInterval(checkLoaded); resolve(); }, maxWaitMs);
    });
}

// Sekmeyi verilen URL'e yönlendirir ve sayfa tamamen yüklenene kadar (status === complete) asenkron olarak bekler.
// Bu sayede eski sayfanın state kirliliklerinden kaynaklanan veya hızlı yüklenmelerde oluşan tüm yarış durumları önlenir.
async function navigateTabToUrl(tabId, url, extraDelayMs = 3000) {
    return new Promise((resolve) => {
        let resolved = false;
        const listener = (id, changeInfo) => {
            if (id === tabId && changeInfo.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                if (!resolved) {
                    resolved = true;
                    setTimeout(resolve, extraDelayMs);
                }
            }
        };
        chrome.tabs.onUpdated.addListener(listener);
        
        chrome.tabs.update(tabId, { url }).then(() => {
            // Güvenlik zamanlayıcısı (10 saniye)
            setTimeout(() => {
                chrome.tabs.onUpdated.removeListener(listener);
                if (!resolved) {
                    resolved = true;
                    resolve();
                }
            }, 10000);
        }).catch(() => {
            chrome.tabs.onUpdated.removeListener(listener);
            if (!resolved) {
                resolved = true;
                resolve();
            }
        });
    });
}

// Hepsiburada ReviewCard'larının DOM'da görünmesini bekler
async function waitForReviewCards(tabId, maxWaitMs = 8000) {
    await new Promise(resolve => {
        const startTime = Date.now();
        const check = setInterval(async () => {
            try {
                const result = await chrome.scripting.executeScript({
                    target: { tabId },
                    func: () => document.querySelectorAll('[class*="ReviewCard"]').length
                });
                const count = result[0]?.result || 0;
                if (count > 0 || Date.now() - startTime > maxWaitMs) {
                    clearInterval(check);
                    resolve();
                }
            } catch(e) {
                clearInterval(check);
                resolve();
            }
        }, 500);
        setTimeout(() => { clearInterval(check); resolve(); }, maxWaitMs + 500);
    });
}


async function scanHepsiburadaAllPages(tabId, baseUrl, logScan = console.log) {
    let uniquePhotos = new Set();
    let uniqueTexts = new Set();
    let allReviewsMap = new Map(); // sig -> { text, images }
    let allSeenSigs = new Set(); // Global benzersiz yorum imzaları
    
    logScan("Hepsiburada çoklu sayfa tarama algoritması başladı.");
    try {
        // ---- Sayfalama Elemanlarının DOM'a Eklenmesini Bekle ----
        logScan("Sayfalama elemanlarının DOM'da görünmesi bekleniyor...");
        await new Promise(resolve => {
            const startTime = Date.now();
            const check = setInterval(async () => {
                try {
                    const result = await chrome.scripting.executeScript({
                        target: { tabId },
                        func: () => {
                            const holder = document.querySelector('.paginationBarHolder, [class*="PaginationBar"]');
                            const overlay = document.querySelector('.paginationOverlay');
                            return !!(holder || overlay);
                        }
                    });
                    if (result[0]?.result || Date.now() - startTime > 5000) {
                        clearInterval(check);
                        resolve();
                    }
                } catch(e) {
                    clearInterval(check);
                    resolve();
                }
            }, 250);
        });

        // ---- Sayfa script'inden fotoğraf sayısını al (en güvenilir kaynak) ----
        // Hepsiburada review sayfası, template URL'leri script state'inde önceden yükler.
        const scriptPhotoResult = await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
                const html = document.documentElement.innerHTML;
                const matches = html.match(/usercontents\/s\/0\/\{size\}\/([a-f0-9-]+)\.jpg/g) || [];
                const uniqueIds = new Set(matches.map(m => m.split('/').pop()));
                return uniqueIds.size;
            }
        });
        const scriptPhotoCount = scriptPhotoResult[0]?.result || 0;
        logScan(`Sayfa HTML script state'inden tespit edilen eşsiz fotoğraf sayısı: ${scriptPhotoCount}`);
        
        // ---- Değerlendirme Sayısını Çekerek Sayfa Sayısını Matematiksel Olarak Hesapla ----
        logScan("React productState/utagData üzerinden toplam değerlendirme sayısı okunuyor...");
        const ratingsCountResult = await chrome.scripting.executeScript({
            target: { tabId },
            world: 'MAIN',
            func: () => {
                if (window.__INITIAL_STATE__ && window.__INITIAL_STATE__.productState?.product?.reviews?.customerReviewCount) {
                    return window.__INITIAL_STATE__.productState.product.reviews.customerReviewCount;
                }
                if (window.utagData && window.utagData.review_count) {
                    return parseInt(window.utagData.review_count);
                }
                const scripts = document.querySelectorAll('script');
                for (const script of scripts) {
                    const text = script.textContent || '';
                    if (text.includes('productState') && text.includes('customerReviewCount')) {
                        const match = text.match(/"customerReviewCount"\s*:\s*(\d+)/);
                        if (match) return parseInt(match[1]);
                    }
                    if (text.includes('review_count')) {
                        const match = text.match(/["']?review_count["']?\s*[:=]\s*["']?(\d+)/);
                        if (match) return parseInt(match[1]);
                    }
                }
                const selectors = [
                    '[itemprop="ratingCount"]',
                    '[itemprop="reviewCount"]',
                    '[class*="ReviewSummary"] [class*="count"]',
                    '.total-review-count',
                    '.rvw-cnt-tx',
                    'a.reviews-summary-reviews-detail b'
                ];
                for (const sel of selectors) {
                    const el = document.querySelector(sel);
                    if (el) {
                        const text = el.getAttribute('content') || el.innerText || '';
                        const m = text.match(/(\d[\d.]*)/);
                        if (m) return parseInt(m[1].replace(/\./g, ''));
                    }
                }
                return 0;
            }
        });
        const ratingsCount = ratingsCountResult[0]?.result || 0;
        logScan(`Okunan toplam değerlendirme adedi: ${ratingsCount}`);
        const calculatedPages = ratingsCount > 0 ? Math.ceil(ratingsCount / 10) : 1;
        logScan(`Değerlendirme sayısına göre hesaplanan sayfa sayısı: ${calculatedPages}`);

        // ---- Pagination tespiti ----
        logScan("DOM'daki sayfa butonlarından maksimum sayfa sayısı aranıyor...");
        const pageCountResult = await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
                const holder = document.querySelector('.paginationBarHolder, [class*="PaginationBar"]');
                let maxPage = 1;
                if (holder) {
                    holder.querySelectorAll('a, button, span, li, div').forEach(el => {
                        const txt = (el.innerText || el.textContent || '').trim();
                        const num = parseInt(txt);
                        if (!isNaN(num) && num > 0 && num < 500 && num > maxPage) maxPage = num;
                    });
                }
                document.querySelectorAll('[data-testid*="page"], [class*="PageNumber"], [class*="pageNumber"], [class*="PageHolder"]').forEach(el => {
                    const txt = (el.innerText || '').trim();
                    const num = parseInt(txt);
                    if (!isNaN(num) && num > 0 && num < 500 && num > maxPage) maxPage = num;
                });
                return maxPage;
            }
        });
        
        const totalPages = Math.min(Math.max(pageCountResult[0]?.result || 1, calculatedPages), 50);
        logScan(`DOM'dan okunan sayfa adedi: ${pageCountResult[0]?.result || 1}`);
        logScan(`Tarama yapılacak nihai Toplam Sayfa Sayısı: ${totalPages}`);
        
        // ---- Sayfa 1'i en yukarı al ----
        await chrome.scripting.executeScript({
            target: { tabId },
            func: () => window.scrollTo(0, 0)
        }).catch(() => {});
        await new Promise(r => setTimeout(r, 400));
        
        logScan("Sayfa 1'deki yorumlar analiz ediliyor...");
        await scrollAndAccumulateReviews(tabId, uniquePhotos, uniqueTexts, allReviewsMap, allSeenSigs);
        logScan(`Sayfa 1 tamamlandı. Toplanan metinli yorum: ${uniqueTexts.size}, fotoğraflı: ${uniquePhotos.size}`);
        
        for (let page = 2; page <= totalPages; page++) {
            try {
                // Her sayfa için doğrudan URL'ye yönlendirerek temiz ve kararlı bir sayfa yüklemesi sağlıyoruz.
                // Bu sayede SPA tıklama event kaçırmaları, React event bubbling kilitlenmeleri ve DOM render gecikmeleri 100% önlenir.
                const pageUrl = baseUrl.split('?')[0].split('#')[0] + '?sayfa=' + page;
                logScan(`Sayfa ${page} yönlendirmesi başlatılıyor...`);
                await navigateTabToUrl(tabId, pageUrl, 2000);
                
                // Sayfa değiştiğine göre adım adım kaydırarak Sayfa N'deki tüm yorumları oku
                logScan(`Sayfa ${page} yorumları analiz ediliyor...`);
                const beforeTextsCount = uniqueTexts.size;
                const beforePhotosCount = uniquePhotos.size;
                const pageResult = await scrollAndAccumulateReviews(tabId, uniquePhotos, uniqueTexts, allReviewsMap, allSeenSigs);
                
                const addedTexts = uniqueTexts.size - beforeTextsCount;
                const addedPhotos = uniquePhotos.size - beforePhotosCount;
                
                logScan(`Sayfa ${page} tamamlandı. Eklenen eşsiz yorum sayısı: ${addedTexts}, fotoğraflı: ${addedPhotos}`);
                
                if (pageResult.textOrPhotoCount === 0) {
                    logScan(`[Erken Çıkış] Sayfa ${page}'de hiç yazılı veya fotoğraflı yorum yok (yalnızca yıldızlı değerlendirmeler başladı). Tarama sonlandırılıyor.`);
                    break;
                }
            } catch(e) {
                console.error("Pagination hatası", e);
                break;
            }
        }
        
        let finalPhotoCount = uniquePhotos.size;

        // Map'i listelere çevir
        let commentsList = [];
        let detailedReviewsList = [];
        allReviewsMap.forEach((val) => {
            if (val.text && val.text.length > 0) {
                commentsList.push(val.text);
            }
            detailedReviewsList.push({ text: val.text || "", images: val.images || [] });
        });

        return { 
            photoCount: finalPhotoCount, 
            textReviewCount: uniqueTexts.size,
            comments: commentsList,
            detailedReviews: detailedReviewsList
        };
    } catch(e) {
        console.error("scanHepsiburadaAllPages error:", e);
    }
    
    return { photoCount: uniquePhotos.size, textReviewCount: uniqueTexts.size, comments: [], detailedReviews: [] };
}

async function scrollAndAccumulateReviews(tabId, uniquePhotos, uniqueTexts, allReviewsMap, allSeenSigs) {
    let addedAnyNew = false;
    let pageReviews = []; // Görülen tüm benzersiz yorumlar
    let seenSigs = new Set();
    
    const processStats = (sList) => {
        if (!sList || !sList.reviews) return;
        sList.reviews.forEach(r => {
            if (!seenSigs.has(r.sig)) {
                seenSigs.add(r.sig);
                pageReviews.push(r);
            }
            allSeenSigs.add(r.sig); // Global sete ekle!
            
            if (r.hasPhoto) {
                const photoKey = r.sig + '_photo';
                if (!uniquePhotos.has(photoKey)) {
                    uniquePhotos.add(photoKey);
                    addedAnyNew = true;
                }
            }
            if (r.hasText) {
                if (!uniqueTexts.has(r.sig)) {
                    uniqueTexts.add(r.sig);
                    addedAnyNew = true;
                }
            }
            if ((r.hasText || r.images.length > 0) && !allReviewsMap.has(r.sig)) {
                allReviewsMap.set(r.sig, { text: r.text, images: r.images });
                addedAnyNew = true;
            }
        });
    };
    
    // 1. En yukarı kaydır ve ilk kartları oku
    await chrome.scripting.executeScript({
        target: { tabId },
        func: () => window.scrollTo(0, 0)
    }).catch(() => {});
    await new Promise(r => setTimeout(r, 400));
    
    let stats = await getReviewSignaturesOnPage(tabId);
    processStats(stats);
    
    // 2. Adım adım aşağı kaydır ve her adımda oku
    // Küçük adımlarla yavaşça kaydırarak sanal listenin (React Virtualized) kartları unmount etme aralığını (gap) sıfırlıyoruz.
    const steps = 10;
    for (let i = 0; i < steps; i++) {
        await chrome.scripting.executeScript({
            target: { tabId },
            func: () => window.scrollBy(0, 750)
        }).catch(() => {});
        
        await new Promise(r => setTimeout(r, 250)); // React Virtualized render ve stabilizasyon süresi
        stats = await getReviewSignaturesOnPage(tabId);
        processStats(stats);
    }
    
    // 3. En aşağı kaydır ve son durumu oku
    await chrome.scripting.executeScript({
        target: { tabId },
        func: () => window.scrollTo(0, document.documentElement.scrollHeight || document.body.scrollHeight)
    }).catch(() => {});
    await new Promise(r => setTimeout(r, 200));
    stats = await getReviewSignaturesOnPage(tabId);
    processStats(stats);
    
    const textOrPhotoCount = pageReviews.filter(r => r.hasText || r.hasPhoto).length;
    
    return { addedAnyNew, textOrPhotoCount };
}

async function getReviewSignaturesOnPage(tabId) {
    try {
        const result = await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
                // Sadece ÜST SEVİYE ReviewCard'ları al (parent'ı ReviewCard olmayan)
                // Böylece iç içe elemanlar nedeniyle tekrarlanan sayım önlenir
                const allCards = document.querySelectorAll('[class*="ReviewCard"]');
                const topLevelCards = Array.from(allCards).filter(card => {
                    return !card.parentElement?.className?.includes('ReviewCard');
                });
                
                let photoSigs = [];
                let textSigs = [];
                let reviews = [];
                
                topLevelCards.forEach(card => {
                    const cardText = (card.innerText || '').trim();
                    
                    // Hepsiburada için yüksek hassasiyetli yorum metni seçici
                    const textSelectors = [
                        '[itemprop="description"]',
                        '[class*="review-comment"]',
                        '[class*="ReviewCard-module"] p',
                        'span[style*="text-align:start"]:not([class])',
                        'p'
                    ];
                    let extractedText = '';
                    for (const sel of textSelectors) {
                        const el = card.querySelector(sel);
                        if (el && el.innerText.trim().length > 0) {
                            extractedText = el.innerText.trim();
                            break;
                        }
                    }
                    const hasReviewText = extractedText.length > 0;
                    
                    // Kullanıcı görsellerini topla
                    let imgs = [];
                    card.querySelectorAll('img').forEach(img => {
                        const src = img.src || img.dataset?.src || '';
                        if (src && (src.includes('usercontents') || src.includes('review-images')) && !imgs.includes(src)) {
                            imgs.push(src);
                        }
                    });

                    // Kullanıcı meta-verilerini çek (isim ve tarih)
                    const userNameEl = card.querySelector('meta[content]');
                    const userName = userNameEl ? userNameEl.getAttribute('content').trim() : '';

                    let reviewDate = '';
                    const spanEls = card.querySelectorAll('span[content]');
                    for (const span of spanEls) {
                        const contentVal = span.getAttribute('content') || '';
                        if (contentVal.includes('-') && contentVal.length === 10) {
                            reviewDate = contentVal.trim();
                            break;
                        }
                    }

                    // Yorum kartı olmayan (satıcı reklamı/bilgisi vb. gibi ReviewCard sınıfını paylaşan) öğeleri filtrele
                    if (!userName && !reviewDate) {
                        return;
                    }

                    // Eşsiz ve stabil imza üretimi: Kullanıcı adı + tarih + yorum metni
                    // Görsellerin lazy-load edilmesinden etkilenmez, taramalar arasında 100% tutarlılık sağlar.
                    let sig = '';
                    if (userName && reviewDate) {
                        sig = userName + '_' + reviewDate + '_' + extractedText.trim();
                    } else {
                        // Yapısal değişiklik durumları için güvenli fallback
                        sig = hasReviewText 
                            ? cardText.substring(0, 80) + '_' + extractedText.trim()
                            : cardText.substring(0, 80);
                    }
                    
                    // Hepsiburada için yüksek hassasiyetli fotoğraf tespiti
                    // ÖNEMLİ: height="64px" count=1 sadece boş bir container placeholder'dır.
                    // Gerçek fotoğraf thumbnail'ları için count > 1 gereklidir.
                    const h64Count = card.querySelectorAll('[height="64px"]').length;
                    const w80Count = card.querySelectorAll('[width="80"]').length;
                    let hasUserPhoto = h64Count > 0 || w80Count > 0;
                    if (!hasUserPhoto) {
                        card.querySelectorAll('img').forEach(img => {
                            const src = img.src || img.dataset?.src || '';
                            if (src.includes('usercontents') || src.includes('review-images')) hasUserPhoto = true;
                        });
                    }
                    
                    // Sadece metin veya fotoğraf barındıran "gerçek yorum" kartlarını imzala
                    if (hasReviewText) textSigs.push(sig);
                    if (hasUserPhoto) photoSigs.push(sig + '_photo');
                    
                    reviews.push({
                        text: extractedText,
                        images: imgs,
                        sig: sig,
                        hasPhoto: hasUserPhoto,
                        hasText: hasReviewText,
                        rawText: cardText
                    });
                });
                return { photoSigs, textSigs, reviews };
            }
        });
        return result[0]?.result || { photoSigs: [], textSigs: [], reviews: [] };
    } catch (e) {
        console.warn("[Decepta AI] getReviewSignaturesOnPage executeScript hatası yoksayılıyor:", e);
        return { photoSigs: [], textSigs: [], reviews: [] };
    }
}

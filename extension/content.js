// Decepta AI - DOM Extractor v9
// Trendyol + Hepsiburada (Hermes) uyumlu - v1.3.3
(() => {
    try {
        const url = window.location.href;
        const bodyText = document.body.innerText;
        const isTrendyol = url.includes('trendyol.com');
        const isHepsiburada = url.includes('hepsiburada.com');
        
        let score = 0;
        let ratingsCount = 0;
        let commentCount = 0;
        let comments = [];
        let detailedReviews = [];
        let debug_source = '';

        // ========== HEPSİBURADA: ÖNCELİKLİ AYIKLAMA (v9) ==========
        if (isHepsiburada) {
            let hbPhotoCount = 0;
            let hbSuccess = false;

            // 1. Puan ve Değerlendirme Sayısı (HB Özel)
            const countEl = document.querySelector('[class*="ReviewSummary"] [class*="count"]') || document.querySelector('[itemprop="ratingCount"]');
            if (countEl) {
                const m = countEl.innerText.match(/(\d[\d.]*)/);
                if (m) ratingsCount = parseInt(m[1].replace(/\./g, ''));
            }
            const scoreEl = document.querySelector('[class*="RatingPointer"]') || document.querySelector('[itemprop="ratingValue"]');
            if (scoreEl) {
                score = parseFloat((scoreEl.getAttribute('content') || scoreEl.innerText || '').replace(',', '.'));
            }

            // 2. Butonlar ve Tablar (Yorum ve Fotoğraf Sayısı)
            const tabs = document.querySelectorAll('button, a, span, b, .hermes-ReviewSummary-module-ratingCount');
            tabs.forEach(el => {
                const txt = el.innerText || '';
                const mYorum = txt.match(/Yorum(?:lar)?\s*\((\d+)\)/i);
                if (mYorum && (!hbSuccess || commentCount === 0)) {
                    commentCount = parseInt(mYorum[1]);
                    hbSuccess = true;
                }
                const mFoto = txt.match(/Foto(?:ğ|g)rafl[ıi](?:\s*Yorumlar)?\s*\((\d+)\)/i);
                if (mFoto && hbPhotoCount === 0) {
                    hbPhotoCount = parseInt(mFoto[1]);
                }
            });

            // 3. Script Verisi (JSON parse - Brace matching)
            if (!hbSuccess || hbPhotoCount === 0) {
                try {
                    const scripts = document.querySelectorAll('script');
                    for (const s of scripts) {
                        const txt = s.textContent || '';
                        if (txt.includes('__HB_REVIEWS_INITIAL_STATE__')) {
                            const start = txt.indexOf('{', txt.indexOf('__HB_REVIEWS_INITIAL_STATE__'));
                            let balance = 0, end = -1;
                            for (let i = start; i < txt.length; i++) {
                                if (txt[i] === '{') balance++;
                                else if (txt[i] === '}') balance--;
                                if (balance === 0) { end = i; break; }
                            }
                            if (end > -1) {
                                const state = JSON.parse(txt.substring(start, end + 1));
                                if (!ratingsCount) ratingsCount = state.ratingSummary?.totalReviewCount || 0;
                                if (!hbSuccess) { commentCount = state.productReviews?.totalReviewCount || 0; hbSuccess = true; }
                                if (hbPhotoCount === 0) hbPhotoCount = state.mediaSummary?.approvedMediaReviewCount || 0;
                            }
                            break;
                        }
                    }
                } catch(e) {}
            }

            // 4. Fallbacks
            if (commentCount === 0 && ratingsCount > 0) commentCount = ratingsCount;
            if (hbPhotoCount === 0) {
                const imgs = document.querySelectorAll('[class*="ImageGallery"] img');
                if (imgs.length > 0) hbPhotoCount = imgs.length;
            }

            // Doğrulama
            if (ratingsCount > 0 && commentCount > ratingsCount) commentCount = ratingsCount;
            
            return {
                extracted_data: {
                    score: score || 0,
                    total_ratings: ratingsCount || 0,
                    total_reviews: commentCount || 0,
                    comments: [],
                    detailed_reviews: [],
                    photo_reviews_count: hbPhotoCount || 0,
                    debug_source: 'HB:V9'
                },
                html: document.documentElement.outerHTML.substring(0, 500),
                text: bodyText.substring(0, 500)
            };
        }

        // ========== 1. __NEXT_DATA__ (Trendyol vb.) ==========
        const nextDataEl = document.getElementById('__NEXT_DATA__');
        if (nextDataEl) {
            try {
                const nd = JSON.parse(nextDataEl.textContent);
                const findAll = (obj, key, found, depth) => {
                    if (!obj || typeof obj !== 'object' || depth > 12) return;
                    if (key in obj) found.push(obj[key]);
                    for (const k of Object.keys(obj)) findAll(obj[k], key, found, depth + 1);
                };
                try {
                    const product = nd?.props?.pageProps?.product;
                    if (product && product.ratingScore) {
                        score = parseFloat(product.ratingScore);
                        if (product.ratingCount) ratingsCount = parseInt(product.ratingCount);
                        debug_source = 'NEXT_DATA';
                    }
                } catch(e) {}
            } catch(e) {}
        }

        // ========== 2. DOM'dan Yorum Metinleri ==========
        const containerSelectors = ['.review', '.review-comment', '[class*="ReviewCard"]'];
        for (const sel of containerSelectors) {
            const cards = document.querySelectorAll(sel);
            if (cards.length > 0) {
                cards.forEach(el => {
                    const txt = el.innerText.trim();
                    if (txt.length > 5 && !comments.includes(txt)) comments.push(txt);
                });
                break;
            }
        }

        // ========== 3. DOM'dan Puan & Değerlendirme (Generic) ==========
        if (score === 0) {
            const scoreEls = ['.pr-in-rnr-v', '[itemprop="ratingValue"]'];
            for (const sel of scoreEls) {
                const el = document.querySelector(sel);
                if (el) {
                    score = parseFloat((el.getAttribute('content') || el.innerText || '').replace(',', '.'));
                    if (score > 0) { debug_source = 'DOM_GENERIC'; break; }
                }
            }
        }
        if (ratingsCount === 0) {
            const countEls = ['.rvw-cnt-tx', '[itemprop="ratingCount"]'];
            for (const sel of countEls) {
                const el = document.querySelector(sel);
                if (el) {
                    const m = el.innerText.match(/(\d+)/);
                    if (m) { ratingsCount = parseInt(m[1]); break; }
                }
            }
        }

        // ========== 4. Sayfa Metninden Regex (Fallback) ==========
        if (commentCount === 0) {
            const m = bodyText.match(/(\d[\d.]*)\s*[Yy]orum/);
            if (m) commentCount = parseInt(m[1].replace(/\./g, ''));
        }

        // ========== SONUÇ ==========
        const result = {
            extracted_data: {
                score: score || 0,
                total_ratings: ratingsCount || 0,
                total_reviews: commentCount || comments.length,
                comments: comments.slice(0, 5),
                detailed_reviews: [],
                photo_reviews_count: 0,
                debug_source: debug_source || 'GENERIC'
            },
            html: document.documentElement.outerHTML.substring(0, 1000),
            text: bodyText.substring(0, 1000)
        };
        return result;
        
    } catch (e) {
        return { error: e.message, extracted_data: { score: 0, total_ratings: 0, total_reviews: 0 } };
    }
})();

// Decepta AI - DOM Extractor v10
// Hepsiburada + Trendyol Kesin Çözüm - v1.3.4
(() => {
    try {
        const url = window.location.href;
        const bodyText = document.body.innerText;
        const isHepsiburada = url.includes('hepsiburada.com');
        
        let score = 0;
        let ratingsCount = 0;
        let commentCount = 0;
        let comments = [];
        let detailedReviews = [];
        let debug_source = '';

        // 1. ADIM: GENEL METADATA (Her site için ortak)
        // Puan
        const scoreEls = ['.pr-in-rnr-v', '[class*="RatingPointer"]', '[itemprop="ratingValue"]', '.rnr-avg-rnr-v'];
        for (const sel of scoreEls) {
            const el = document.querySelector(sel);
            if (el) {
                const val = parseFloat((el.getAttribute('content') || el.innerText || '').replace(',', '.'));
                if (val > 0 && val <= 5) { score = val; debug_source = 'DOM:' + sel; break; }
            }
        }
        // Değerlendirme Sayısı
        const countEls = ['.rvw-cnt-tx', '.total-review-count', '[itemprop="ratingCount"]', '[class*="ReviewSummary"] [class*="count"]'];
        for (const sel of countEls) {
            const el = document.querySelector(sel);
            if (el) {
                const m = el.innerText.match(/(\d[\d.]*)/);
                if (m) { ratingsCount = parseInt(m[1].replace(/\./g, '')); break; }
            }
        }

        // 2. ADIM: HEPSİBURADA ÖZEL (v10)
        if (isHepsiburada) {
            let hbPhotoCount = 0;
            let hbSuccess = false;

            // Butonlar/Tablar
            const tabs = document.querySelectorAll('button, a, span, b, [class*="hermes"]');
            tabs.forEach(el => {
                const txt = el.innerText || '';
                const mYorum = txt.match(/Yorum(?:lar)?\s*\((\d+)\)/i);
                if (mYorum && (!hbSuccess || commentCount === 0)) { commentCount = parseInt(mYorum[1]); hbSuccess = true; }
                const mFoto = txt.match(/Foto(?:ğ|g)rafl[ıi](?:\s*Yorumlar)?\s*\((\d+)\)/i);
                if (mFoto && hbPhotoCount === 0) hbPhotoCount = parseInt(mFoto[1]);
            });

            // Script Verisi
            if (!hbSuccess || hbPhotoCount === 0) {
                try {
                    const scripts = document.querySelectorAll('script');
                    for (const s of scripts) {
                        const txt = s.textContent || '';
                        if (txt.includes('__HB_REVIEWS_INITIAL_STATE__')) {
                            const start = txt.indexOf('{', txt.indexOf('__HB_REVIEWS_INITIAL_STATE__'));
                            let balance = 0, end = -1;
                            for (let i = start; i < txt.length; i++) {
                                if (txt[i] === '{') balance++; else if (txt[i] === '}') balance--;
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

            // Fallbacks
            if (commentCount === 0 && ratingsCount > 0) commentCount = ratingsCount;
            if (hbPhotoCount === 0) {
                const imgs = document.querySelectorAll('[class*="ImageGallery"] img');
                if (imgs.length > 0) hbPhotoCount = imgs.length;
            }
            if (ratingsCount > 0 && commentCount > ratingsCount) commentCount = ratingsCount;

            return {
                extracted_data: {
                    score: score || 0,
                    total_ratings: ratingsCount || 0,
                    total_reviews: commentCount || 0,
                    comments: [],
                    detailed_reviews: [],
                    photo_reviews_count: hbPhotoCount || 0,
                    debug_source: 'HB:V10'
                },
                html: document.documentElement.outerHTML.substring(0, 500),
                text: bodyText.substring(0, 500)
            };
        }

        // 3. ADIM: TRENDYOL / DİĞERLERİ
        // (Sadece HB değilse buraya gelir)
        if (commentCount === 0) {
            const m = bodyText.match(/(\d[\d.]*)\s*[Yy]orum/);
            if (m) commentCount = parseInt(m[1].replace(/\./g, ''));
        }

        return {
            extracted_data: {
                score: score || 0,
                total_ratings: ratingsCount || 0,
                total_reviews: commentCount || 0,
                comments: [],
                detailed_reviews: [],
                photo_reviews_count: 0,
                debug_source: debug_source || 'GENERIC'
            }
        };

    } catch (e) {
        return { error: e.message, extracted_data: { score: 0, total_ratings: 0, total_reviews: 0 } };
    }
})();

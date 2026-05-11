// Decepta AI - DOM Extractor v11
// Hepsiburada + Trendyol Kesin Çözüm - v1.3.5
(() => {
    try {
        const url = window.location.href;
        const bodyText = document.body.innerText;
        const isHepsiburada = url.includes('hepsiburada.com');
        
        let score = 0;
        let ratingsCount = 0;
        let commentCount = 0;
        let hbPhotoCount = 0;
        let debug_source = '';

        // 1. ADIM: KRİTİK METADATA (Puan ve Değerlendirme Sayısı)
        // Puan Bulma
        const scoreEls = ['.pr-in-rnr-v', '[class*="RatingPointer"]', '[itemprop="ratingValue"]', '.rnr-avg-rnr-v'];
        for (const sel of scoreEls) {
            const el = document.querySelector(sel);
            if (el) {
                const val = parseFloat((el.getAttribute('content') || el.innerText || '').replace(',', '.'));
                if (val > 0 && val <= 5) { score = val; break; }
            }
        }
        if (score === 0) {
            const m = bodyText.match(/(\d[.,]\d)\s*(?:puan|yıldız|★)/i);
            if (m) score = parseFloat(m[1].replace(',', '.'));
        }

        // Değerlendirme Sayısı Bulma (En kritik yer: 53'ü bulmalı)
        const countEls = ['.rvw-cnt-tx', '.total-review-count', '[itemprop="ratingCount"]', '[class*="count"]', '[class*="ratingCount"]'];
        for (const sel of countEls) {
            const els = document.querySelectorAll(sel);
            for (const el of els) {
                const txt = el.innerText || '';
                const m = txt.match(/(\d[\d.]*)/);
                if (m) {
                    const val = parseInt(m[1].replace(/\./g, ''));
                    if (val > ratingsCount) ratingsCount = val; 
                }
            }
        }
        if (ratingsCount === 0) {
            const m = bodyText.match(/(\d[\d.]*)\s*[Dd]eğerlendirme/);
            if (m) ratingsCount = parseInt(m[1].replace(/\./g, ''));
        }

        // 2. ADIM: HEPSİBURADA ÖZEL (v11)
        if (isHepsiburada) {
            let hbSuccess = false;

            // Butonlar, Tablar ve Linkler (Yorum ve Fotoğraf Sayısı)
            const elements = document.querySelectorAll('button, a, span, b, div[class*="hermes"]');
            elements.forEach(el => {
                const txt = el.innerText || '';
                // Yorum Sayısı: "Yorumlar (26)"
                const mYorum = txt.match(/Yorum(?:lar)?\s*\((\d+)\)/i);
                if (mYorum && (!hbSuccess || commentCount === 0)) {
                    commentCount = parseInt(mYorum[1]);
                    hbSuccess = true;
                }
                // Fotoğraf Sayısı: "Fotoğraflı (4)"
                const mFoto = txt.match(/Foto(?:ğ|g)rafl[ıi](?:\s*Yorumlar)?\s*\((\d+)\)/i);
                if (mFoto && hbPhotoCount === 0) {
                    hbPhotoCount = parseInt(mFoto[1]);
                }
            });

            // Script Verisi (Yedek)
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
                                if (hbPhotoCount === 0) hbPhotoCount = state.mediaSummary?.approvedMediaReviewCount || state.productReviews?.mediaCount || 0;
                            }
                            break;
                        }
                    }
                } catch(e) {}
            }

            // HB için mantıksal düzeltmeler
            if (commentCount === 0 && ratingsCount > 0) commentCount = ratingsCount;
            if (hbPhotoCount === 0) {
                const imgs = document.querySelectorAll('[class*="ImageGallery"] img, [class*="media-gallery"] img');
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
                    debug_source: 'HB:V11'
                },
                html: document.documentElement.outerHTML.substring(0, 500),
                text: bodyText.substring(0, 500)
            };
        }

        // 3. ADIM: DİĞER SİTELER (Trendyol vb.)
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
                debug_source: 'GENERIC:V11'
            }
        };

    } catch (e) {
        return { error: e.message, extracted_data: { score: 0, total_ratings: 0, total_reviews: 0 } };
    }
})();

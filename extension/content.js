// Decepta AI - DOM Extractor v15
// Hepsiburada + Trendyol Kesin Çözüm - v1.3.9
(() => {
    try {
        const url = window.location.href;
        const html = document.documentElement.innerHTML;
        const bodyText = document.body.innerText;
        const isHepsiburada = url.includes('hepsiburada.com');
        
        let score = 0, ratingsCount = 0, commentCount = 0, hbPhotoCount = 0;
        let dbg = "";

        // 1. Metadata (Puan ve Değerlendirme)
        const scoreEls = ['.pr-in-rnr-v', '[class*="RatingPointer"]', '[itemprop="ratingValue"]', '.rnr-avg-rnr-v'];
        for (const sel of scoreEls) {
            const el = document.querySelector(sel);
            if (el) { score = parseFloat((el.getAttribute('content') || el.innerText || '').replace(',', '.')); if (score > 0) break; }
        }
        if (score === 0) {
            const m = bodyText.match(/(\d[.,]\d)\s*(?:puan|yıldız|★)/i);
            if (m) score = parseFloat(m[1].replace(',', '.'));
        }

        const countEls = ['.rvw-cnt-tx', '[itemprop="ratingCount"]', '.hermes-ReviewSummary-module-ratingCount'];
        for (const sel of countEls) {
            const el = document.querySelector(sel);
            if (el) { const m = el.innerText.match(/(\d+)/); if (m) { ratingsCount = parseInt(m[1]); break; } }
        }
        if (ratingsCount === 0) {
            const m = bodyText.match(/(\d+)\s*[Dd]eğerlendirme/);
            if (m) ratingsCount = parseInt(m[1]);
        }

        // 2. HEPSİBURADA ÖZEL (v15 - Wildcard Regex)
        if (isHepsiburada) {
            // A. HTML JSON Taraması (Wildcard ile esnekleştirildi)
            // "productReviews" bloğu içinde "totalReviewCount" ara
            const mR = html.match(/"productReviews"[\s\S]{0,1000}?"totalReviewCount"\s*:\s*(\d+)/);
            if (mR) { commentCount = parseInt(mR[1]); dbg += "R"; }
            
            // "mediaSummary" bloğu içinde "approvedMediaReviewCount" ara
            const mP = html.match(/"mediaSummary"[\s\S]{0,1000}?"approvedMediaReviewCount"\s*:\s*(\d+)/);
            if (mP) { hbPhotoCount = parseInt(mP[1]); dbg += "P"; }

            // B. Metin Üzerinden Çok Esnek Arama
            if (commentCount === 0) {
                // "Yorumlar (26)" veya "Yorumlar 26" veya "26 Yorum"
                const mY = bodyText.match(/Yorumlar?.*?(\d+)/i) || html.match(/Yorumlar?.*?(\d+)/i);
                if (mY) { commentCount = parseInt(mY[1]); dbg += "T"; }
            }
            if (hbPhotoCount === 0) {
                const mF = bodyText.match(/Foto.*?(\d+)/i) || html.match(/Foto.*?(\d+)/i);
                if (mF) { hbPhotoCount = parseInt(mF[1]); }
            }

            // C. Fallbacks
            if (commentCount === 0 && ratingsCount > 0) { commentCount = ratingsCount; dbg += "F"; }
            if (ratingsCount > 0 && commentCount > ratingsCount) commentCount = ratingsCount;

            return {
                extracted_data: {
                    score: score || 0,
                    total_ratings: ratingsCount || 0,
                    total_reviews: commentCount || 0,
                    photo_reviews_count: hbPhotoCount || 0,
                    debug_source: 'HB:V15:' + dbg
                }
            };
        }

        return { extracted_data: { score, total_ratings: ratingsCount, total_reviews: commentCount || ratingsCount, photo_reviews_count: 0, debug_source: 'GENERIC' } };
    } catch (e) { return { error: e.message }; }
})();

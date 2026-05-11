// Decepta AI - DOM Extractor v17
// Hepsiburada + Trendyol Kesin Çözüm - v1.3.11
(() => {
    try {
        const url = window.location.href;
        const html = document.documentElement.innerHTML;
        const bodyText = document.body.innerText;
        const isHepsiburada = url.includes('hepsiburada.com');
        
        let score = 0, ratingsCount = 0, commentCount = 0, hbPhotoCount = 0;
        let dbg = "";

        // 1. ADIM: METADATA
        const scoreEls = ['.pr-in-rnr-v', '[class*="RatingPointer"]', '[itemprop="ratingValue"]'];
        for (const sel of scoreEls) {
            const el = document.querySelector(sel);
            if (el) { score = parseFloat((el.getAttribute('content') || el.innerText || '').replace(',', '.')); if (score > 0) break; }
        }
        if (ratingsCount === 0) {
            const m = bodyText.match(/(\d+)\s*[Dd]eğerlendirme/);
            if (m) ratingsCount = parseInt(m[1]);
        }

        // 2. ADIM: HEPSİBURADA ÖZEL (v17 - En Sağlam Regex Seti)
        if (isHepsiburada) {
            // A. JSON Taraması (Çok esnek ama blok içinde)
            // Hepsiburada JSON'u: "productReviews":{"totalReviewCount":26}
            const mR = html.match(/"productReviews"[\s\S]{0,1000}?"totalReviewCount"\s*:\s*(\d+)/);
            if (mR) { commentCount = parseInt(mR[1]); dbg += "R"; }
            
            const mP = html.match(/"mediaSummary"[\s\S]{0,1000}?"approvedMediaReviewCount"\s*:\s*(\d+)/);
            if (mP) { hbPhotoCount = parseInt(mP[1]); dbg += "P"; }

            // B. Metin Taraması (Daha esnek parantez ve boşluk desteği)
            if (commentCount === 0) {
                // "Yorumlar (26)" veya "Yorumlar(26)" veya "Yorumlar ( 26 )"
                const mY = bodyText.match(/[Yy]orum(?:lar)?\s*\(\s*(\d+)\s*\)/i) || html.match(/[Yy]orum(?:lar)?\s*\(\s*(\d+)\s*\)/i);
                if (mY) { commentCount = parseInt(mY[1]); dbg += "T"; }
            }
            if (commentCount === 0) {
                // "Toplam 26 yorum" kalıbı
                const mT = bodyText.match(/toplam\s+(\d+)\s+yorum/i);
                if (mT) { commentCount = parseInt(mT[1]); dbg += "M"; }
            }
            if (hbPhotoCount === 0) {
                const mF = bodyText.match(/[Ff]oto(?:ğ|g)rafl[ıi](?:\s*Yorumlar)?\s*\(\s*(\d+)\s*\)/i) || html.match(/[Ff]oto(?:ğ|g)rafl[ıi](?:\s*Yorumlar)?\s*\(\s*(\d+)\s*\)/i);
                if (mF) { hbPhotoCount = parseInt(mF[1]); }
            }

            // C. Fallbacks ve Doğrulama
            if (commentCount > 1000000) commentCount = 0; // Garbage temizleme
            if (commentCount === 0 && ratingsCount > 0) { commentCount = ratingsCount; dbg += "F"; }
            if (ratingsCount > 0 && commentCount > ratingsCount) commentCount = ratingsCount;

            return {
                extracted_data: {
                    score: score || 0,
                    total_ratings: ratingsCount || 0,
                    total_reviews: commentCount || 0,
                    photo_reviews_count: hbPhotoCount || 0,
                    debug_source: 'HB:V17:' + dbg
                }
            };
        }

        return { extracted_data: { score, total_ratings: ratingsCount, total_reviews: commentCount || ratingsCount, photo_reviews_count: 0, debug_source: 'GENERIC' } };
    } catch (e) { return { error: e.message }; }
})();

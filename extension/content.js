// Decepta AI - DOM Extractor v16
// Hepsiburada + Trendyol Kesin Çözüm - v1.3.10
(() => {
    try {
        const url = window.location.href;
        const html = document.documentElement.innerHTML;
        const bodyText = document.body.innerText;
        const isHepsiburada = url.includes('hepsiburada.com');
        
        let score = 0, ratingsCount = 0, commentCount = 0, hbPhotoCount = 0;
        let dbg = "";

        // 1. Metadata
        const scoreEls = ['.pr-in-rnr-v', '[class*="RatingPointer"]', '[itemprop="ratingValue"]'];
        for (const sel of scoreEls) {
            const el = document.querySelector(sel);
            if (el) { score = parseFloat((el.getAttribute('content') || el.innerText || '').replace(',', '.')); if (score > 0) break; }
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

        // 2. HEPSİBURADA ÖZEL (v16 - Hassas Ayar)
        if (isHepsiburada) {
            // A. Hassas JSON Taraması (Blok sınırlı)
            // Sadece nesne içindeki (parantez/süslü parantez arası) ilk sayıyı alır
            const mR = html.match(/"productReviews"\s*:\s*\{[^{}]*?"totalReviewCount"\s*:\s*(\d+)/);
            if (mR) { commentCount = parseInt(mR[1]); dbg += "R"; }
            
            const mP = html.match(/"mediaSummary"\s*:\s*\{[^{}]*?"approvedMediaReviewCount"\s*:\s*(\d+)/);
            if (mP) { hbPhotoCount = parseInt(mP[1]); dbg += "P"; }

            // B. Hassas Metin Taraması (Sadece parantezli yapılar)
            if (commentCount === 0) {
                const mY = bodyText.match(/Yorum(?:lar)?\s*\((\d+)\)/i);
                if (mY) { commentCount = parseInt(mY[1]); dbg += "T"; }
            }
            if (hbPhotoCount === 0) {
                const mF = bodyText.match(/Foto(?:ğ|g)rafl[ıi]\s*\((\d+)\)/i);
                if (mF) { hbPhotoCount = parseInt(mF[1]); }
            }

            // C. Güvenlik ve Fallback
            // 1 Milyondan fazla yorum HB için imkansızdır, garbage veriyi temizle
            if (commentCount > 1000000) commentCount = 0;
            if (hbPhotoCount > 1000000) hbPhotoCount = 0;

            if (commentCount === 0 && ratingsCount > 0) { commentCount = ratingsCount; dbg += "F"; }
            if (ratingsCount > 0 && commentCount > ratingsCount) commentCount = ratingsCount;

            return {
                extracted_data: {
                    score: score || 0,
                    total_ratings: ratingsCount || 0,
                    total_reviews: commentCount || 0,
                    photo_reviews_count: hbPhotoCount || 0,
                    debug_source: 'HB:V16:' + dbg
                }
            };
        }

        return { extracted_data: { score, total_ratings: ratingsCount, total_reviews: commentCount || ratingsCount, photo_reviews_count: 0, debug_source: 'GENERIC' } };
    } catch (e) { return { error: e.message }; }
})();

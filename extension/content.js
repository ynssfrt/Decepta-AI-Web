// Decepta AI - DOM Extractor v18
// Hepsiburada + Trendyol Kesin Çözüm - v1.3.12
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
        const mRatings = bodyText.match(/(\d+)\s*[Dd]eğerlendirme/);
        if (mRatings) ratingsCount = parseInt(mRatings[1]);

        // 2. ADIM: HEPSİBURADA ÖZEL (v18 - Kolektif Veri Analizi)
        if (isHepsiburada) {
            // A. JSON Havuzu Taraması (Tüm totalReviewCount değerlerini topla)
            const allCounts = [];
            const matches = html.match(/"totalReviewCount"\s*:\s*(\d+)/g);
            if (matches) {
                matches.forEach(m => {
                    const val = parseInt(m.match(/(\d+)/)[1]);
                    if (val > 0 && val < 1000000) allCounts.push(val);
                });
            }
            
            // ratingsCount 53 ise, allCounts içinde 53 olmayan en büyük sayı yorum sayısıdır (26 gibi)
            if (allCounts.length > 0) {
                if (!ratingsCount) ratingsCount = Math.max(...allCounts);
                const candidates = allCounts.filter(v => v !== ratingsCount).sort((a,b) => b-a);
                if (candidates.length > 0) {
                    commentCount = candidates[0];
                    dbg += "J";
                }
            }

            // B. Fotoğraf Sayısı (JSON içinden)
            const mP = html.match(/"approvedMediaReviewCount"\s*:\s*(\d+)/) || html.match(/"mediaCount"\s*:\s*(\d+)/);
            if (mP) { hbPhotoCount = parseInt(mP[1]); dbg += "P"; }

            // C. Metin Taraması (Yedek)
            if (commentCount === 0) {
                const mY = bodyText.match(/Yorumlar\s*\(\s*(\d+)\s*\)/i);
                if (mY) { commentCount = parseInt(mY[1]); dbg += "T"; }
            }

            // D. Son Çare ve Mantık Kontrolü
            if (commentCount === 0 && ratingsCount > 0) { commentCount = ratingsCount; dbg += "F"; }
            if (ratingsCount > 0 && commentCount > ratingsCount) {
                // Eğer yanlışlıkla daha büyük bir sayı bulduysak (ID vb.), takas et
                const temp = ratingsCount;
                ratingsCount = commentCount;
                commentCount = temp;
            }

            return {
                extracted_data: {
                    score: score || 0,
                    total_ratings: ratingsCount || 0,
                    total_reviews: commentCount || 0,
                    photo_reviews_count: hbPhotoCount || 0,
                    debug_source: 'HB:V18:' + dbg
                }
            };
        }

        return { extracted_data: { score, total_ratings: ratingsCount, total_reviews: commentCount || ratingsCount, photo_reviews_count: 0, debug_source: 'GENERIC' } };
    } catch (e) { return { error: e.message }; }
})();

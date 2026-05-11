// Decepta AI - DOM Extractor v19
// Hepsiburada + Trendyol Kesin Çözüm - v1.3.13
(() => {
    try {
        const url = window.location.href;
        const bodyText = document.body.innerText;
        const isHepsiburada = url.includes('hepsiburada.com');
        
        let score = 0, ratingsCount = 0, commentCount = 0, hbPhotoCount = 0;
        let dbg = "";

        // 1. Metadata (Puan ve Değerlendirme)
        const scoreEls = ['.pr-in-rnr-v', '[class*="RatingPointer"]', '[itemprop="ratingValue"]'];
        for (const sel of scoreEls) {
            const el = document.querySelector(sel);
            if (el) { score = parseFloat((el.getAttribute('content') || el.innerText || '').replace(',', '.')); if (score > 0) break; }
        }
        if (ratingsCount === 0) {
            const m = bodyText.match(/(\d+)\s*[Dd]eğerlendirme/);
            if (m) ratingsCount = parseInt(m[1]);
        }

        // 2. HEPSİBURADA ÖZEL (v19 - Derin DOM Tarama)
        if (isHepsiburada) {
            // A. Tüm Parantezli Sayıları Topla
            const candidates = [];
            const all = document.getElementsByTagName('*');
            // Performans için sadece ilk 2000 elementi tara
            const limit = Math.min(all.length, 2000);
            for (let i = 0; i < limit; i++) {
                const txt = all[i].innerText || "";
                // Sadece kısa metinli elementleri kontrol et (tab butonları gibi)
                if (txt.length > 1 && txt.length < 50) {
                    const m = txt.match(/\(\s*(\d+)\s*\)/);
                    if (m) {
                        const val = parseInt(m[1]);
                        if (val > 0 && val < 1000000) candidates.push(val);
                    }
                }
            }

            if (candidates.length > 0) {
                // En büyük sayı muhtemelen toplam değerlendirmedir (53)
                if (!ratingsCount) ratingsCount = Math.max(...candidates);
                // ratingsCount olmayan en büyük sayı yorum sayısıdır (26)
                const revs = candidates.filter(v => v !== ratingsCount).sort((a,b) => b-a);
                if (revs.length > 0) {
                    commentCount = revs[0];
                    dbg += "D";
                    // En küçük sayı muhtemelen fotoğraf sayısıdır (4)
                    hbPhotoCount = revs[revs.length - 1];
                }
            }

            // B. Script Fallback
            if (commentCount === 0) {
                const html = document.documentElement.innerHTML;
                const mR = html.match(/"totalReviewCount"\s*:\s*(\d+)/g);
                if (mR) {
                    const vals = mR.map(m => parseInt(m.match(/(\d+)/)[1]));
                    if (!ratingsCount) ratingsCount = Math.max(...vals);
                    const filtered = vals.filter(v => v !== ratingsCount).sort((a,b) => b-a);
                    if (filtered.length > 0) { commentCount = filtered[0]; dbg += "S"; }
                }
            }

            // C. Fallbacks
            if (commentCount === 0 && ratingsCount > 0) { commentCount = ratingsCount; dbg += "F"; }
            if (ratingsCount > 0 && commentCount > ratingsCount) {
                const t = ratingsCount; ratingsCount = commentCount; commentCount = t;
            }

            return {
                extracted_data: {
                    score: score || 0,
                    total_ratings: ratingsCount || 0,
                    total_reviews: commentCount || 0,
                    photo_reviews_count: hbPhotoCount || 0,
                    debug_source: 'HB:V19:' + dbg
                }
            };
        }

        return { extracted_data: { score, total_ratings: ratingsCount, total_reviews: commentCount || ratingsCount, photo_reviews_count: 0, debug_source: 'GENERIC' } };
    } catch (e) { return { error: e.message }; }
})();

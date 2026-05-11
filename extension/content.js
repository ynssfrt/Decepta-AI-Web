// Decepta AI - DOM Extractor v13
// Hepsiburada + Trendyol Kesin Çözüm - v1.3.7
(() => {
    try {
        const url = window.location.href;
        const html = document.body.innerHTML;
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
        const countEls = ['.rvw-cnt-tx', '[itemprop="ratingCount"]', '[class*="ReviewSummary"] [class*="count"]'];
        for (const sel of countEls) {
            const el = document.querySelector(sel);
            if (el) {
                const m = el.innerText.match(/(\d+)/);
                if (m) { ratingsCount = parseInt(m[1]); break; }
            }
        }
        if (ratingsCount === 0) {
            const m = bodyText.match(/(\d+)\s*[Dd]eğerlendirme/);
            if (m) ratingsCount = parseInt(m[1]);
        }

        // 2. HEPSİBURADA ÖZEL (v13)
        if (isHepsiburada) {
            // A. HTML üzerinden agresif arama (DOM kısıtlamalarını aşmak için)
            const mYorum = html.match(/Yorum(?:lar)?\s*\((\d+)\)/i) || bodyText.match(/Yorum(?:lar)?\s*\((\d+)\)/i);
            if (mYorum) { commentCount = parseInt(mYorum[1]); dbg += "T"; }
            
            const mFoto = html.match(/Foto(?:ğ|g)rafl[ıi](?:\s*Yorumlar)?\s*\((\d+)\)/i) || bodyText.match(/Foto(?:ğ|g)rafl[ıi](?:\s*Yorumlar)?\s*\((\d+)\)/i);
            if (mFoto) { hbPhotoCount = parseInt(mFoto[1]); dbg += "P"; }

            // B. Script Verisi (v13 - Geliştirilmiş JSON bulucu)
            if (commentCount === 0 || hbPhotoCount === 0) {
                const scripts = document.querySelectorAll('script');
                for (const s of scripts) {
                    const txt = s.textContent || '';
                    if (txt.includes('__HB_REVIEWS_INITIAL_STATE__')) {
                        try {
                            const start = txt.indexOf('{', txt.indexOf('__HB_REVIEWS_INITIAL_STATE__'));
                            let bal = 0, end = -1;
                            for (let i = start; i < txt.length; i++) {
                                if (txt[i] === '{') bal++; else if (txt[i] === '}') bal--;
                                if (bal === 0) { end = i; break; }
                            }
                            if (end > -1) {
                                const state = JSON.parse(txt.substring(start, end + 1));
                                const sRatings = state.ratingSummary?.totalReviewCount || 0;
                                const sReviews = state.productReviews?.totalReviewCount || 0;
                                const sMedia = state.mediaSummary?.approvedMediaReviewCount || state.productReviews?.mediaCount || 0;
                                
                                if (!ratingsCount) ratingsCount = sRatings;
                                if (commentCount === 0) { commentCount = sReviews; dbg += "S"; }
                                if (hbPhotoCount === 0) hbPhotoCount = sMedia;
                            }
                        } catch(e) {}
                        break;
                    }
                }
            }

            // C. Fallbacks
            if (commentCount === 0 && ratingsCount > 0) { commentCount = ratingsCount; dbg += "F"; }
            if (ratingsCount > 0 && commentCount > ratingsCount) commentCount = ratingsCount;
            if (hbPhotoCount === 0) {
                const imgs = document.querySelectorAll('[class*="ImageGallery"] img');
                if (imgs.length > 0) hbPhotoCount = imgs.length;
            }

            return {
                extracted_data: {
                    score: score || 0,
                    total_ratings: ratingsCount || 0,
                    total_reviews: commentCount || 0,
                    photo_reviews_count: hbPhotoCount || 0,
                    debug_source: 'HB:V13:' + dbg
                }
            };
        }

        return { extracted_data: { score, total_ratings: ratingsCount, total_reviews: commentCount, photo_reviews_count: 0, debug_source: 'GENERIC' } };
    } catch (e) { return { error: e.message }; }
})();

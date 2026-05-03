// Decepta AI - DOM Extractor v6
// Değerlendirme (yıldız) ve Yorum (yazılı) sayıları ayrı ayrı çekilir
(() => {
    try {
        const url = window.location.href;
        const bodyText = document.body.innerText;
        
        let score = 0;
        let ratingsCount = 0;
        let commentCount = 0;
        let comments = [];
        let debug_source = ''; // Hangi yöntemle bulunduğunu takip et

        // ========== __NEXT_DATA__ ==========
        const nextDataEl = document.getElementById('__NEXT_DATA__');
        if (nextDataEl) {
            try {
                const nd = JSON.parse(nextDataEl.textContent);
                const findAll = (obj, key, found, depth) => {
                    if (!obj || typeof obj !== 'object' || depth > 12) return;
                    if (key in obj) found.push(obj[key]);
                    for (const k of Object.keys(obj)) findAll(obj[k], key, found, depth + 1);
                };
                
                // Puan: Önce Trendyol'un bilinen yolunu dene
                try {
                    const product = nd?.props?.pageProps?.product;
                    if (product && product.ratingScore) {
                        const val = parseFloat(product.ratingScore);
                        if (val > 0 && val <= 5.0) {
                            score = val;
                            debug_source = 'NEXT_DATA.product';
                        }
                        if (product.ratingCount) ratingsCount = parseInt(product.ratingCount);
                        if (!ratingsCount && product.totalRatingCount) ratingsCount = parseInt(product.totalRatingCount);
                    }
                } catch(e) {}
                
                // Yedek: Recursive arama (sadece 0-5 arası geçerli)
                if (score === 0) {
                    const scores = []; findAll(nd, 'ratingScore', scores, 0);
                    for (const s of scores) {
                        const val = parseFloat(s);
                        if (val > 0 && val <= 5.0) { score = val; debug_source = 'NEXT_DATA.recursive'; break; }
                    }
                }
                if (ratingsCount === 0) {
                    const counts = []; findAll(nd, 'ratingCount', counts, 0);
                    if (counts.length > 0) ratingsCount = parseInt(counts[0]);
                }
                if (ratingsCount === 0) {
                    const totals = []; findAll(nd, 'totalRatingCount', totals, 0);
                    if (totals.length > 0) ratingsCount = parseInt(totals[0]);
                }
                
                // Yorum metinleri
                const reviewKeys = ['productReviews', 'reviews', 'userReviews'];
                for (const key of reviewKeys) {
                    if (comments.length > 0) break;
                    const arrs = []; findAll(nd, key, arrs, 0);
                    for (const arr of arrs) {
                        if (Array.isArray(arr)) {
                            arr.forEach(r => {
                                const txt = r.comment || r.text || r.reviewText || r.body || r.content || '';
                                if (typeof txt === 'string' && txt.length > 15) comments.push(txt.trim());
                            });
                        }
                    }
                }
            } catch(e) {}
        }

        // ========== DOM'dan Yorum Metinleri ==========
        if (comments.length === 0) {
            const selectors = ['.rnr-com-tx', 'div.rnr-com-tx', '.comment-text', '.pr-rvw-crd-tx'];
            for (const sel of selectors) {
                document.querySelectorAll(sel).forEach(el => {
                    const txt = el.innerText.trim();
                    if (txt.length > 15 && !comments.includes(txt)) comments.push(txt);
                });
                if (comments.length > 0) break;
            }
        }

        // ========== DOM'dan Puan ==========
        if (score === 0) {
            const scoreEls = ['.pr-in-rnr-v', '.pr-rnr-p-s', '.rnr-avg-rnr-v'];
            for (const sel of scoreEls) {
                const el = document.querySelector(sel);
                if (el) {
                    const val = parseFloat(el.innerText.trim().replace(',', '.'));
                    if (val > 0 && val <= 5) { score = val; debug_source = 'DOM:' + sel; break; }
                }
            }
        }

        // ========== DOM'dan Değerlendirme Sayısı ==========
        if (ratingsCount === 0) {
            const countEls = ['a.reviews-summary-reviews-detail b', '.rvw-cnt-tx', '.total-review-count'];
            for (const sel of countEls) {
                const el = document.querySelector(sel);
                if (el) {
                    const m = el.innerText.match(/(\d[\d.]*)/);
                    if (m) { ratingsCount = parseInt(m[1].replace(/\./g, '')); break; }
                }
            }
        }

        // ========== JSON-LD ==========
        if (score === 0 || ratingsCount === 0) {
            document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
                try {
                    const raw = script.textContent;
                    if (!raw) return;
                    const data = JSON.parse(raw);
                    const check = (item) => {
                        if (item && item.aggregateRating) {
                            if (!score) score = parseFloat(item.aggregateRating.ratingValue || 0);
                            if (!ratingsCount) ratingsCount = parseInt(item.aggregateRating.ratingCount || item.aggregateRating.reviewCount || 0);
                        }
                    };
                    if (Array.isArray(data)) data.forEach(check);
                    else check(data);
                } catch(e) {}
            });
        }

        // ========== Sayfa Metninden Regex ==========
        if (score === 0) {
            const patterns = [
                /Tüm Değerlendirmeler[\s\S]{0,5}(\d[.,]?\d)/i,       // "Tüm Değerlendirmeler\n4.4" veya "Tüm Değerlendirmeler\n4"
                /(\d[.,]\d)[\s\S]{0,30}Değerlendirme/i,              // "4.4 ... Değerlendirme" (aralarındaki her şey)
                /(\d[.,]\d)\s*[★☆⭐·|]/,                             // "4.4 ★" veya "4.4 ·"
                /(\d[.,]\d)\s*(?:puan|yıldız|\(|\/\s*5)/i,          // "4.4 puan"
            ];
            for (const pat of patterns) {
                const m = bodyText.match(pat);
                if (m) {
                    let val = parseFloat(m[1].replace(',', '.'));
                    // Tam sayı puanlar (örn: "4") tek haneli olabilir
                    if (val >= 1 && val <= 5.0) {
                        score = val;
                        debug_source = 'REGEX';
                        break;
                    }
                }
            }
        }
        
        // Değerlendirme sayısı: "1.488 değerlendirme"
        if (ratingsCount === 0) {
            const m = bodyText.match(/(\d[\d.]*)\s*(?:değerlendirme|oy|rating)/i);
            if (m) ratingsCount = parseInt(m[1].replace(/\./g, ''));
        }
        
        // YORUM sayısı (yazılı): "789 yorum" veya "Yorumlar (789)" vb. — değerlendirmeden AYRI
        if (commentCount === 0) {
            const patterns = [
                /(\d[\d.]*)\s*[Yy]orum/,                  // "789 Yorum" veya "789 yorum"
                /[Yy]orum(?:lar)?\s*\(?(\d[\d.]*)\)?/,    // "Yorumlar (789)" veya "Yorum 789"
                /(\d[\d.]*)\s*(?:yorum|review|comment)/i,  // genel
            ];
            for (const pat of patterns) {
                const m = bodyText.match(pat);
                if (m) {
                    const val = parseInt(m[1].replace(/\./g, ''));
                    if (val > 0 && val !== ratingsCount) {
                        commentCount = val;
                        break;
                    }
                }
            }
        }
        
        // Fallback: commentCount bulunamadıysa, DOM'daki yorum adedini kullan
        if (commentCount === 0) commentCount = comments.length;
        // NOT: ratingsCount'u yorum sayısı olarak KULLANMIYORUZ çünkü ikisi farklı

        // ========== SONUÇ ==========
        if (!debug_source) debug_source = 'BULUNAMADI';
        const result = {
            extracted_data: {
                score: score || 0,
                total_ratings: ratingsCount || 0,
                total_reviews: commentCount,
                comments: comments,
                debug_source: debug_source
            },
            html: document.documentElement.outerHTML,
            text: bodyText
        };
        
        console.log('[Decepta AI] Sonuç:', JSON.stringify(result.extracted_data, null, 2));
        return result;
        
    } catch (e) {
        console.error('[Decepta AI] Hata:', e);
        return { 
            error: e.message,
            html: document.documentElement.outerHTML, 
            text: document.body.innerText, 
            extracted_data: { score: 0, total_ratings: 0, total_reviews: 0, comments: [] } 
        };
    }
})();

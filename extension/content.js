// Decepta AI - DOM Extractor v7
// Trendyol (Puzzle framework) + Hepsiburada (Hermes) uyumlu
// Değerlendirme (yıldız) ve Yorum (yazılı) sayıları ayrı ayrı çekilir
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

        // ========== 1. __NEXT_DATA__ (Eski Trendyol / bazı siteler) ==========
        const nextDataEl = document.getElementById('__NEXT_DATA__');
        if (nextDataEl) {
            try {
                const nd = JSON.parse(nextDataEl.textContent);
                const findAll = (obj, key, found, depth) => {
                    if (!obj || typeof obj !== 'object' || depth > 12) return;
                    if (key in obj) found.push(obj[key]);
                    for (const k of Object.keys(obj)) findAll(obj[k], key, found, depth + 1);
                };
                
                // Puan
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
                
                // Yorum ve Fotoğraflı Yorum Sayıları (NEXT_DATA'dan araması)
                // HB API'si genelde reviewCount ve photoReviewCount (veya benzeri) kullanır
                const yorumKeyleri = ['reviewCount', 'commentCount', 'approvedReviewCount'];
                const fotoKeyleri = ['photoReviewCount', 'mediaCount', 'withMediaCount', 'imageReviewCount', 'customerMediaCount'];
                
                if (commentCount === 0) {
                    for (const k of yorumKeyleri) {
                        const vals = []; findAll(nd, k, vals, 0);
                        if (vals.length > 0 && typeof vals[0] === 'number') { commentCount = vals[0]; break; }
                    }
                }
                
                let ndPhotoCountVal = 0;
                for (const k of fotoKeyleri) {
                    const vals = []; findAll(nd, k, vals, 0);
                    if (vals.length > 0 && typeof vals[0] === 'number') { ndPhotoCountVal = vals[0]; break; }
                }
                if (ndPhotoCountVal > 0) window.__ndPhotoCount = ndPhotoCountVal;
                
                // Yorum metinleri ve görselleri (__NEXT_DATA__ içinden)
                const reviewKeys = ['productReviews', 'reviews', 'userReviews'];
                for (const key of reviewKeys) {
                    const arrs = []; findAll(nd, key, arrs, 0);
                    for (const arr of arrs) {
                        if (Array.isArray(arr)) {
                            arr.forEach(r => {
                                const txt = r.comment || r.text || r.reviewText || r.body || r.content || '';
                                const imgs = [];
                                if (r.mediaUrls) {
                                    r.mediaUrls.forEach(m => { if (m.url) imgs.push(m.url); else if (typeof m === 'string') imgs.push(m); });
                                } else if (r.images) {
                                    r.images.forEach(img => { if (img.url) imgs.push(img.url); else if (typeof img === 'string') imgs.push(img); });
                                }
                                
                                if (typeof txt === 'string' && txt.length > 2) {
                                    const cleanTxt = txt.trim();
                                    if (!comments.includes(cleanTxt)) {
                                        comments.push(cleanTxt);
                                        detailedReviews.push({ text: cleanTxt, images: imgs });
                                    }
                                }
                            });
                        }
                    }
                    if (comments.length > 0) break;
                }
            } catch(e) {}
        }

        // ========== 2. DOM'dan Yorum Metinleri & Görseller ==========
        if (comments.length === 0) {
            // Trendyol (yeni Puzzle framework): .review, .review-comment, .comment-text
            // Hepsiburada (Hermes): [class*="ReviewCard"], [class*="hermes-ReviewCard"]
            // Eski Trendyol: .pr-rvw-crd, .rnr-com-w
            const containerSelectors = [
                // Trendyol yeni yapı
                '.rnr-com-w',
                '.pr-rvw-crd',
                // Trendyol Puzzle framework
                '[class*="review-card"]',
                '[class*="reviewCard"]',
                '.review',
                // Hepsiburada Hermes
                '[class*="hermes-ReviewCard-module"]',
                '[class*="ReviewCard"]',
            ];
            
            for (const sel of containerSelectors) {
                const cards = document.querySelectorAll(sel);
                if (cards.length > 0) {
                    cards.forEach(el => {
                        // Yorum metnini bul
                        const textSelectors = [
                            '.rnr-com-tx',
                            '.comment-text',
                            '.review-comment',
                            '.review-text',
                            '.pr-rvw-crd-tx',
                            '[itemprop="description"]',
                            '[class*="review-comment"]',
                            '[class*="ReviewCard-module"] p',
                            'p',
                        ];
                        let txt = "";
                        for (const tsel of textSelectors) {
                            const textEl = el.querySelector(tsel);
                            if (textEl && textEl.innerText.trim().length > 2) {
                                txt = textEl.innerText.trim();
                                break;
                            }
                        }
                        
                        // Görselleri bul — kullanıcının yüklediği ürün fotoğrafları
                        const imgs = [];
                        const isReviewPhoto = (img) => {
                            const src = img.src || img.dataset?.src || '';
                            if (!src || src.startsWith('data:')) return false;
                            // Küçük ikonları (star, badge, avatar) dışla
                            const excludePatterns = ['avatar', 'star', 'icon', 'svg', 'badge', 'logo', 'emoji', 'placeholder'];
                            if (excludePatterns.some(p => src.toLowerCase().includes(p))) return false;
                            // Çok küçük görselleri dışla (genelde ikon/star olur)
                            const w = img.naturalWidth || img.width || 0;
                            const h = img.naturalHeight || img.height || 0;
                            if ((w > 0 && w < 40) || (h > 0 && h < 40)) return false;
                            return true;
                        };
                        el.querySelectorAll('img').forEach(img => {
                            if (isReviewPhoto(img)) {
                                const src = img.src || img.dataset?.src;
                                if (src && !imgs.includes(src)) {
                                    imgs.push(src);
                                }
                            }
                        });

                        if (txt.length > 2 || imgs.length > 0) {
                            // Metin yoksa ama görsel varsa → "Sadece Görsel" olarak işaretle
                            const finalTxt = txt.length > 2 ? txt : (imgs.length > 0 ? '[Sadece Görsel]' : '');
                            if (finalTxt && !comments.includes(finalTxt)) {
                                comments.push(finalTxt);
                                detailedReviews.push({ text: finalTxt, images: imgs });
                            }
                        }
                    });
                    if (comments.length > 0) break;
                }
            }
        }

        // ========== 3. DOM'dan Puan ==========
        if (score === 0) {
            const scoreEls = [
                // Trendyol
                '.pr-in-rnr-v', '.pr-rnr-p-s', '.rnr-avg-rnr-v',
                // Hepsiburada
                '[class*="RatingPointer"]', '[class*="ratingPointer"]',
                '[itemprop="ratingValue"]',
            ];
            for (const sel of scoreEls) {
                const el = document.querySelector(sel);
                if (el) {
                    const text = (el.getAttribute('content') || el.innerText || '').trim().replace(',', '.');
                    const val = parseFloat(text);
                    if (val > 0 && val <= 5) { score = val; debug_source = 'DOM:' + sel; break; }
                }
            }
        }

        // ========== 4. DOM'dan Değerlendirme Sayısı ==========
        if (ratingsCount === 0) {
            const countEls = [
                'a.reviews-summary-reviews-detail b',
                '.rvw-cnt-tx',
                '.total-review-count',
                // Hepsiburada
                '[class*="ReviewSummary"] [class*="count"]',
                '[itemprop="ratingCount"]',
                '[itemprop="reviewCount"]',
            ];
            for (const sel of countEls) {
                const el = document.querySelector(sel);
                if (el) {
                    const text = el.getAttribute('content') || el.innerText || '';
                    const m = text.match(/(\d[\d.]*)/);
                    if (m) { ratingsCount = parseInt(m[1].replace(/\./g, '')); break; }
                }
            }
        }

        // ========== 5. Hepsiburada: utagData global objesi ==========
        if (isHepsiburada && (score === 0 || ratingsCount === 0)) {
            try {
                // Hepsiburada sayfalarında window.utagData objesi bulunabilir
                const scripts = document.querySelectorAll('script');
                for (const script of scripts) {
                    const text = script.textContent || '';
                    // review_count ve review_rate içeren script'i bul
                    if (text.includes('review_count') || text.includes('review_rate')) {
                        const rateMatch = text.match(/["']?review_rate["']?\s*[:=]\s*["']?([\d.,]+)/);
                        const countMatch = text.match(/["']?review_count["']?\s*[:=]\s*["']?(\d[\d.]*)/);
                        if (rateMatch && score === 0) {
                            const val = parseFloat(rateMatch[1].replace(',', '.'));
                            if (val > 0 && val <= 5) { score = val; debug_source = 'HB:utagData'; }
                        }
                        if (countMatch && ratingsCount === 0) {
                            ratingsCount = parseInt(countMatch[1].replace(/\./g, ''));
                        }
                        break;
                    }
                }
            } catch(e) {}
        }

        // ========== 6. JSON-LD ==========
        if (score === 0 || ratingsCount === 0) {
            document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
                try {
                    const raw = script.textContent;
                    if (!raw) return;
                    const data = JSON.parse(raw);
                    const check = (item) => {
                        if (item && item.aggregateRating) {
                            if (!score) {
                                const val = parseFloat(item.aggregateRating.ratingValue || 0);
                                if (val > 0 && val <= 5) { score = val; debug_source = 'JSON-LD'; }
                            }
                            if (!ratingsCount) ratingsCount = parseInt(item.aggregateRating.ratingCount || item.aggregateRating.reviewCount || 0);
                        }
                    };
                    if (Array.isArray(data)) data.forEach(check);
                    else check(data);
                } catch(e) {}
            });
        }

        // ========== 7. Sayfa Metninden Regex (Fallback) ==========
        if (score === 0) {
            const patterns = [
                /Tüm Değerlendirmeler[\s\S]{0,5}(\d[.,]?\d)/i,
                /(\d[.,]\d)[\s\S]{0,30}Değerlendirme/i,
                /(\d[.,]\d)\s*[★☆⭐·|]/,
                /(\d[.,]\d)\s*(?:puan|yıldız|\(|\/\s*5)/i,
            ];
            for (const pat of patterns) {
                const m = bodyText.match(pat);
                if (m) {
                    let val = parseFloat(m[1].replace(',', '.'));
                    if (val >= 1 && val <= 5.0) {
                        score = val;
                        debug_source = 'REGEX';
                        break;
                    }
                }
            }
        }
        
        // Değerlendirme sayısı: "1.488 değerlendirme" veya HB tab: "Değerlendirmeler 3228"
        if (ratingsCount === 0) {
            const ratingPatterns = [
                /(\d[\d.]*)\s*(?:değerlendirme|oy|rating)/i,
                /[Dd]eğerlendirme(?:ler)?\s+(\d[\d.]*)/,
            ];
            for (const pat of ratingPatterns) {
                const m = bodyText.match(pat);
                if (m) {
                    const raw = m[1] || m[2];
                    if (raw) { ratingsCount = parseInt(raw.replace(/\./g, '')); break; }
                }
            }
        }
        
        // YORUM sayısı (yazılı): "789 yorum" veya "Yorumlar (789)" vb.
        if (commentCount === 0 && !window.__hb_done) {
            const patterns = [
                /(\d[\d.]*)\s*[Yy]orum/,
                /[Yy]orum(?:lar)?\s*\(?(\d[\d.]*)\)?/,
                /(\d[\d.]*)\s*(?:yorum|review|comment)/i,
            ];
            for (const pat of patterns) {
                const m = bodyText.match(pat);
                if (m) {
                    // Capture group 1 veya 2'yi kontrol et (bazı regex'lerde group 2 olabilir)
                    const raw = m[1] || m[2];
                    if (raw) {
                        const val = parseInt(raw.replace(/\./g, ''));
                        if (val > 0 && val !== ratingsCount) {
                            commentCount = val;
                            break;
                        }
                    }
                }
            }
        }

// Decepta AI - DOM Extractor v8.3
// Hepsiburada Kesin Çözüm - v1.3.2

        // ========== HEPSİBURADA: KESİN AYIKLAMA (v8.3) ==========
        if (isHepsiburada) {
            let hbPhotoCount = 0;
            let hbSuccess = false;
            
            // 1. ADIM: DOM Butonları ve Tablar (En doğru ve görünür kaynak)
            // Sayfadaki "Yorumlar (26)" ve "Fotoğraflı Yorumlar (4)" metinlerini ara
            const allElements = document.querySelectorAll('button, a, span, b');
            for (const el of allElements) {
                const txt = el.innerText.trim();
                
                // Yorum Sayısı: "Yorumlar (26)"
                if (!hbSuccess || commentCount === 0) {
                    const m = txt.match(/Yorum(?:lar)?\s*\((\d+)\)/i);
                    if (m) {
                        commentCount = parseInt(m[1]);
                        hbSuccess = true;
                    }
                }
                
                // Fotoğraf Sayısı: "Fotoğraflı Yorumlar (4)" veya "Fotoğraflı (4)"
                if (hbPhotoCount === 0) {
                    const m = txt.match(/Foto(?:ğ|g)rafl[ıi](?:\s*Yorumlar)?\s*\((\d+)\)/i);
                    if (m) {
                        hbPhotoCount = parseInt(m[1]);
                    }
                }
            }

            // 2. ADIM: Script Verisi (Eğer butonlardan bulunamadıysa)
            if (!hbSuccess || hbPhotoCount === 0) {
                const scripts = document.querySelectorAll('script');
                for (let i = 0; i < scripts.length; i++) {
                    const txt = scripts[i].textContent || '';
                    if (txt.includes('__HB_REVIEWS_INITIAL_STATE__')) {
                        try {
                            const jsonMatch = txt.match(/__HB_REVIEWS_INITIAL_STATE__\s*=\s*(\{.*\})(?:;|$)/);
                            if (jsonMatch) {
                                const state = JSON.parse(jsonMatch[1]);
                                if (!ratingsCount && state.ratingSummary?.totalReviewCount) {
                                    ratingsCount = parseInt(state.ratingSummary.totalReviewCount);
                                }
                                if (!hbSuccess && state.productReviews?.totalReviewCount) {
                                    commentCount = parseInt(state.productReviews.totalReviewCount);
                                    hbSuccess = true;
                                }
                                if (hbPhotoCount === 0) {
                                    hbPhotoCount = state.mediaSummary?.approvedMediaReviewCount || state.productReviews?.mediaCount || 0;
                                }
                            }
                        } catch (e) {}
                        break;
                    }
                }
            }

            // 3. ADIM: Fallback - Pagination Metni (Sadece güvenli olanlar)
            if (!hbSuccess || commentCount === 0) {
                const pagText = bodyText.match(/toplam\s*(\d+)\s*yorum/i) || bodyText.match(/(\d+)\s*yorumlu/i);
                if (pagText) {
                    commentCount = parseInt(pagText[1]);
                    hbSuccess = true;
                }
            }

            // 4. ADIM: Fotoğraf Sayma (DOM Fallback)
            if (hbPhotoCount === 0) {
                const gallery = document.querySelector('[class*="ImageGallery"], [class*="media-gallery"]');
                if (gallery) {
                    hbPhotoCount = gallery.querySelectorAll('img').length;
                }
            }

            // 5. ADIM: Mantıksal Doğrulama (363 gibi saçma rakamları engelle)
            // Değerlendirme sayısı (53) her zaman Yorum sayısından (26) büyük veya eşit olmalıdır.
            if (ratingsCount > 0 && commentCount > ratingsCount) {
                // Eğer yorum sayısı değerlendirmeden fazlaysa, kesin bir hata vardır.
                // Bu durumda script'teki productReviews bloğunu tekrar zorla çekmeye çalış.
                commentCount = ratingsCount; // Geçici olarak eşitle
            }

            if (hbPhotoCount > 0) window.__hb_photoCount = hbPhotoCount;
            
            // Sonuçları hazırla ve ERKEN DÖN (Böylece Section 7 regexleri çalışmaz)
            const hbResult = {
                extracted_data: {
                    score: score || 0,
                    total_ratings: ratingsCount || 0,
                    total_reviews: commentCount || 0,
                    comments: comments,
                    detailed_reviews: detailedReviews,
                    photo_reviews_count: hbPhotoCount || 0,
                    debug_source: 'HB:V8.3'
                },
                html: document.documentElement.outerHTML,
                text: bodyText
            };
            return hbResult;
        }
        
        // Fallback (sadece Trendyol vb. için — HB zaten yukarıda ele alındı)
        if (commentCount === 0 && !isHepsiburada) commentCount = comments.length;

        // ========== FOTOĞRAFLI YORUM SAYISI ==========
        let photoReviewsCount = 0;
        
        if (isHepsiburada) {
            // HB: Yalnızca güvenilir kaynaklardan (buton veya script) alınan değeri kullan
            if (typeof window.__hb_photoCount !== 'undefined') {
                photoReviewsCount = window.__hb_photoCount;
            }
            // HB için DOM taraması (galeri, img sayma vb.) YAPILMIYOR.
        } else {
            // Yöntem 1: __NEXT_DATA__ içinden bulunduysa (Sadece Trendyol vb. için)
            if (typeof window.__ndPhotoCount !== 'undefined') {
                photoReviewsCount = window.__ndPhotoCount;
            }
            
            // Trendyol + genel fallback
            if (photoReviewsCount === 0) {
                const photoPatterns = [
                    /[Ff]oto(?:ğ|g)rafl[ıi]\s*\(?(\d[\d.]*)\)?/,
                    /(\d[\d.]*)\s*(?:adet\s*)?fotoğraflı/i,
                ];
                for (const pat of photoPatterns) {
                    const m = bodyText.match(pat);
                    if (m) { photoReviewsCount = parseInt(m[1].replace(/\./g, '')); break; }
                }
            }
        }
        
        // Yöntem A: detailedReviews içinden (Sadece Trendyol kart içi görseller)
        if (photoReviewsCount === 0 && !isHepsiburada) {
            photoReviewsCount = detailedReviews.filter(r => r.images && r.images.length > 0).length;
        }

        // ========== MANTIK KONTROLÜ ==========
        // Fotoğraflı yorum sayısı, toplam yorum veya değerlendirme sayısından fazla olamaz
        const maxReasonable = Math.max(commentCount, ratingsCount);
        if (maxReasonable > 0 && photoReviewsCount > maxReasonable) {
            photoReviewsCount = Math.min(photoReviewsCount, maxReasonable);
        }

        // ========== SONUÇ ==========
        if (!debug_source) debug_source = 'BULUNAMADI';
        const result = {
            extracted_data: {
                score: score || 0,
                total_ratings: ratingsCount || 0,
                total_reviews: commentCount,
                comments: comments,
                detailed_reviews: detailedReviews,
                photo_reviews_count: photoReviewsCount,
                debug_source: debug_source
            },
            html: document.documentElement.outerHTML,
            text: bodyText
        };
        
        console.log('[Decepta AI v7] Sonuç:', JSON.stringify(result.extracted_data, null, 2));
        return result;
        
    } catch (e) {
        console.error('[Decepta AI] Hata:', e);
        return { 
            error: e.message,
            html: document.documentElement.outerHTML, 
            text: document.body.innerText, 
            extracted_data: { score: 0, total_ratings: 0, total_reviews: 0, comments: [], detailed_reviews: [], photo_reviews_count: 0 } 
        };
    }
})();

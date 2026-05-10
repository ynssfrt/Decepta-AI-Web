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
        if (commentCount === 0) {
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

        // ========== HEPSİBURADA: YORUM SAYISI ==========
        if (isHepsiburada) {
            // __NEXT_DATA__'dan yanlışlıkla gelen diğer ürünlerin sayısını (örn. 29) yoksay ve sıfırla.
            // Çünkü Hepsiburada'da asıl veriler __HB_REVIEWS_INITIAL_STATE__ içindedir.
            commentCount = 0;
            let hbSuccess = false;
            
            if (typeof window.__hb_commentCount !== 'undefined') {
                commentCount = window.__hb_commentCount;
                hbSuccess = true;
            } else {
                // YÖNTEM 1: Sayfadaki <script> tag'lerinin orijinal metni (DOM) üzerinden veriyi oku.
                // Bu yöntem CSP (Content Security Policy) hatası vermez ve sayfa window objesini silse bile çalışır.
                const scripts = document.querySelectorAll('script');
                for (let i = 0; i < scripts.length; i++) {
                    const txt = scripts[i].textContent || '';
                    // Sadece ana ürünün verilerini tutan özel script bloklarında arama yap
                    if (txt.includes('__HB_REVIEWS_INITIAL_STATE__')) {
                        const totalMatch = txt.match(/["']?(?:totalReviewCount|customerReviewCount|totalItemCount)["']?\s*:\s*(\d+)/);
                        if (totalMatch) {
                            commentCount = parseInt(totalMatch[1]);
                            hbSuccess = true;
                        }
                        
                        const mediaMatch = txt.match(/["']?(?:approvedMediaReviewCount|withMediaCount|photoReviewCount)["']?\s*:\s*(\d+)/);
                        if (mediaMatch) window.__hb_photoCount = parseInt(mediaMatch[1]);
                        
                        if (hbSuccess) break;
                    }
                }
            }
            
            // Eğer asıl veritabanından çekilemediyse fallback'e düş
            if (!hbSuccess) {
                // Diğer ürünlerin istatistiklerini almamak için sadece yorum bölgesini veya ana içeriği tara
                let safeText = bodyText;
                const reviewContainer = document.querySelector('[class*="ReviewList"], [class*="hermes-Review"], [id*="reviews"], [class*="Comments"]');
                if (reviewContainer) {
                    safeText = reviewContainer.innerText || '';
                } else {
                    const cutoff = safeText.search(/Benzer Ürünler|Önerilenler|Bunları da beğenebilirsiniz|Müşteriler bunları da aldı/i);
                    if (cutoff > 0) safeText = safeText.substring(0, cutoff);
                }
                
                const yorumPatterns = [
                    /[Yy]orum(?:lu|lar)?\s*\(?(\d[\d.]*)\)?/,
                    /(\d[\d.]*)\s*[Yy]orum/i
                ];
                for (const pat of yorumPatterns) {
                    const m = safeText.match(pat);
                    if (m) {
                        commentCount = parseInt(m[1].replace(/\./g, ''));
                        break;
                    }
                }
                
                if (commentCount === 0) {
                    const reviewCards = document.querySelectorAll('[class*="ReviewCard-module"], [class*="hermes-ReviewCard"]');
                    let withText = 0;
                    reviewCards.forEach(card => {
                        const allText = (card.innerText || '').trim();
                        if (allText.length > 60) withText++;
                    });
                    if (withText > 0) commentCount = withText;
                }
                
                if (commentCount === 0) {
                    commentCount = comments.filter(c => c !== '[Sadece Görsel]' && c.length > 5).length;
                }
                
                if (commentCount === 0 && ratingsCount > 0) {
                    commentCount = comments.length > 0 ? comments.length : ratingsCount;
                }
            }
        }
        
        // Fallback
        if (commentCount === 0) commentCount = comments.length;

        // ========== FOTOĞRAFLI YORUM SAYISI ==========
        let photoReviewsCount = 0;
        
        if (isHepsiburada) {
            // HB: Script içerisinden okunduysa (NEXT_DATA'dan gelen veriyi yoksay)
            if (typeof window.__hb_photoCount !== 'undefined') {
                photoReviewsCount = window.__hb_photoCount;
            }
            
            // HB: bodyText'ten fallback
            if (photoReviewsCount === 0) {
                let safeText = bodyText;
                const reviewContainer = document.querySelector('[class*="ReviewList"], [class*="hermes-Review"], [id*="reviews"], [class*="Comments"]');
                if (reviewContainer) {
                    safeText = reviewContainer.innerText || '';
                } else {
                    const cutoff = safeText.search(/Benzer Ürünler|Önerilenler|Bunları da beğenebilirsiniz|Müşteriler bunları da aldı/i);
                    if (cutoff > 0) safeText = safeText.substring(0, cutoff);
                }
                
                const fotoPatterns = [
                    /[Ff]oto(?:ğ|g)rafl[ıi]\s*(?:Yorum(?:lar)?\s*)?\(?(\d[\d.]*)\)?/,
                    /(\d[\d.]*)\s*(?:adet\s*)?fotoğraflı/i
                ];
                for (const pat of fotoPatterns) {
                    const m = safeText.match(pat);
                    if (m) {
                        photoReviewsCount = parseInt(m[1].replace(/\./g, ''));
                        break;
                    }
                }
            }
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
        
        // Yöntem A: detailedReviews içinden (Trendyol kart içi görseller)
        if (photoReviewsCount === 0) {
            photoReviewsCount = detailedReviews.filter(r => r.images && r.images.length > 0).length;
        }
        
        // Yöntem B: Hepsiburada "Kullanıcı fotoğraf ve videoları" galerisi
        if (photoReviewsCount === 0) {
            // HB'de fotoğraflar yorum kartlarının dışında ayrı bir galeri bölümünde gösteriliyor
            // Bu galeri genellikle "Kullanıcı fotoğraf" başlığı altında
            
            // Galeri container'ını bul (class*="MediaGallery" veya "userMedia" veya başlıktan)
            const gallerySelectors = [
                '[class*="MediaGallery"]',
                '[class*="mediaGallery"]', 
                '[class*="user-media"]',
                '[class*="userMedia"]',
                '[class*="CustomerMedia"]',
                '[class*="customerMedia"]',
                '[class*="review-media-gallery"]',
            ];
            
            let galleryEl = null;
            for (const sel of gallerySelectors) {
                galleryEl = document.querySelector(sel);
                if (galleryEl) break;
            }
            
            // Galeri bulunamadıysa "Kullanıcı fotoğraf" başlığını ara
            if (!galleryEl) {
                const allHeadings = document.querySelectorAll('h2, h3, h4, div, span');
                for (const heading of allHeadings) {
                    const text = (heading.innerText || '').trim();
                    if (text.match(/kullanıcı\s*(fotoğraf|foto|medya)/i) || text.match(/müşteri\s*(fotoğraf|foto)/i)) {
                        // Başlığın parent veya sibling container'ını al
                        galleryEl = heading.parentElement;
                        break;
                    }
                }
            }
            
            if (galleryEl) {
                // Galeri içindeki görselleri say
                const galleryImgs = galleryEl.querySelectorAll('img');
                const uniqueGallerySrcs = new Set();
                galleryImgs.forEach(img => {
                    const src = img.src || img.dataset?.src || '';
                    if (src && !src.startsWith('data:') && !src.includes('avatar') && !src.includes('icon')) {
                        // Küçük ikonları dışla
                        const w = img.naturalWidth || img.width || 100;
                        if (w >= 40) {
                            uniqueGallerySrcs.add(src);
                        }
                    }
                });
                photoReviewsCount = uniqueGallerySrcs.size;
            }
        }
        
        // Yöntem C: Genel fallback — sayfadaki tüm yorum bölgesinde görsel ara
        if (photoReviewsCount === 0) {
            // Sayfadaki "yorum" veya "review" class'lı bölgelerdeki görselleri say
            const reviewSections = document.querySelectorAll('[class*="review"] img, [class*="Review"] img, [class*="rvw"] img, [class*="comment"] img, [class*="Comment"] img');
            const uniqueSrcs = new Set();
            reviewSections.forEach(img => {
                const src = img.src || '';
                if (src && !src.includes('avatar') && !src.includes('star') && !src.includes('icon') && !src.includes('svg') && !src.startsWith('data:')) {
                    const w = img.naturalWidth || img.width || 100;
                    if (w >= 40) {
                        uniqueSrcs.add(src);
                    }
                }
            });
            if (uniqueSrcs.size > 0) {
                photoReviewsCount = uniqueSrcs.size;
            }
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

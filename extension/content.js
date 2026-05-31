// Decepta AI - DOM Extractor v8
// Trendyol: /yorumlar sayfası (auto-scroll sonrası tam sayım)
// Hepsiburada: -yorumlari sayfası (pagination destekli foto sayımı)
// Değerlendirme (yıldız) ve Yorum (yazılı) sayıları ayrı ayrı çekilir
(() => {
    try {
        const url = window.location.href;
        const bodyText = document.body.innerText;
        const isTrendyol = url.includes('trendyol.com');
        const isHepsiburada = url.includes('hepsiburada.com');
        const isN11 = url.includes('n11.com');
        
        let score = 0;
        let ratingsCount = 0;
        let commentCount = 0;
        let comments = [];
        let detailedReviews = [];
        let debug_source = '';

        const isReviewPhoto = (img) => {
            const src = img.src || img.dataset?.src || '';
            if (!src || src.startsWith('data:')) return false;
            
            const lowerSrc = src.toLowerCase();
            
            // Platform bazlı güvenli kaynak (whitelist) ön filtreleme kontrolü
            if (isHepsiburada) {
                if (!(lowerSrc.includes('usercontents') || lowerSrc.includes('review-images'))) return false;
            } else if (isTrendyol) {
                if (!(lowerSrc.includes('dsmcdn.com') || lowerSrc.includes('ty-images.com') || lowerSrc.includes('review-images') || lowerSrc.includes('usercontents'))) return false;
            } else if (isN11) {
                if (!(lowerSrc.includes('n11scdn') || lowerSrc.includes('akamaized.net') || lowerSrc.includes('n11images.com') || lowerSrc.includes('review-images') || lowerSrc.includes('usercontents'))) return false;
            }
            
            // Küçük ikonları, yıldızları, avatarları ve kullanıcı arayüzü elemanlarını kesinlikle dışla
            const excludePatterns = ['avatar', 'star', 'icon', 'svg', 'badge', 'logo', 'emoji', 'placeholder', 'thumbs'];
            if (excludePatterns.some(p => lowerSrc.includes(p))) return false;
            
            // Çok küçük görselleri dışla (genelde yıldız veya arayüz ikonu olurlar)
            const w = img.naturalWidth || img.width || 0;
            const h = img.naturalHeight || img.height || 0;
            if ((w > 0 && w < 40) || (h > 0 && h < 40)) return false;
            return true;
        };

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
                                
                                if (typeof txt === 'string' && txt.length > 0) {
                                    const cleanTxt = txt.trim();
                                    comments.push(cleanTxt);
                                    detailedReviews.push({ text: cleanTxt, images: imgs });
                                }
                            });
                        }
                    }
                    if (comments.length > 0) break;
                }
            } catch(e) {}
        }

        // ========== 2. DOM'dan Yorum Metinleri & Görseller ==========
        if (comments.length === 0 && isN11) {
            try {
                const cards = document.querySelectorAll('.review-cart-wrapper__list > .review-card, .review-cart-wrapper__list > .card-wrapper, .card-wrapper.review-card.rounded');
                cards.forEach(el => {
                    const textEl = el.querySelector('.card-detail__contents');
                    const txt = textEl ? textEl.innerText.trim() : "";
                    
                    const imgs = [];
                    el.querySelectorAll('img').forEach(img => {
                        if (isReviewPhoto(img)) {
                            const src = img.src || img.dataset?.src;
                            if (src && !imgs.includes(src)) imgs.push(src);
                        }
                    });
                    
                    if (txt.length > 0) {
                        comments.push(txt);
                        detailedReviews.push({ text: txt, images: imgs });
                    } else if (imgs.length > 0) {
                        detailedReviews.push({ text: "", images: imgs });
                    }
                });
            } catch(e) {
                console.error("n11 DOM comments extraction error:", e);
            }
        }

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
                '#hermes-voltran-comments [class*="ReviewCard"]',
                '.paginationContentHolder [class*="ReviewCard"]',
                '[class*="ReviewList"] [class*="ReviewCard"]',
                '[class*="hermes-ReviewCard-module"]',
                '[class*="ReviewCard"]',
                // n11 Yorum Seçicileri
                '.comment',
                '.commentDetail',
                'li.comment',
                '.review-card',
                '.card-wrapper.review-card'
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
                            'span[style*="text-align"]',
                            'span:not([class])',
                            '[class*="ReviewCard-module"] p',
                            '[class*="ReviewCard"] span[style*="text-align:start"]:not([class])',
                            'span[style*="text-align:start"]:not([class])',
                            // n11 Yorum Metni Seçicileri
                            '.card-detail__contents',
                            '.commentText',
                            '.commentDetail p',
                            'p',
                        ];
                        let txt = "";
                        for (const tsel of textSelectors) {
                            const textEl = el.querySelector(tsel);
                            if (textEl && textEl.innerText.trim().length > 0) {
                                txt = textEl.innerText.trim();
                                break;
                            }
                        }
                        
                        // Görselleri bul — kullanıcının yüklediği ürün fotoğrafları
                        const imgs = [];
                        el.querySelectorAll('img').forEach(img => {
                            if (isReviewPhoto(img)) {
                                const src = img.src || img.dataset?.src;
                                if (src && !imgs.includes(src)) {
                                    imgs.push(src);
                                }
                            }
                        });

                        if (txt.length > 0) {
                            comments.push(txt);
                            detailedReviews.push({ text: txt, images: imgs });
                        } else if (imgs.length > 0) {
                            // Metin yok ama gerçek görsel var -> comments listesine "[Sadece Görsel]" eklemiyoruz 
                            // (arka plandaki duplicate/kopya bot analizini bozmasın), detailedReviews'e boş metinle ekliyoruz
                            detailedReviews.push({ text: "", images: imgs });
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
                // n11 puan seçicileri
                '.ratingText',
                '.ratingCont .rating',
                '.proDetailArea .ratingText'
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
                // n11 değerlendirme sayısı seçicileri
                '.reviewNum',
                '.reviewCount',
                'a[href="#reviews"] span',
                '.selected[href="#reviews"] span'
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

        // ========== HEPSİBURADA: Yorum sayısı ==========
        // DİKKAT: HB yıldız-only değerlendirmeler için de ReviewCard render eder!
        // Gerçek yorum sayısı popup.js tarafından tüm sayfalar taranarak override edilir.
        // Burada sadece mevcut sayfadaki metinli kartları sayıyoruz (başlangıç değeri).
        if (isHepsiburada && commentCount === 0) {
            const allCards = document.querySelectorAll('[class*="ReviewCard"]');
            const cards = Array.from(allCards).filter(card => {
                return !card.parentElement?.className?.includes('ReviewCard');
            });
            let textCardCount = 0;
            cards.forEach(card => {
                const userNameEl = card.querySelector('meta[content]');
                const userName = userNameEl ? userNameEl.getAttribute('content').trim() : '';

                let reviewDate = '';
                const spanEls = card.querySelectorAll('span[content]');
                for (const span of spanEls) {
                    const contentVal = span.getAttribute('content') || '';
                    if (contentVal.includes('-') && contentVal.length === 10) {
                        reviewDate = contentVal.trim();
                        break;
                    }
                }

                if (!userName && !reviewDate) return;

                const textSelectors = [
                    '[itemprop="description"]',
                    '[class*="review-comment"]',
                    '[class*="ReviewCard-module"] p',
                    'span[style*="text-align:start"]:not([class])',
                    'p'
                ];
                let hasText = false;
                for (const sel of textSelectors) {
                    const textEl = card.querySelector(sel);
                    if (textEl && textEl.innerText.trim().length > 0) {
                        hasText = true;
                        break;
                    }
                }
                
                // Yorumun en az bir adet fotoğraf içerdiğini doğrulamak için tırnak genişlik/yükseklik seçicilerini kontrol et
                const h64Count = card.querySelectorAll('[height="64px"]').length;
                const w80Count = card.querySelectorAll('[width="80"]').length;
                let hasPhoto = h64Count > 0 || w80Count > 0;
                if (!hasPhoto) {
                    card.querySelectorAll('img').forEach(img => {
                        const src = img.src || img.dataset?.src || '';
                        if (src.includes('usercontents') || src.includes('review-images')) hasPhoto = true;
                    });
                }
                
                if (hasText || hasPhoto) textCardCount++;
            });
            if (textCardCount > 0) commentCount = textCardCount;
        }
        
        // Yorum sayısı asla değerlendirme sayısını geçemez
        if (commentCount > 0 && ratingsCount > 0 && commentCount > ratingsCount) {
            commentCount = ratingsCount;
        }
        
        // Fallback: commentCount bulunamadıysa, DOM'daki yorum adedini kullan
        if (commentCount === 0) commentCount = comments.length;

        // ========== 7.5. n11 Özel İstatistik Çekimi ==========
        if (isN11) {
            try {
                const scoreEl = document.querySelector('span.product-review-statistics-score__big');
                if (scoreEl) {
                    const val = parseFloat(scoreEl.innerText.trim());
                    if (val > 0 && val <= 5) {
                        score = val;
                        debug_source = 'DOM:n11-statistics-score';
                    }
                }
                const ratingsEl = document.querySelector('p.product-review-statistics__review-desc');
                if (ratingsEl) {
                    ratingsCount = parseInt(ratingsEl.innerText.replace(/\D/g, ''));
                }
                const commentEl = document.querySelector('span.product-review-statistics__review-desc');
                if (commentEl) {
                    commentCount = parseInt(commentEl.innerText.replace(/\D/g, ''));
                }
            } catch(e) {
                console.error("n11 statistics extraction error:", e);
            }
        }

        // ========== 8. FOTOĞRAFLI YORUM SAYISI ==========
        // NOT: popup.js'den önce:
        //   - Trendyol: /yorumlar sayfasına yönlendirilmiş + auto-scroll yapılmış
        //   - Hepsiburada: -yorumlari sayfasına yönlendirilmiş (popup.js pagination ile tüm sayfaları ayrıca tarar)
        let photoReviewsCount = 0;
        
        // Yöntem A: detailedReviews içinden (Trendyol: scroll sonrası tam yüklü kartlar)
        photoReviewsCount = detailedReviews.filter(r => r.images && r.images.length > 0).length;
        
        // Yöntem B: HB özel — React thumbnail varlığı veya fallback resim kontrolü
        if (photoReviewsCount === 0 && isHepsiburada) {
            const allCards = document.querySelectorAll('[class*="ReviewCard"]');
            const cards = Array.from(allCards).filter(card => {
                return !card.parentElement?.className?.includes('ReviewCard');
            });
            cards.forEach(card => {
                const userNameEl = card.querySelector('meta[content]');
                const userName = userNameEl ? userNameEl.getAttribute('content').trim() : '';

                let reviewDate = '';
                const spanEls = card.querySelectorAll('span[content]');
                for (const span of spanEls) {
                    const contentVal = span.getAttribute('content') || '';
                    if (contentVal.includes('-') && contentVal.length === 10) {
                        reviewDate = contentVal.trim();
                        break;
                    }
                }

                if (!userName && !reviewDate) return;

                // Yorumun en az bir adet fotoğraf içerdiğini doğrulamak için tırnak genişlik/yükseklik seçicilerini kontrol et
                const h64Count = card.querySelectorAll('[height="64px"]').length;
                const w80Count = card.querySelectorAll('[width="80"]').length;
                let hasPhoto = h64Count > 0 || w80Count > 0;
                if (!hasPhoto) {
                    card.querySelectorAll('img').forEach(img => {
                        const src = img.src || img.dataset?.src || '';
                        if (src.includes('usercontents') || src.includes('review-images')) hasPhoto = true;
                    });
                }
                if (hasPhoto) {
                    photoReviewsCount++;
                }
            });
        }
        // Yöntem B.5: n11 özel — Yorum kartlarını tara ve fotoğraflı olanları say
        if (photoReviewsCount === 0 && isN11) {
            try {
                const cards = document.querySelectorAll('.review-cart-wrapper__list > .review-card, .review-cart-wrapper__list > .card-wrapper, .card-wrapper.review-card.rounded');
                cards.forEach(card => {
                    const imgs = card.querySelectorAll('img');
                    const hasPhoto = Array.from(imgs).some(isReviewPhoto);
                    if (hasPhoto) photoReviewsCount++;
                });
            } catch(e) {
                console.error("n11 photo counting error:", e);
            }
        }

        // Yöntem C: Trendyol — yorum kartlarını tek tek tara (img element kontrolü)
        if (photoReviewsCount === 0 && !isHepsiburada) {
            const reviewCardSelectors = [
                '.rnr-com-w',
                '.pr-rvw-crd',
                '[class*="review-card"]',
                '[class*="reviewCard"]',
                '.review',
            ];
            
            for (const sel of reviewCardSelectors) {
                const cards = document.querySelectorAll(sel);
                if (cards.length > 0) {
                    cards.forEach(card => {
                        const imgs = card.querySelectorAll('img');
                        const hasPhoto = Array.from(imgs).some(isReviewPhoto);
                        if (hasPhoto) photoReviewsCount++;
                    });
                    break;
                }
            }
        }
        
        // Yöntem D: Genel fallback — tüm yorum bölgelerinde görsel ara
        if (photoReviewsCount === 0) {
            const uniqueSrcs = new Set();
            document.querySelectorAll('[class*="review"] img, [class*="Review"] img, [class*="rvw"] img, [class*="comment"] img, [class*="Comment"] img').forEach(img => {
                if (isReviewPhoto(img)) {
                    const src = img.src || '';
                    if (src) uniqueSrcs.add(src);
                }
            });
            if (uniqueSrcs.size > 0) photoReviewsCount = uniqueSrcs.size;
        }

        // Yöntem E: HB özel — sayfa script'indeki template URL'lerinden fotoğraf sayısı
        // ReactVirtualized lazy-load nedeniyle DOM'da görünmeyen fotoğraflar için.
        // Hepsiburada review sayfası, usercontents/s/0/{size}/uuid.jpg URL'lerini
        // script state'ine önceden gömüyor — her eşsiz UUID bir kullanıcı fotoğrafı.
        if (photoReviewsCount === 0 && isHepsiburada) {
            try {
                const html = document.documentElement.innerHTML;
                const matches = html.match(/usercontents\/s\/0\/\{size\}\/([a-f0-9-]+)\.jpg/g) || [];
                const uniqueIds = new Set(matches.map(m => m.split('/').pop()));
                if (uniqueIds.size > 0) photoReviewsCount = uniqueIds.size;
            } catch(e) {}
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
        
        console.log('[Decepta AI v8] Sonuç:', JSON.stringify(result.extracted_data, null, 2));
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

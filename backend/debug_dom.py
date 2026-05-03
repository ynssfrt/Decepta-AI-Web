import asyncio
from playwright.async_api import async_playwright

async def debug():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()
        
        print("Sayfaya gidiliyor...")
        await page.goto("https://www.trendyol.com/apple/iphone-13-128gb-yildiz-isigi-cep-telefonu-apple-turkiye-garantili-p-154946658", wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_timeout(8000)
        
        # Scroll down to load comments
        for i in range(5):
            await page.evaluate(f"window.scrollTo(0, document.body.scrollHeight * {(i+1)/5})")
            await page.wait_for_timeout(1000)
        
        print("\n=== DEBUG: DOM Analizi ===\n")
        
        result = await page.evaluate("""() => {
            const r = {};
            
            // 1. __NEXT_DATA__ var mı?
            const nd = document.getElementById('__NEXT_DATA__');
            r.hasNextData = !!nd;
            if (nd) {
                try {
                    const data = JSON.parse(nd.textContent);
                    const findAll = (obj, key, found, depth) => {
                        if (!obj || typeof obj !== 'object' || depth > 10) return;
                        if (key in obj) found.push(obj[key]);
                        for (const k of Object.keys(obj)) findAll(obj[k], key, found, depth+1);
                    };
                    const scores=[]; findAll(data,'ratingScore',scores,0);
                    const counts=[]; findAll(data,'ratingCount',counts,0);
                    const totals=[]; findAll(data,'totalRatingCount',totals,0);
                    const reviewCounts=[]; findAll(data,'reviewCount',reviewCounts,0);
                    r.nd_ratingScore = scores;
                    r.nd_ratingCount = counts;
                    r.nd_totalRatingCount = totals;
                    r.nd_reviewCount = reviewCounts;
                } catch(e) { r.ndError = e.message; }
            }
            
            // 2. JSON-LD
            const jsonlds = [];
            document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
                try { 
                    const d = JSON.parse(s.textContent);
                    if (d.aggregateRating) jsonlds.push(d.aggregateRating);
                    if (Array.isArray(d)) d.forEach(i => { if (i.aggregateRating) jsonlds.push(i.aggregateRating); });
                } catch(e) {}
            });
            r.jsonld_ratings = jsonlds;
            
            // 3. CSS Selectors
            r.sel = {
                'pr-in-rnr-v': document.querySelector('.pr-in-rnr-v')?.innerText || null,
                'pr-rnr-p-s': document.querySelector('.pr-rnr-p-s')?.innerText || null,
                'rvw-cnt-tx': document.querySelector('.rvw-cnt-tx')?.innerText || null,
                'reviews-summary': document.querySelector('a.reviews-summary-reviews-detail')?.innerText || null,
                'rnr-com-tx_count': document.querySelectorAll('.rnr-com-tx').length,
                'comment-text_count': document.querySelectorAll('.comment-text').length,
                'review-text_count': document.querySelectorAll('.review-text').length,
            };
            
            // 4. Regex on body
            const bt = document.body.innerText;
            const sm = bt.match(/(\\d[.,]\\d)\\s*(?:puan|yıldız|\\||\\()/i);
            const cm = bt.match(/(\\d[\\d.]*)\\s*(?:değerlendirme|oy|rating)/i);
            r.regex_score = sm ? sm[0] : null;
            r.regex_count = cm ? cm[0] : null;
            
            // 5. Page title
            r.title = document.title;
            
            return r;
        }""")
        
        import json
        print(json.dumps(result, indent=2, ensure_ascii=False))
        
        await browser.close()

asyncio.run(debug())

import asyncio
from playwright.async_api import async_playwright
import json

async def main():
    async with async_playwright() as p:
        # Launch headfully with automation flags disabled to bypass Hepsiburada's bot protection
        browser = await p.chromium.launch(
            headless=False,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-setuid-sandbox"
            ]
        )
        
        # Create a clean context with custom user agent and viewport
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800}
        )
        page = await context.new_page()
        
        all_reviews = []
        
        for page_num in range(1, 11):
            url = f"https://www.hepsiburada.com/l-or-al-paris-telescopic-extensionist-maskara-hacim-verici-ozellikleriyle-siyah-renk-buyuk-boy-p-HBCV0000C17H5W-yorumlari?sayfa={page_num}"
            print(f"Navigating to page {page_num}...")
            
            try:
                await page.goto(url, wait_until="load", timeout=40000)
                await page.wait_for_timeout(3000) # wait for page mount
                
                # Check for robot/captcha page
                if "robot" in page.url or "captcha" in page.url or await page.locator("text=Doğrulama").count() > 0:
                    print("Encountered bot detection! Please solve it in the headful browser if it appears, or wait.")
                    await page.wait_for_timeout(5000)
                
                # Scroll to bottom slowly to render React virtualized card list
                for i in range(15):
                    await page.mouse.wheel(0, 600)
                    await page.wait_for_timeout(200)
                    
                await page.wait_for_timeout(1000)
                
                # Extract reviews
                reviews = await page.evaluate('''() => {
                    const cards = Array.from(document.querySelectorAll('[class*="ReviewCard"]')).filter(c => {
                        return !c.parentElement?.className?.includes('ReviewCard');
                    });
                    
                    return cards.map((card, idx) => {
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
                        
                        // Text
                        const textSelectors = [
                            '[itemprop="description"]',
                            '[class*="review-comment"]',
                            '[class*="ReviewCard-module"] p',
                            'span[style*="text-align:start"]:not([class])',
                            'p'
                        ];
                        let extractedText = '';
                        for (const sel of textSelectors) {
                            const el = card.querySelector(sel);
                            if (el && el.innerText.trim()) {
                                extractedText = el.innerText.trim();
                                break;
                            }
                        }
                        
                        // Check if it's a real review (must have username and date)
                        if (!userName && !reviewDate) {
                            return null;
                        }
                        
                        // Photos
                        const h64Count = card.querySelectorAll('[height="64px"]').length;
                        const w80Count = card.querySelectorAll('[width="80"]').length;
                        let hasPhoto = h64Count > 0 || w80Count > 0;
                        const imgs = [];
                        card.querySelectorAll('img').forEach(img => {
                            const src = img.src || img.dataset?.src || '';
                            if (src.includes('usercontents') || src.includes('review-images')) {
                                hasPhoto = true;
                                if (!imgs.includes(src)) imgs.push(src);
                            }
                        });
                        
                        return {
                            index: idx,
                            userName,
                            reviewDate,
                            text: extractedText,
                            hasPhoto,
                            imgs,
                            rawText: card.innerText || ''
                        };
                    }).filter(r => r !== null);
                }''')
                
                if not reviews:
                    print(f"No valid review cards found on page {page_num}. Ending loop.")
                    break
                    
                print(f"Found {len(reviews)} valid cards on page {page_num}.")
                for r in reviews:
                    r['page'] = page_num
                    all_reviews.append(r)
                    
            except Exception as e:
                print(f"Error on page {page_num}: {e}")
                break
                
        await browser.close()
        
        # Save to file
        with open("crawled_reviews.json", "w", encoding="utf-8") as f:
            json.dump(all_reviews, f, ensure_ascii=False, indent=2)
            
        print(f"\nCrawling complete. Total valid cards collected: {len(all_reviews)}")

if __name__ == "__main__":
    asyncio.run(main())

import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        print("Launching headful browser...")
        browser = await p.chromium.launch(
            headless=False,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox"
            ]
        )
        
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800}
        )
        page = await context.new_page()
        
        url = "https://www.hepsiburada.com/l-or-al-paris-telescopic-extensionist-maskara-hacim-verici-ozellikleriyle-siyah-renk-buyuk-boy-p-HBCV0000C17H5W-yorumlari?sayfa=4"
        print(f"Navigating to: {url}")
        
        await page.goto(url, wait_until="load", timeout=60000)
        
        print("Waiting 15 seconds for you to solve any captcha if it appears, and for cards to load...")
        await page.wait_for_timeout(15000)
        
        # Scroll to bottom slowly to render React virtualized card list
        print("Scrolling...")
        for i in range(15):
            await page.mouse.wheel(0, 600)
            await page.wait_for_timeout(200)
            
        await page.wait_for_timeout(2000)
        
        # Save HTML and Screenshot for debugging
        html_content = await page.content()
        with open("page4_debug.html", "w", encoding="utf-8") as f:
            f.write(html_content)
        await page.screenshot(path="page4_debug.png")
        print("Debug HTML and screenshot saved.")
        
        # Extract reviews HTML and details
        cards_data = await page.evaluate('''() => {
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
                
                return {
                    index: idx + 1,
                    userName,
                    reviewDate,
                    rawText: (card.innerText || '').trim(),
                    html: card.outerHTML
                };
            });
        }''')
        
        print(f"Found {len(cards_data)} cards on Page 4.")
        
        with open("page4_cards.txt", "w", encoding="utf-8") as f:
            for c in cards_data:
                f.write(f"\n========================================\n")
                f.write(f"CARD {c['index']}: User='{c['userName']}' Date='{c['reviewDate']}'\n")
                f.write(f"RAW TEXT:\n{c['rawText']}\n")
                f.write(f"HTML:\n{c['html']}\n")
                
        print("Cards successfully saved to page4_cards.txt")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())

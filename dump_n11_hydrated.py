import asyncio
from playwright.async_api import async_playwright
import sys

sys.stdout.reconfigure(encoding='utf-8')

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Use a real user-agent to bypass easy bot detection
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        url = "https://www.n11.com/product-reviews/705282320"
        print("Navigating to:", url)
        await page.goto(url, wait_until="networkidle", timeout=30000)
        
        # Wait a bit more for dynamic components
        await page.wait_for_timeout(3000)
        
        # Get elements under review-cart-wrapper__list
        html = await page.content()
        with open("n11_hydrated.html", "w", encoding="utf-8") as f:
            f.write(html)
            
        print("Hydrated HTML dumped to n11_hydrated.html")
        
        # Let's query elements
        cards_count = await page.locator(".review-cart-wrapper__list > *").count()
        print("Number of children under review-cart-wrapper__list:", cards_count)
        
        for i in range(min(cards_count, 3)):
            child_html = await page.locator(f".review-cart-wrapper__list > :nth-child({i+1})").inner_html()
            tag_name = await page.locator(f".review-cart-wrapper__list > :nth-child({i+1})").evaluate("el => el.tagName")
            class_name = await page.locator(f".review-cart-wrapper__list > :nth-child({i+1})").evaluate("el => el.className")
            print(f"\n--- Child {i+1} tag={tag_name} class='{class_name}' ---")
            print(child_html[:1500])

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())

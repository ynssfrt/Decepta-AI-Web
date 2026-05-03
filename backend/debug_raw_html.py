import asyncio
import os
import sys
from bs4 import BeautifulSoup

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../")))
from app.services.scraper import PlaywrightScraper
from playwright.async_api import async_playwright

async def debug_real_browser():
    url = "https://www.trendyol.com/apple/iphone-13-128gb-yildiz-isigi-cep-telefonu-apple-turkiye-garantili-p-154946658"
    
    # Run playwright non-headless to ensure real page loads
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()
        await page.goto(url, wait_until="networkidle")
        
        # Scroll to load comments
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await page.wait_for_timeout(3000)
        
        html = await page.content()
        text = await page.evaluate("document.body.innerText")
        await browser.close()
        
    print(f"Loaded HTML length: {len(html)}")
    
    with open("trendyol_real.html", "w", encoding="utf-8") as f:
        f.write(html)
        
    soup = BeautifulSoup(html, "html.parser")
    with open("trendyol_jsonld.txt", "w", encoding="utf-8") as f:
        for script in soup.find_all("script", type="application/ld+json"):
            f.write(script.string + "\n\n")

if __name__ == "__main__":
    asyncio.run(debug_real_browser())

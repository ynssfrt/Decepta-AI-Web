import asyncio
import logging
from playwright.async_api import async_playwright
import time
import re

url = "https://www.hepsiburada.com/apple-iphone-13-128-gb-p-HBCV00000ODHHV"

async def fetch_hb():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--disable-blink-features=AutomationControlled'])
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080}
        )
        await context.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        page = await context.new_page()
        
        await page.goto(url, wait_until="domcontentloaded", timeout=45000)
        await page.wait_for_timeout(3000)
        
        title = await page.title()
        print("Page Title:", title)
        
        text = await page.evaluate("document.body.innerText")
        html = await page.content()
        print("Text Len:", len(text))
        print("HTML Len:", len(html))
        
        with open("dump_hb_iphone.html", "w", encoding="utf-8") as f:
            f.write(html)
            
        score_match = re.search(r'([1-4][.,][0-9]|5[.,]0)[\s\S]{0,100}(?:değerlendirme|yorum|oy)', text.lower())
        if score_match:
            print("REGEX SCORE:", score_match.group(1))
        else:
            print("REGEX SCORE FAILED")

        num_match = re.search(r'([0-9.,]+)\s+(?:değerlendirme|oy|kişi)', text.lower())
        if num_match:
            print("REGEX RATING NUM:", num_match.group(1))
        else:
            print("REGEX RATING NUM FAILED")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(fetch_hb())

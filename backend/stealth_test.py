import asyncio
import logging
import sys
from playwright.async_api import async_playwright
from playwright_stealth import stealth
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO, stream=sys.stdout)

async def test_stealth(url: str):
    print(f"\n--- Testing URL: {url} ---")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--disable-blink-features=AutomationControlled'])
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080}
        )
        page = await context.new_page()
        await stealth(page)
        
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(2)
            content = await page.content()
            
            # Simple check
            soup = BeautifulSoup(content, 'html.parser')
            text = soup.get_text().lower()
            if len(content) < 15000 or "robot" in text or "güvenlik" in text:
                print("WAF Blocked or empty page!")
                print(f"Content length: {len(content)}")
                title = soup.title.string if soup.title else "No Title"
                print(f"Title: {title}")
            else:
                print("Successfully fetched the page!")
                print(f"Content length: {len(content)}")
                title = soup.title.string if soup.title else "No Title"
                print(f"Title: {title}")
        except Exception as e:
            print(f"Failed: {e}")
        finally:
            await browser.close()

async def main():
    urls = [
        "https://www.hepsiburada.com/midex-plx-140-gitar-amfisi-ve-kulaklikli-tam-profesyonel-elektro-gitar-seti-p-HBCV00000OWCQQ",
        "https://www.trendyol.com/apple/iphone-13-128gb-yildiz-isigi-cep-telefonu-p-151061937"
    ]
    for url in urls:
        await test_stealth(url)

if __name__ == "__main__":
    asyncio.run(main())

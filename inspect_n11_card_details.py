import asyncio
from curl_cffi.requests import AsyncSession
from bs4 import BeautifulSoup
import sys

sys.stdout.reconfigure(encoding='utf-8')

async def main():
    url = "https://www.n11.com/product-reviews/705282320"
    headers = {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.8,en-US;q=0.5,en;q=0.3",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    async with AsyncSession() as session:
        resp = await session.get(url, impersonate="chrome116", headers=headers)
        soup = BeautifulSoup(resp.text, "html.parser")
        
        cards = soup.find_all(class_=lambda c: c and "review-card" in c)
        print(f"Found {len(cards)} cards using lambda 'review-card' search.")
        
        # Let's print the full HTML of the first card
        for i, card in enumerate(cards[:2]):
            print(f"\n=================== CARD {i+1} HTML ===================")
            print(card.prettify()[:2500]) # Print first 2500 characters of each card

if __name__ == "__main__":
    asyncio.run(main())

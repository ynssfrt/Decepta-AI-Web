import asyncio
from curl_cffi.requests import AsyncSession
from bs4 import BeautifulSoup
import sys

sys.stdout.reconfigure(encoding='utf-8')

async def main():
    url = "https://www.hepsiburada.com/camasir-makinesi-kurutma-makinesi-ortusu-koruma-pedi-mati-kaymaz-yikanabilir-p-HBCV0000CLHII0-yorumlari?sayfa=1"
    headers = {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.8,en-US;q=0.5,en;q=0.3",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    async with AsyncSession() as session:
        resp = await session.get(url, impersonate="chrome116", headers=headers)
        soup = BeautifulSoup(resp.text, "html.parser")
        
        all_cards = soup.find_all(class_=lambda c: c and any("ReviewCard" in x for x in c.split()))
        top_cards = [c for c in all_cards if not any("ReviewCard" in cls for cls in (c.parent.get('class', []) if c.parent else []))]
        
        print(f"Total top-level cards on Page 1: {len(top_cards)}")
        
        for idx in [1, 6]: # 0-indexed indices for Card 2 and Card 7
            if idx < len(top_cards):
                card = top_cards[idx]
                print(f"\n==================================================")
                print(f"CARD {idx+1} TEXT:")
                print(card.text.strip()[:200])
                print(f"\nCARD {idx+1} HTML:")
                print(card.prettify()[:3000]) # Print first 3000 chars of prettified HTML
                print(f"==================================================")

if __name__ == "__main__":
    asyncio.run(main())

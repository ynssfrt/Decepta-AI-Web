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
        
        photo_reviews = []
        for i, card in enumerate(top_cards):
            h64 = len(card.select('[height="64px"]'))
            w80 = len(card.select('[width="80"]'))
            
            imgs = []
            for img in card.find_all('img'):
                src = img.get('src', '') or img.get('data-src', '') or ''
                if 'usercontents' in src or 'review-images' in src:
                    imgs.append(src)
            
            has_photo = h64 > 0 or w80 > 0 or len(imgs) > 0
            
            # Check text length
            text_selectors = [
                '[itemprop="description"]',
                '[class*="review-comment"]',
                '[class*="ReviewCard-module"] p',
                'span[style*="text-align:start"]:not([class])',
                'p'
            ]
            has_text = False
            for sel in text_selectors:
                el = card.select_one(sel)
                if el and len(el.text.strip()) > 2:
                    has_text = True
                    break
                    
            if has_photo:
                photo_reviews.append((i+1, card.text.strip()[:100], h64, w80, len(imgs), has_text))
                
        print(f"\nFound {len(photo_reviews)} photo reviews on Page 1:")
        for idx, text, h64, w80, img_count, has_text in photo_reviews:
            print(f"  Card {idx}: text='{text}', h64={h64}, w80={w80}, imgs={img_count}, has_text={has_text}")

if __name__ == "__main__":
    asyncio.run(main())

import asyncio
from curl_cffi.requests import AsyncSession
from bs4 import BeautifulSoup
import sys

sys.stdout.reconfigure(encoding='utf-8')

async def fetch_page(session, page_num):
    url = f"https://www.hepsiburada.com/camasir-makinesi-kurutma-makinesi-ortusu-koruma-pedi-mati-kaymaz-yikanabilir-p-HBCV0000CLHII0-yorumlari?sayfa={page_num}"
    headers = {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.8,en-US;q=0.5,en;q=0.3",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    resp = await session.get(url, impersonate="chrome116", headers=headers)
    soup = BeautifulSoup(resp.text, "html.parser")
    
    all_cards = soup.find_all(class_=lambda c: c and any("ReviewCard" in x for x in c.split()))
    top_cards = [c for c in all_cards if not any("ReviewCard" in cls for cls in (c.parent.get('class', []) if c.parent else []))]
    
    print(f"\n--- Page {page_num} (Top-level cards: {len(top_cards)}) ---")
    photo_cards_on_page = 0
    text_cards_on_page = 0
    for i, card in enumerate(top_cards):
        imgs = []
        for img in card.find_all('img'):
            src = img.get('src', '') or img.get('data-src', '') or ''
            if 'usercontents' in src or 'review-images' in src:
                imgs.append(src)
        
        h64 = len(card.select('[height="64px"]'))
        w80 = len(card.select('[width="80"]'))
        has_photo = len(imgs) > 0 or h64 > 1 or w80 > 1
        
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
                
        if has_text:
            text_cards_on_page += 1
            
        if has_photo:
            photo_cards_on_page += 1
            print(f"  [Card {i+1}] has_photo={has_photo}, has_text={has_text}, h64={h64}, w80={w80}, imgs={len(imgs)}")
            
    return len(top_cards), text_cards_on_page, photo_cards_on_page

async def main():
    async with AsyncSession() as session:
        tot_cards = 0
        tot_text_cards = 0
        tot_photo_cards = 0
        for p in [1, 2]:
            tc, txt_c, pc = await fetch_page(session, p)
            tot_cards += tc
            tot_text_cards += txt_c
            tot_photo_cards += pc
            
        print(f"\n==================================================")
        print(f"TOTAL REVIEW CARDS ACROSS PAGES 1-2: {tot_cards}")
        print(f"TOTAL WRITTEN TEXT REVIEWS ACROSS PAGES 1-2: {tot_text_cards}")
        print(f"TOTAL PHOTO REVIEW CARDS ACROSS PAGES 1-2: {tot_photo_cards}")
        print(f"==================================================")

if __name__ == "__main__":
    asyncio.run(main())

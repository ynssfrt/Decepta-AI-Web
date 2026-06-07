import asyncio
from curl_cffi.requests import AsyncSession
from bs4 import BeautifulSoup
import sys

sys.stdout.reconfigure(encoding='utf-8')

async def fetch_page(session, page_num):
    url = f"https://www.hepsiburada.com/l-or-al-paris-telescopic-extensionist-maskara-hacim-verici-ozellikleriyle-siyah-renk-buyuk-boy-p-HBCV0000C17H5W-yorumlari?sayfa={page_num}"
    headers = {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.8,en-US;q=0.5,en;q=0.3",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    resp = await session.get(url, impersonate="chrome116", headers=headers)
    soup = BeautifulSoup(resp.text, "html.parser")
    
    all_cards = soup.find_all(class_=lambda c: c and any("ReviewCard" in x for x in c.split()))
    top_cards = [c for c in all_cards if not any("ReviewCard" in cls for cls in (c.parent.get('class', []) if c.parent else []))]
    
    print(f"\n--- Page {page_num} (Top cards found: {len(top_cards)}) ---")
    for i, card in enumerate(top_cards):
        meta_user = card.find('meta', content=True)
        user_name = meta_user['content'].strip() if meta_user else ""
        
        review_date = ""
        spans = card.find_all('span', attrs={"content": True})
        for span in spans:
            content_val = span['content'].strip()
            if '-' in content_val and len(content_val) == 10:
                review_date = content_val
                break
                
        # Check comment text
        text_selectors = [
            '[itemprop="description"]',
            '[class*="review-comment"]',
            '[class*="ReviewCard-module"] p',
            'span[style*="text-align:start"]:not([class])',
            'p'
        ]
        extracted_text = ''
        for sel in text_selectors:
            el = card.select_one(sel)
            if el and len(el.text.strip()) > 2:
                extracted_text = el.text.strip()
                break
                
        has_text = len(extracted_text) > 2
        
        # Check photo
        h64 = len(card.select('[height="64px"]'))
        w80 = len(card.select('[width="80"]'))
        imgs = []
        for img in card.find_all('img'):
            src = img.get('src', '') or img.get('data-src', '') or ''
            if 'usercontents' in src or 'review-images' in src:
                imgs.append(src)
        has_photo = h64 > 0 or w80 > 0 or len(imgs) > 0
        
        # Signatures
        sig = ""
        if user_name and review_date:
            sig = user_name + "_" + review_date + "_" + extracted_text
        else:
            sig = "FALLBACK_" + extracted_text[:40]
            
        print(f"  Card {i+1}: User='{user_name}' Date='{review_date}' has_text={has_text} has_photo={has_photo} sig='{sig[:50]}...'")

    return len(top_cards)

async def main():
    async with AsyncSession() as session:
        # Try fetching the first 6 pages
        for p in range(1, 7):
            tc = await fetch_page(session, p)
            if tc == 0:
                break

if __name__ == "__main__":
    asyncio.run(main())

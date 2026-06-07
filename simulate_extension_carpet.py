from bs4 import BeautifulSoup
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open("real_carpet_page_dump.html", "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, "html.parser")
all_cards = soup.find_all(class_=lambda c: c and any("ReviewCard" in x for x in c.split()))
top_level_cards = [c for c in all_cards if not any("ReviewCard" in cls for cls in (c.parent.get('class', []) if c.parent else []))]

print(f"Total top-level cards found: {len(top_level_cards)}")

unique_texts = set()
unique_photos = set()

for i, card in enumerate(top_level_cards):
    card_text = card.text.strip()
    
    # 1. Text Selector
    text_selectors = [
        '[itemprop="description"]',
        '[class*="review-comment"]',
        '[class*="ReviewCard-module"] p',
        'span[style*="text-align:start"]:not([class])',
        'p'
    ]
    extracted_text = ""
    for sel in text_selectors:
        el = card.select_one(sel)
        if el and len(el.text.strip()) > 2:
            extracted_text = el.text.strip()
            break
            
    has_review_text = len(extracted_text) > 2
    
    # 2. Photo Selector
    h64_count = len(card.select('[height="64px"]'))
    w80_count = len(card.select('[width="80"]'))
    
    imgs = []
    for img in card.find_all('img'):
        src = img.get('src', '') or img.get('data-src', '') or ''
        if 'usercontents' in src or 'review-images' in src:
            imgs.append(src)
            
    has_user_photo = h64_count > 0 or w80_count > 0 or len(imgs) > 0
    
    # 3. Signature
    sig = card_text[:100] + '_' + extracted_text[:50]
    
    if has_review_text:
        unique_texts.add(sig)
    if has_user_photo:
        unique_photos.add(sig + '_photo')
        
    print(f"Card {i+1}: has_text={has_review_text}, has_photo={has_user_photo}, sig={sig[:60]}...")

print(f"\nSIMULATION RESULTS:")
print(f"  Unique written comments count: {len(unique_texts)}")
print(f"  Unique photo reviews count: {len(unique_photos)}")

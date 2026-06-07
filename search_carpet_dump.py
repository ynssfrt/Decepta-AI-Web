from bs4 import BeautifulSoup
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open("real_carpet_page_dump.html", "r", encoding="utf-8") as f:
    html = f.read()
    
soup = BeautifulSoup(html, "html.parser")
all_cards = soup.find_all(class_=lambda c: c and any("ReviewCard" in x for x in c.split()))
top_cards = [c for c in all_cards if not any("ReviewCard" in cls for cls in (c.parent.get('class', []) if c.parent else []))]

print(f"Total cards: {len(top_cards)}")
for i, card in enumerate(top_cards):
    h64_elements = card.select('[height="64px"]')
    w80_elements = card.select('[width="80"]')
    if len(h64_elements) > 0 or len(w80_elements) > 0:
        print(f"\nCard {i+1}:")
        print(f"  [height='64px'] elements: {len(h64_elements)}")
        for el in h64_elements:
            print(f"    {str(el)[:500]}")
        print(f"  [width='80'] elements: {len(w80_elements)}")
        for el in w80_elements:
            print(f"    {str(el)[:500]}")

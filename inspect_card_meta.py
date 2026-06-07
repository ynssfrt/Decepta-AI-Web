from bs4 import BeautifulSoup

def main():
    with open('real_carpet_page_dump.html', 'r', encoding='utf-8') as f:
        html = f.read()
    
    soup = BeautifulSoup(html, 'html.parser')
    all_cards = soup.find_all(class_=lambda c: c and any("ReviewCard" in x for x in c.split()))
    top_cards = [c for c in all_cards if not any("ReviewCard" in cls for cls in (c.parent.get('class', []) if c.parent else []))]
    
    print(f"Total top-level cards: {len(top_cards)}")
    
    indices = [8, 10, 12] # 0-indexed for cards 9, 11, 13
    for idx in indices:
        if idx < len(top_cards):
            card = top_cards[idx]
            print(f"\n=================== Card {idx+1} HTML ===================")
            print(card.prettify()[:1500])

if __name__ == '__main__':
    main()

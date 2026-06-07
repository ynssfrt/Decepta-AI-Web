from bs4 import BeautifulSoup

def main():
    with open('real_carpet_page_dump.html', 'r', encoding='utf-8') as f:
        html = f.read()
    
    soup = BeautifulSoup(html, 'html.parser')
    all_cards = soup.find_all(class_=lambda c: c and any("ReviewCard" in x for x in c.split()))
    top_cards = [c for c in all_cards if not any("ReviewCard" in cls for cls in (c.parent.get('class', []) if c.parent else []))]
    
    print(f"Total top-level cards: {len(top_cards)}")
    
    for i, card in enumerate(top_cards[:5]):
        print(f"\n--- Card {i+1} Attributes ---")
        print("Attributes:", card.attrs)
        
        # Look for elements inside that might have IDs or data attributes
        all_children = card.find_all(True)
        for child in all_children:
            id_val = child.get('id')
            data_attrs = {k: v for k, v in child.attrs.items() if k.startswith('data-')}
            itemprops = child.get('itemprop')
            if id_val or data_attrs or itemprops:
                print(f"  Tag: {child.name} ID: {id_val} DataAttrs: {data_attrs} Itemprop: {itemprops}")

if __name__ == '__main__':
    main()

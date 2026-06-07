from bs4 import BeautifulSoup

def main():
    soup = BeautifulSoup(open('hb_midex_reviews.html', encoding='utf-8').read(), 'html.parser')
    cards = soup.find_all(class_=lambda c: c and any('ReviewCard' in x for x in c.split()))
    if not cards:
        print("No cards found.")
        return
        
    card = cards[0]
    parent = card.parent
    while parent:
        classes = parent.get('class', [])
        parent_id = parent.get('id', '')
        print(f"Parent: tag={parent.name} id='{parent_id}' class={classes}")
        parent = parent.parent

if __name__ == "__main__":
    main()

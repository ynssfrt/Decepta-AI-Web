import sys
from bs4 import BeautifulSoup

def main():
    try:
        with open('hb_midex_reviews.html', 'r', encoding='utf-8') as f:
            html = f.read()
    except FileNotFoundError:
        print("hb_midex_reviews.html not found in current directory.")
        return

    soup = BeautifulSoup(html, 'html.parser')
    all_elements = soup.find_all(lambda tag: tag.get('class') and any('ReviewCard' in c for c in tag.get('class')))
    print(f"Total elements with 'ReviewCard' in class: {len(all_elements)}")
    
    for i, el in enumerate(all_elements[:10]):
        parent = el.parent
        parent_class = parent.get('class') if parent else None
        print(f"Element {i}: Tag={el.name}, Class={el.get('class')}, ParentTag={parent.name if parent else 'None'}, ParentClass={parent_class}")

if __name__ == '__main__':
    main()

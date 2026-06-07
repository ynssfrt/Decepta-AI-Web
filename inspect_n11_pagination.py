import sys
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')

def main():
    with open("n11_hydrated.html", "r", encoding="utf-8") as f:
        html = f.read()
        
    soup = BeautifulSoup(html, "html.parser")
    
    # Search for pagination-like classes: 'pagination', 'page', 'next', 'prev', 'more'
    all_elements = soup.find_all(True)
    potential_pagination = []
    for el in all_elements:
        classes = el.get('class', [])
        class_str = " ".join(classes)
        if any(x in class_str.lower() for x in ['pagination', 'page', 'next', 'prev', 'more', 'button']):
            potential_pagination.append(el)
            
    print(f"Found {len(potential_pagination)} potential pagination elements:")
    for el in potential_pagination[:40]:
        if el.name in ['a', 'button', 'div', 'li'] and el.text.strip():
            print(f"  Tag: {el.name} Class: {el.get('class')} Text: '{el.text.strip()}'")

if __name__ == "__main__":
    main()

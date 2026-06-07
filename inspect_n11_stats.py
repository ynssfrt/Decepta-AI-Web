import sys
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')

def main():
    with open("n11_hydrated.html", "r", encoding="utf-8") as f:
        html = f.read()
        
    soup = BeautifulSoup(html, "html.parser")
    
    # Search for texts containing "değerlendirme" or "yorum" in the product-review-statistics area
    elements = soup.find_all(True)
    for el in elements:
        classes = el.get('class', [])
        class_str = " ".join(classes)
        if any(x in class_str.lower() for x in ['statistic', 'count', 'review-info', 'rating']):
            if el.text.strip() and len(el.text.strip()) < 200:
                print(f"Tag: {el.name} Class: {el.get('class')} Text: '{el.text.strip()}'")

if __name__ == "__main__":
    main()

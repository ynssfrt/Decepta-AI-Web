import sys
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')

def main():
    with open("n11_hydrated.html", "r", encoding="utf-8") as f:
        html = f.read()
        
    soup = BeautifulSoup(html, "html.parser")
    # Search for DIVs with class card-wrapper review-card rounded
    cards = soup.find_all(class_=lambda c: c and "review-card" in c and "card-wrapper" in c and "rounded" in c)
    print(f"Total review cards on page: {len(cards)}")
    
    for i, card in enumerate(cards[:3]):
        print(f"\n=================== Card {i+1} HTML ===================")
        print(card.prettify()[:2500])

if __name__ == "__main__":
    main()

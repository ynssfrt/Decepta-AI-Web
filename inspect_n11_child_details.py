import sys
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')

def main():
    with open("n11_hydrated.html", "r", encoding="utf-8") as f:
        html = f.read()
        
    soup = BeautifulSoup(html, "html.parser")
    cards = soup.find_all(class_=lambda c: c and "review-card" in c and "card-wrapper" in c)
    print(f"Total hydrated n11 review cards: {len(cards)}")
    
    for i, card in enumerate(cards[:3]):
        print(f"\n=================== hydrated card {i+1} HTML ===================")
        try:
            print(card.prettify()[:2500])
        except Exception as e:
            print("Error printing card:", e)

if __name__ == "__main__":
    main()

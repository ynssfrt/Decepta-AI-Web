import sys
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')

def main():
    with open("n11_hydrated.html", "r", encoding="utf-8") as f:
        html = f.read()
        
    soup = BeautifulSoup(html, "html.parser")
    cards = soup.find_all(class_=lambda c: c and "review-card" in c and "card-wrapper" in c and "rounded" in c)
    
    print(f"Found {len(cards)} cards.")
    for idx, card in enumerate(cards):
        # Let's search for images
        imgs = card.find_all('img')
        if len(imgs) > 0 or len(card.select('.swiper-slide')) > 0:
            print(f"\n================ Card {idx+1} has images ================")
            print(f"  Username: {card.find(class_='card-detail__name').text.strip() if card.find(class_='card-detail__name') else ''}")
            print(f"  Text: {card.find(class_='card-detail__contents').text.strip() if card.find(class_='card-detail__contents') else ''}")
            print(f"  Images ({len(imgs)}):")
            for img in imgs:
                print(f"    img src={img.get('src')} data-src={img.get('data-src')}")
            
            slides = card.select('.swiper-slide')
            print(f"  Swiper slides ({len(slides)}):")
            for slide in slides:
                slide_img = slide.find('img')
                if slide_img:
                    print(f"    slide img src={slide_img.get('src')}")

if __name__ == "__main__":
    main()

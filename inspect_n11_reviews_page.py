import asyncio
from curl_cffi.requests import AsyncSession
from bs4 import BeautifulSoup
import sys

sys.stdout.reconfigure(encoding='utf-8')

async def main():
    # Let's fetch the reviews page directly!
    url = "https://www.n11.com/product-reviews/705282320"
    headers = {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.8,en-US;q=0.5,en;q=0.3",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    async with AsyncSession() as session:
        resp = await session.get(url, impersonate="chrome116", headers=headers)
        soup = BeautifulSoup(resp.text, "html.parser")
        
        print("Reviews page fetched. Length:", len(resp.text))
        
        # Let's see some details about the comments/reviews
        # We want to find reviews cards.
        # Let's search for classes like 'comment', 'review', or similar
        all_elements = soup.find_all(class_=True)
        classes = set()
        for el in all_elements:
            for c in el.get('class'):
                classes.add(c)
                
        print("\nSome class names found on n11 reviews page:")
        sorted_classes = sorted(list(classes))
        for c in sorted_classes[:60]: # Print first 60 classes
            print(f"  {c}")
            
        # Let's check if there are actual review comments in the DOM
        # Let's look for "yorum" or elements containing text
        comments = soup.find_all(class_=lambda c: c and any("comment" in x or "review" in x for x in c.split()))
        print(f"\nFound {len(comments)} elements matching comment/review class:")
        for el in comments[:10]:
            print(f"  Tag: {el.name} Class: {el.get('class')} Text: '{el.text.strip()[:100]}'")

if __name__ == "__main__":
    asyncio.run(main())

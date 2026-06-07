import asyncio
from curl_cffi.requests import AsyncSession
from bs4 import BeautifulSoup
import sys

sys.stdout.reconfigure(encoding='utf-8')

async def main():
    url = "https://www.n11.com/urun/t212-k-katlanabilir-led-isikli-scooter-4-kademe-ayarlanabilir-yukseklik-ayari-55-70cm-arka-fren-102645992?magaza=piranha"
    headers = {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.8,en-US;q=0.5,en;q=0.3",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    async with AsyncSession() as session:
        resp = await session.get(url, impersonate="chrome116", headers=headers)
        soup = BeautifulSoup(resp.text, "html.parser")
        
        link = soup.find('a', class_='product-reviews__link')
        if link:
            print("Link element HTML:")
            print(link.prettify())
        else:
            print("Link with class 'product-reviews__link' not found!")
            
if __name__ == "__main__":
    asyncio.run(main())

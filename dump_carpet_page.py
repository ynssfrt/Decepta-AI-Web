import asyncio
from curl_cffi.requests import AsyncSession
from bs4 import BeautifulSoup
import sys

sys.stdout.reconfigure(encoding='utf-8')

async def main():
    url = "https://www.hepsiburada.com/camasir-makinesi-kurutma-makinesi-ortusu-koruma-pedi-mati-kaymaz-yikanabilir-p-HBCV00003CIHI0-yorumlari?sayfa=1"
    headers = {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.8,en-US;q=0.5,en;q=0.3",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    async with AsyncSession() as session:
        resp = await session.get(url, impersonate="chrome116", headers=headers, allow_redirects=True)
        print(f"Final URL after redirects: {resp.url}")
        print(f"Status Code: {resp.status_code}")
        
        soup = BeautifulSoup(resp.text, "html.parser")
        print(f"Title: {soup.title.text.strip() if soup.title else 'No Title'}")
        
        # Save to file
        with open("carpet_page_dump.html", "w", encoding="utf-8") as f:
            f.write(resp.text)
            
        # Count ReviewCard elements in dump
        cards = soup.find_all(class_=lambda c: c and "ReviewCard" in c)
        print(f"ReviewCard elements in dump: {len(cards)}")

if __name__ == "__main__":
    asyncio.run(main())

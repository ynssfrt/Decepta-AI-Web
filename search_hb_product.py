import asyncio
from curl_cffi.requests import AsyncSession
from bs4 import BeautifulSoup
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

async def main():
    query = "Höt ile Zöt"
    encoded_query = urllib.parse.quote(query)
    url = f"https://www.hepsiburada.com/ara?q={encoded_query}"
    
    headers = {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.8,en-US;q=0.5,en;q=0.3",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    async with AsyncSession() as session:
        resp = await session.get(url, impersonate="chrome116", headers=headers)
        soup = BeautifulSoup(resp.text, "html.parser")
        
        print(f"Search Status Code: {resp.status_code}")
        print(f"Search Title: {soup.title.text.strip() if soup.title else 'No Title'}")
        
        print(f"Total links on page: {len(links)}")
        for i, a in enumerate(links[:30]):
            print(f"[{i+1}] {a['href']}")

if __name__ == "__main__":
    asyncio.run(main())

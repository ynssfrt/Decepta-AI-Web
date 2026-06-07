import asyncio
from curl_cffi.requests import AsyncSession
from bs4 import BeautifulSoup
import sys

sys.stdout.reconfigure(encoding='utf-8')

async def check(session, sku):
    url = f"https://www.hepsiburada.com/camasir-makinesi-kurutma-makinesi-ortusu-koruma-pedi-mati-kaymaz-yikanabilir-p-{sku}-yorumlari"
    headers = {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.8,en-US;q=0.5,en;q=0.3",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    try:
        resp = await session.get(url, impersonate="chrome116", headers=headers, timeout=10)
        soup = BeautifulSoup(resp.text, "html.parser")
        title = soup.title.text.strip() if soup.title else "No Title"
        print(f"SKU: {sku} -> Status: {resp.status_code}, Title: {title[:80]}")
        return resp.status_code == 200 and "kurutma" in title.lower()
    except Exception as e:
        print(f"SKU: {sku} -> Error: {e}")
        return False

async def main():
    skus = [
        "HBCV00003CIHI0",
        "HBCV00003CIHIO",
        "HBC00003CIHI0",
        "HBC00003CIHIO",
        "HBCV00003CIH10",
        "HBCV00003CIH1O",
        "HBCV00003CIHI1",
        "HBCV00003CIHI"
    ]
    async with AsyncSession() as session:
        for sku in skus:
            if await check(session, sku):
                print(f"SUCCESS: Found active SKU: {sku}")
                break

if __name__ == "__main__":
    asyncio.run(main())

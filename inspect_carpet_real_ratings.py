import asyncio
from curl_cffi.requests import AsyncSession
from bs4 import BeautifulSoup
import re
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

async def main():
    url = "https://www.hepsiburada.com/camasir-makinesi-kurutma-makinesi-ortusu-koruma-pedi-mati-kaymaz-yikanabilir-p-HBCV0000CLHII0-yorumlari?sayfa=1"
    headers = {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.8,en-US;q=0.5,en;q=0.3",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    async with AsyncSession() as session:
        resp = await session.get(url, impersonate="chrome116", headers=headers)
        html = resp.text
        
        # Let's search inside the HTML directly for any script matching __INITIAL_STATE__
        matches = re.findall(r'__INITIAL_STATE__\s*=\s*(\{.*?\});', html)
        if not matches:
            matches = re.findall(r'window\.__INITIAL_STATE__\s*=\s*(\{.*?\});', html)
            
        if matches:
            print("Found __INITIAL_STATE__ match in HTML.")
            # Let's search inside the matched text for key-value pairs matching review-related fields
            text = matches[0]
            # Print all keys matching review
            for m in re.finditer(r'"([^"]*?review[^"]*?)"\s*:\s*(.*?)[,}]', text, re.IGNORECASE):
                print(f"Key: {m.group(1)} -> Value: {m.group(2)}")
        else:
            print("No __INITIAL_STATE__ match found.")

if __name__ == "__main__":
    asyncio.run(main())

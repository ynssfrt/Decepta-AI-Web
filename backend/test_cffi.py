from curl_cffi import requests
from bs4 import BeautifulSoup
import sys

def test_cffi(url: str):
    print(f"\n--- Testing URL: {url} ---")
    try:
        # Use impersonate="chrome"
        resp = requests.get(url, impersonate="chrome110", timeout=15)
        print(f"Status: {resp.status_code}")
        
        content = resp.text
        soup = BeautifulSoup(content, 'html.parser')
        text = soup.get_text().lower()
        
        if len(content) < 15000 or "robot" in text or "güvenlik" in text:
            print("WAF Blocked or empty page!")
            print(f"Content length: {len(content)}")
            title = soup.title.string if soup.title else "No Title"
            print(f"Title: {title}")
        else:
            print("Successfully fetched the page!")
            print(f"Content length: {len(content)}")
            title = soup.title.string if soup.title else "No Title"
            print(f"Title: {title}")
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    urls = [
        "https://www.hepsiburada.com/midex-plx-140-gitar-amfisi-ve-kulaklikli-tam-profesyonel-elektro-gitar-seti-p-HBCV00000OWCQQ",
        "https://www.trendyol.com/apple/iphone-13-128gb-yildiz-isigi-cep-telefonu-p-151061937"
    ]
    for url in urls:
        test_cffi(url)

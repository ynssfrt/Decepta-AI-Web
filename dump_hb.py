import requests
import re
import json
from bs4 import BeautifulSoup

url = "https://www.hepsiburada.com/midex-plx-100bk-st-tasinabilir-dijital-piyano-tus-hassasiyetli-88-tus-bluetooth-sarjli-stand-sustain-kulaklik-canta-metod-p-HBCV00004LIP68"
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

print("Fetching URL...")
r = requests.get(url, headers=headers)
html = r.text
print("HTML Size:", len(html))

# JSON-LD testi
soup = BeautifulSoup(html, "html.parser")
found_ld = False
for script in soup.find_all("script", type="application/ld+json"):
    try:
        data = json.loads(script.string)
        if isinstance(data, dict) and "aggregateRating" in data:
            print("Found JSON-LD dict:", data["aggregateRating"])
            found_ld = True
        elif isinstance(data, list):
            for item in data:
                if "aggregateRating" in item:
                    print("Found JSON-LD list:", item["aggregateRating"])
                    found_ld = True
    except: pass

if not found_ld:
    print("No JSON-LD aggregate rating found.")

# Manuel regex test
matches = re.finditer(r'([1-4][.,][0-9]|5[.,]0)', html)
scores = [m.group(1) for m in matches]
print("Found score-like strings:", set(scores))

with open("dump.html", "w", encoding="utf-8") as f:
    f.write(html)

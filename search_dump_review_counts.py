import re
from bs4 import BeautifulSoup
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open("real_carpet_page_dump.html", "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, "html.parser")
scripts = soup.find_all("script")
print(f"Total script tags in dump: {len(scripts)}")

# Search inside scripts for review metrics
found_any = False
for idx, script in enumerate(scripts):
    text = script.string or script.text or ""
    if "review" in text.lower() or "rating" in text.lower():
        found_any = True
        print(f"\nScript {idx+1} (Length: {len(text)}) contains 'review' or 'rating':")
        # Let's search for some matches
        for m in re.finditer(r'"([^"]*?(?:review|rating)[^"]*?)"\s*:\s*(.*?)[,}]', text, re.IGNORECASE):
            print(f"  Key: {m.group(1)} -> Value: {m.group(2)}")
            
if not found_any:
    print("No scripts containing review or rating.")

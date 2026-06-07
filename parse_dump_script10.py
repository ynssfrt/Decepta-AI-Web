import re
import json
from bs4 import BeautifulSoup
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open("real_carpet_page_dump.html", "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, "html.parser")
scripts = soup.find_all("script")

# Parse Script 10
text = scripts[9].string or scripts[9].text or ""

# Let's extract the JSON. It starts with window.__INITIAL_STATE__ = { ... } or similar
match = re.search(r'__INITIAL_STATE__\s*=\s*(\{.*?\});', text)
if not match:
    match = re.search(r'window\.__INITIAL_STATE__\s*=\s*(\{.*?\});', text)
    
if not match:
    # Just try to find the first '{' and last '}'
    start = text.find('{')
    end = text.rfind('}')
    json_str = text[start:end+1]
else:
    json_str = match.group(1)

try:
    data = json.loads(json_str)
    
    # Let's search recursively for keys related to media or review counts
    def search_dict(d, path=""):
        if isinstance(d, dict):
            for k, v in d.items():
                new_path = f"{path}.{k}" if path else k
                if any(x in k.lower() for x in ["media", "photo", "image", "review", "count", "quantity"]):
                    if not isinstance(v, (dict, list)):
                        print(f"{new_path} -> {v}")
                search_dict(v, new_path)
        elif isinstance(d, list):
            for idx, item in enumerate(d):
                search_dict(item, f"{path}[{idx}]")
                
    search_dict(data)
    
except Exception as e:
    print(f"Error parsing Script 10 JSON: {e}")
    # Let's search inside the raw string for "hasMedia" or similar keys
    for m in re.finditer(r'"hasMedia"\s*:\s*([^,}]+)', text):
        print(f"found hasMedia: {m.group(1)}")
    # Find context of hasMedia
    for m in re.finditer(r'.{0,100}"hasMedia".{0,100}', text):
        print(f"hasMedia context: {m.group(0)}")

from bs4 import BeautifulSoup
import re

with open("hb_midex_reviews.html", "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, "html.parser")

# Simulate: document.querySelectorAll('span[class*="PageHolder"], a[class*="PageHolder"], span[class*="PageNumber"], a[class*="PageNumber"]')
# bs4 class matching: we can use a function or regex for class *=
class_regex = re.compile(r"PageHolder|PageNumber")
spans_and_as = soup.find_all(["span", "a"], class_=class_regex)

print(f"Found {len(spans_and_as)} page buttons matching class regex:")
for i, el in enumerate(spans_and_as):
    print(f"[{i+1}] Tag: <{el.name} class='{el.get('class')}'> Text: '{el.text.strip()}'")

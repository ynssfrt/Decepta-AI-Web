from bs4 import BeautifulSoup

with open("hb_midex_reviews.html", "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, "html.parser")

# Find the pagination bar container
holder = soup.find(class_=lambda c: c and "paginationBarHolder" in c)
if holder:
    print("=== Pagination Bar Holder Found ===")
    # Print the exact list of tags and their text
    for i, el in enumerate(holder.find_all(True)):
        if el.name in ["li", "span", "a", "button", "div"] and el.text.strip():
            print(f"[{i+1}] <{el.name} class='{el.get('class')}'> Text: '{el.text.strip()}'")
else:
    print("paginationBarHolder not found!")

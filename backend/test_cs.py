# -*- coding: utf-8 -*-
import cloudscraper

url = "https://www.hepsiburada.com/apple-iphone-13-128-gb-p-HBCV00000ODHHV"

def test_cs():
    scraper = cloudscraper.create_scraper(browser={'browser': 'chrome', 'platform': 'windows', 'desktop': True})
    try:
        html = scraper.get(url).text
        print("HTML len:", len(html))
        print("Guvenlik?:", "Robot olmadığınızı doğrulayın" in html or "Güvenlik" in html)
        print("Contains schema:", "application/ld+json" in html)
        
        with open("dump_cs.html", "w", encoding="utf-8") as f:
            f.write(html)
            
    except Exception as e:
        print("Cloudscraper failed:", e)

if __name__ == "__main__":
    test_cs()

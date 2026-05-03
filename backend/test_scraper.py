import asyncio
import sys
import os
import logging
logging.basicConfig(level=logging.INFO)

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../")))

from app.services.scraper import PlaywrightScraper

async def test_scraper():
    url = "https://www.hepsiburada.com/apple-iphone-13-128-gb-p-HBCV00000QNQTE"
    scraper = PlaywrightScraper(url)
    await scraper.fetch_page()
    
    print(f"Is WAF Blocked: {scraper.is_waf_blocked}")
    
    score = scraper.extract_score()
    print(f"Score: {score}")
    
    total_ratings, total_reviews = scraper.extract_metrics()
    print(f"Total Ratings: {total_ratings}, Total Reviews: {total_reviews}")
    
    comments = scraper.extract_real_comments()
    print(f"Extracted {len(comments)} comments.")
    if len(comments) > 0:
        print(f"Sample comment: {comments[0][:100]}")
        
    with open("debug_trendyol.html", "w", encoding="utf-8") as f:
        f.write(scraper.html_content)
    with open("debug_trendyol.txt", "w", encoding="utf-8") as f:
        f.write(scraper.text_content)

if __name__ == "__main__":
    asyncio.run(test_scraper())

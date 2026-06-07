import requests
import json

url = "http://127.0.0.1:8000/api/v1/scan"
payload = {
    "url": "https://www.hepsiburada.com/midex-plx-100bk-st-tasinabilir-dijital-piyano-tus-hassasiyetli-88-tus-bluetooth-sarjli-stand-sustain-kulaklik-canta-metod-p-HBCV00003XFG98-yorumlari",
    "extracted_data": {
        "score": 4.2,
        "total_ratings": 37,
        "total_reviews": 19,
        "comments": ["test comment"],
        "detailed_reviews": [{"text": "test comment", "images": []}],
        "photo_reviews_count": 3,
        "debug_source": "test"
    }
}

try:
    print(f"Sending POST to {url}...")
    resp = requests.post(url, json=payload, timeout=5)
    print(f"Status Code: {resp.status_code}")
    print(f"Response: {resp.text}")
except Exception as e:
    print(f"Failed: {e}")

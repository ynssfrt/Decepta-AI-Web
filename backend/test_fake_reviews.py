import requests
import time
import json

# Backend API Adresi
API_URL = "http://localhost:8000/api/v1/scan/"

def test_system_with_mock_data():
    print("Decepta AI Sahte Yorum Test Araci Baslatiliyor...\n")
    
    # Kendi oluşturduğumuz (mock) e-ticaret verisi
    mock_data = {
        "url": "https://www.trendyol.com/ornek-urun",
        "extracted_data": {
            "score": 4.9,
            "total_ratings": 100,
            "total_reviews": 4,
            "comments": [
                "Ürün gerçekten harika, kargolama çok hızlıydı kesinlikle tavsiye ederim.", # Normal, gerçekçi yorum
                "güzel güzel güzel güzel güzel güzel", # Sahte: Aşırı kelime tekrarı
                "iyi", # Sahte: Çok kısa ama yüksek ihtimalle 5 yıldızlı pozitif (bot paterni)
                "asdfghjklqwertyuiopzxcvbnmasdfghjklqwertyuiop" # Sahte: Anlamsız uzun metin
            ],
            "detailed_reviews": [
                {
                    "text": "Ürün gerçekten harika, kargolama çok hızlıydı kesinlikle tavsiye ederim.",
                    "images": ["http://dummyimage.com/150x150/000/fff.png&text=Resim1"] # Orijinal resim
                },
                {
                    "text": "güzel güzel güzel güzel güzel güzel",
                    "images": ["http://dummyimage.com/150x150/f00/fff.png&text=Sahte"] # Kopya resim 1
                },
                {
                    "text": "iyi",
                    "images": ["http://dummyimage.com/150x150/f00/fff.png&text=Sahte"] # Kopya resim 2 (Aynı url/görsel)
                },
                {
                    "text": "  ", # BOŞ YORUM
                    "images": ["http://dummyimage.com/150x150/0f0/000.png&text=EmptyText"] # Şüpheli: Metin yok ama resim var
                }
            ]
        }
    }
    
    print("API'ye Gonderilen Yorumlar:")
    for i, c in enumerate(mock_data["extracted_data"]["comments"], 1):
        print(f"  {i}. {c}")
    print("\nIstek gonderiliyor, analiz bekleniyor...")

    # 1. Taramayı Başlat
    try:
        response = requests.post(API_URL, json=mock_data)
    except requests.exceptions.ConnectionError:
        print("HATA: Backend sunucusuna ulasilamadi. Lutfen 'uvicorn app.main:app' komutuyla baslatin.")
        return

    if response.status_code != 200:
        print(f"API Hatasi: {response.text}")
        return
        
    task_id = response.json().get("task_id")
    print(f"Gorev olusturuldu. Gorev ID: {task_id}")
    
    # 2. Sonucu Bekle (Polling)
    status_url = f"{API_URL}{task_id}"
    
    while True:
        status_res = requests.get(status_url)
        data = status_res.json()
        
        status = data.get("status")
        progress = data.get("progress_percentage")
        step = data.get("current_step")
        
        print(f"Durum: {status} | Ilerleme: %{progress} | Adim: {step}")
        
        if status == "COMPLETED":
            print("\nAnaliz Tamamlandi!")
            result = data.get("result", {})
            print("-" * 40)
            print(f"Orijinal Platform Skoru : {result.get('platform_score')} / 5.0")
            print(f"Gercek Guven Skoru      : {result.get('true_trust_score')} / 5.0")
            print(f"Tespit Edilen Bot Orani : %{result.get('bot_percentage')}")
            print("\nSupheli/Sahte Olarak Isaretlenen Yorumlar:")
            
            suspicious = result.get("suspicious_reviews", [])
            if not suspicious:
                print("  Bulunamadi.")
            for r in suspicious:
                print(f"  - Yorum: \"{r['text']}\"")
                print(f"    Sebep: {r['reason']}")
            print("-" * 40)
            break
            
        elif status == "FAILED":
            print(f"\nHata: {data.get('error_message')}")
            break
            
        time.sleep(2)

if __name__ == "__main__":
    test_system_with_mock_data()

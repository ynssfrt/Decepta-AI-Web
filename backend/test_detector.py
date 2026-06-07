import sys
import os

# ai paketini sys.path'e ekle
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../")))

from ai.src.sentiment.analyzer import SentimentAnalyzer
from ai.src.detection.detector import ReviewDetector, parse_turkish_date

def print_result(case_name: str, passed: bool, info: str = ""):
    status = "OK" if passed else "FAIL"
    print(f"[{status}] {case_name} {f'({info})' if info else ''}")

def run_tests():
    print("=" * 60)
    print("Decepta AI - Gelişmiş Tespit Algoritmaları Birim Testleri")
    print("=" * 60)

    # 1. Tarih Ayrıştırıcı Testi
    print("\n[Adım 1/6] Tarih Ayrıştırıcı (parse_turkish_date) Testleri:")
    t1 = parse_turkish_date("30 Mayıs 2026")
    t2 = parse_turkish_date("2026-05-30")
    t3 = parse_turkish_date("30.05.2026")
    t4 = parse_turkish_date("30/05/2026")
    t5 = parse_turkish_date("Geçersiz Tarih Dizisi")
    
    print_result("Türkçe Ay İsimli Tarih", t1 is not None and t1.year == 2026 and t1.month == 5 and t1.day == 30, str(t1))
    print_result("ISO Tarih (YYYY-MM-DD)", t2 is not None and t2.year == 2026 and t2.month == 5 and t2.day == 30, str(t2))
    print_result("Noktalı Tarih (DD.MM.YYYY)", t3 is not None and t3.year == 2026 and t3.month == 5 and t3.day == 30, str(t3))
    print_result("Slaşlı Tarih (DD/MM/YYYY)", t4 is not None and t4.year == 2026 and t4.month == 5 and t4.day == 30, str(t4))
    print_result("Geçersiz Tarih Filtreleme", t5 is None, "None olarak döndü")

    # NLP Modeli Yükleme
    print("\n[Adım 2/6] Yapay Zeka Duygu Analiz Modeli Yükleniyor...")
    analyzer = SentimentAnalyzer()
    detector = ReviewDetector()

    # 2. Jaccard Benzerlik / Kopya Botnet Testi
    print("\n[Adım 3/6] Jaccard Benzerlik Tespiti (Kopya Botnet):")
    mock_reviews = [
        {"text": "Bu harika bir telefon kesinlikle tavsiye ederim, kargo inanılmaz hızlı geldi.", "rating": 5},
        {"text": "Bu harika bir telefon kesinlikle tavsiye ederim, kargo inanılmaz hızlı geldi.", "rating": 5}, # Birebir kopya
        {"text": "Fiyatına göre gerçekten harika bir ürün, kargolama çok başarılıydı.", "rating": 4},
        {"text": "Gerçekten harika bir telefon kesinlikle tavsiye ederim kargo inanılmaz hızlı geldi.", "rating": 5}  # %90 Benzer
    ]
    res = detector.detect(mock_reviews, analyzer, 4.5)
    
    passed_jaccard = len(res["suspicious_reviews"]) >= 3 and any("Organize botnet tespiti" in r["reason"] for r in res["suspicious_reviews"])
    print_result("Kopya Botnet Yakalama", passed_jaccard, f"Şüpheli sayısı: {len(res['suspicious_reviews'])}")

    # 3. Duygu ve Puan Tutarsızlığı Testi
    print("\n[Adım 4/6] Duygu-Puan Tutarsızlığı:")
    mock_mismatch = [
        {"text": "Ürün kesinlikle berbat, ekranı kırık geldi ve hiç çalışmıyor.", "rating": 5}, # Çelişki: 5 Yıldız ama son derece olumsuz metin
        {"text": "Harika ötesi bir ürün, herkese şiddetle tavsiye ediyorum süper.", "rating": 1}, # Çelişki: 1 Yıldız ama son derece olumlu metin
        {"text": "Normal bir ürün, kargo hızlıydı.", "rating": 3}
    ]
    res_mismatch = detector.detect(mock_mismatch, analyzer, 3.0)
    
    passed_mismatch = len(res_mismatch["suspicious_reviews"]) == 2 and any("Duygu-puan tutarsızlığı" in r["reason"] for r in res_mismatch["suspicious_reviews"])
    print_result("Duygu-Puan Çelişkisi Tespiti", passed_mismatch, f"Şüpheli sayısı: {len(res_mismatch['suspicious_reviews'])}")

    # 4. Boş/Şablon Övgü Tespiti
    print("\n[Adım 5/6] Şablon Spam Övgü Tespiti:")
    mock_spam = [
        {"text": "harika bayıldım", "rating": 5}, # Şablon spam
        {"text": "çok iyi süper", "rating": 5}, # Şablon spam
        {"text": "ürün elime ulaştı henüz denemedim ama kargo paketlemesi özenliydi.", "rating": 4}
    ]
    res_spam = detector.detect(mock_spam, analyzer, 4.0)
    
    passed_spam = len(res_spam["suspicious_reviews"]) >= 2 and any("Spam bot paterni" in r["reason"] for r in res_spam["suspicious_reviews"])
    print_result("Şablon Spam Övgü Yakalama", passed_spam, f"Şüpheli sayısı: {len(res_spam['suspicious_reviews'])}")

    # 5. Zaman Serisi Yorum Patlaması (Swarm) ve Rakip Karalama Testi
    print("\n[Adım 6/6] Zaman Serisi Yorum Patlaması & Rakip Karalama Kampanyası:")
    
    # Simüle edilmiş Rakip Karalama Kampanyası (Toplu Negatif Swarm)
    # 29 Mayıs'ta 1 adet normal yorum var. 30 Mayıs'ta aniden 4 adet 1-yıldızlı aşırı negatif rakip yorum dalgası geliyor.
    mock_campaign = [
        {"text": "Ürün elime ulaştı, gayet güzel çalışıyor.", "rating": 5, "date": "29 Mayıs 2026"},
        {"text": "Berbat sakın almayın param çöp oldu rezalet.", "rating": 1, "date": "30 Mayıs 2026"},
        {"text": "Çok kötü bir satıcı, kargo gelmedi, ürün kırık çıktı berbat.", "rating": 1, "date": "30 Mayıs 2026"},
        {"text": "Hepsiburada'dan aldığım en kötü ürün kesinlikle tavsiye etmiyorum.", "rating": 1, "date": "30 Mayıs 2026"},
        {"text": "Ürün aşırı kalitesiz hemen iade talebi oluşturdum rezalet.", "rating": 1, "date": "30 Mayıs 2026"}
    ]
    
    # Orijinal platform puanı bu haksız 1-yıldızlar yüzünden (5*1 + 1*4)/5 = 1.8 olsun!
    res_campaign = detector.detect(mock_campaign, analyzer, 1.8)
    
    # Beklenti: 30 Mayıs'taki 4 adet yorum "Organize haksız karalama kampanyası" olarak flaglenecek.
    # Çift yönlü düzeltme formülüyle haksız 1-yıldızlar elenecek ve True Trust Score 5.0'a geri yükselecek!
    has_campaign_flag = any("Organize haksız karalama kampanyası" in r["reason"] for r in res_campaign["suspicious_reviews"])
    trust_score_restored = res_campaign["calculated_trust_score"] >= 4.5
    
    passed_campaign = has_campaign_flag and trust_score_restored
    print_result("Karalama Kampanyası Tespiti", has_campaign_flag, f"Şüpheli sayısı: {len(res_campaign['suspicious_reviews'])}")
    print_result("B2B Güven Skoru Restorasyonu (Yükseltme)", trust_score_restored, f"Yeni Güven Skoru: {res_campaign['calculated_trust_score']} / 5.0 (Orijinal: 1.8)")

    print("\n" + "=" * 60)
    print("Birim Testleri Tamamlandı!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()

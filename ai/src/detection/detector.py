import re
import logging
import numpy as np
from datetime import datetime, date
from collections import Counter
from typing import List, Dict, Any, Optional

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from ai.src.preprocessing.text_cleaner import clean_text, calculate_text_complexity

logger = logging.getLogger(__name__)

# Türkçe ay isimlerinin sayısal karşılıkları
TURKISH_MONTHS = {
    "ocak": 1, "şubat": 2, "mart": 3, "nisan": 4,
    "mayıs": 5, "haziran": 6, "temmuz": 7, "ağustos": 8,
    "eylül": 9, "ekim": 10, "kasım": 11, "aralık": 12
}

def parse_turkish_date(date_str: Any) -> Optional[date]:
    """
    Farklı formatlardaki Türkçe ve standart tarih dizilimlerini date nesnesine çevirir.
    Örnekler: "30 Mayıs 2026", "2026-05-30", "30.05.2026", "30/05/2026"
    """
    if not date_str:
        return None
    if isinstance(date_str, (date, datetime)):
        return date_str if isinstance(date_str, date) else date_str.date()
    
    date_str = str(date_str).strip().lower()
    
    # 1. ISO Formatı Kontrolü (YYYY-MM-DD)
    iso_match = re.match(r'^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$', date_str)
    if iso_match:
        try:
            return date(int(iso_match.group(1)), int(iso_match.group(2)), int(iso_match.group(3)))
        except ValueError:
            pass
            
    # 2. Standart Gün.Ay.Yıl Formatı Kontrolü (DD.MM.YYYY veya DD/MM/YYYY)
    dot_match = re.match(r'^(\d{1,2})[\./](\d{1,2})[\./](\d{4})$', date_str)
    if dot_match:
        try:
            return date(int(dot_match.group(3)), int(dot_match.group(2)), int(dot_match.group(1)))
        except ValueError:
            pass

    # 3. Türkçe Ay İsimli Format Kontrolü (Örn: "30 mayıs 2026")
    try:
        parts = date_str.split()
        if len(parts) >= 3:
            day_val = int(parts[0])
            month_name = parts[1]
            year_val = int(parts[2])
            
            month_val = TURKISH_MONTHS.get(month_name)
            if month_val:
                return date(year_val, month_val, day_val)
    except Exception as e:
        logger.debug(f"Türkçe tarih ayrıştırma hatası ({date_str}): {e}")
        
    return None

class ReviewDetector:
    """
    E-Ticaret yorum ve meta-verilerini analiz ederek sahte/bot ve rakip karalama kampanyalarını tespit eder.
    """
    def __init__(self, generic_keywords: List[str] = None):
        self.generic_keywords = generic_keywords or [
            "harika", "güzel", "bayıldım", "beğendim", "süper", "iyi", "tavsiye ederim", 
            "çok iyi", "başarılı", "fiyat performans", "kargo hızlı", "teşekkürler", 
            "kesinlikle alın", "hızlı kargo", "memnun kaldım"
        ]
        self.llm_phrases = [
            "sonuç olarak", "şunu belirtmek isterim ki", "özetle", "öncelikle", 
            "açıkçası", "mükemmel bir fiyat", "kesinlikle tavsiye", 
            "şiddetle tavsiye", "beklentilerimi fazlasıyla", "iyi bir seçenek"
        ]

    def detect(self, reviews: List[Dict[str, Any]], sentiment_analyzer, actual_platform_score: float = 4.5) -> Dict[str, Any]:
        """
        Gelen detaylı yorum listesini (detailed_reviews) analiz eder.
        
        Args:
            reviews (List[Dict]): Yorum listesi. Her yorum şu yapıda olmalıdır:
                {
                    "text": "yorum metni",
                    "rating": 5,           # (opsiyonel) 1-5 yıldız puanı
                    "date": "30 Mayıs 2026",# (opsiyonel) yorum tarihi
                    "author": "Y*** E***"   # (opsiyonel) yazar adı
                }
            sentiment_analyzer: NLP SentimentAnalyzer nesnesi.
            actual_platform_score: Platformdaki orijinal puan.
            
        Returns:
            Dict: Sonuç özeti ve şüpheli yorumların nedenleriyle birlikte listesi.
        """
        if not reviews:
            return {
                "suspicious_reviews": [],
                "bot_percentage": 0,
                "calculated_trust_score": actual_platform_score,
                "metrics": {
                    "total_reviews": 0,
                    "fake_positives": 0,
                    "fake_negatives": 0,
                    "duplicates": 0,
                    "time_spikes": 0,
                    "sentiment_mismatch": 0,
                    "generic_spam": 0,
                    "polarization_warning": False
                }
            }

        suspicious_map = {}  # {review_index: {"text": "...", "reasons": [...]}}
        n_reviews = len(reviews)
        
        # Ön hazırlık ve NLP Analizleri
        cleaned_texts = []
        complexities = []
        sentiments = []
        parsed_dates = []
        ratings = []
        is_verified_list = []
        polarization_warning = False
        
        for idx, r in enumerate(reviews):
            txt = r.get("text", "")
            cleaned = clean_text(txt)
            cleaned_texts.append(cleaned)
            
            comp = calculate_text_complexity(txt)
            complexities.append(comp)
            
            # NLP Duygu Analizi
            sent = sentiment_analyzer.analyze(cleaned) if cleaned else {"label": "NEUTRAL", "score": 0.5}
            sentiments.append(sent)
            
            # Tarih ve Yıldız Puanı Çıkarımı
            parsed_dates.append(parse_turkish_date(r.get("date")))
            
            try:
                ratings.append(int(r.get("rating")) if r.get("rating") is not None else None)
            except:
                ratings.append(None)
                
            # Onaylı Satın Alım (Verified Purchase)
            is_verified = r.get("is_verified", r.get("verified", None))
            is_verified_list.append(is_verified)

        # -------------------------------------------------------------
        # 1. Semantik Benzerlik Tespiti (TF-IDF & Cosine Similarity)
        # -------------------------------------------------------------
        import string
        duplicate_indices = set()
        
        valid_texts = []
        valid_indices = []
        for i, txt in enumerate(cleaned_texts):
            if txt and complexities[i]["word_count"] >= 3:
                valid_texts.append(txt)
                valid_indices.append(i)
                
        if len(valid_texts) > 1:
            try:
                vectorizer = TfidfVectorizer()
                tfidf_matrix = vectorizer.fit_transform(valid_texts)
                cosine_sim = cosine_similarity(tfidf_matrix)
                
                for i in range(len(valid_indices)):
                    for j in range(i + 1, len(valid_indices)):
                        if cosine_sim[i, j] > 0.80:  # Semantik benzerlik eşiği
                            idx_i = valid_indices[i]
                            idx_j = valid_indices[j]
                            duplicate_indices.add(idx_i)
                            duplicate_indices.add(idx_j)
            except Exception as e:
                logger.debug(f"TF-IDF Hesaplama hatası: {e}")
                
        for idx in duplicate_indices:
            self._add_suspicion(suspicious_map, idx, reviews[idx]["text"], 
                                "Organize botnet tespiti: Başka bir değerlendirme ile yüksek anlamsal (semantik) benzerlik içeriyor.")

        # -------------------------------------------------------------
        # 2. Duygu ve Puan Tutarsızlığı (Rating-Sentiment Mismatch)
        # -------------------------------------------------------------
        for i in range(n_reviews):
            rating = ratings[i]
            sent = sentiments[i]
            
            if rating is not None and sent["label"] not in ("UNKNOWN", "ERROR", "NEUTRAL"):
                # Pozitif puan verilmiş ama son derece negatif metin girilmiş
                if rating >= 4 and sent["label"] == "NEGATIVE" and sent["score"] > 0.85:
                    self._add_suspicion(suspicious_map, i, reviews[i]["text"], 
                                        f"Duygu-puan tutarsızlığı: {rating} yıldız verilmesine rağmen metin içeriği yapay zeka tarafından son derece olumsuz bulunmuştur.")
                # Negatif puan verilmiş ama son derece pozitif metin girilmiş
                elif rating <= 2 and sent["label"] == "POSITIVE" and sent["score"] > 0.85:
                    self._add_suspicion(suspicious_map, i, reviews[i]["text"], 
                                        f"Duygu-puan tutarsızlığı: {rating} yıldız verilmesine rağmen metin içeriği yapay zeka tarafından son derece olumlu bulunmuştur.")

        # -------------------------------------------------------------
        # 3. Boş/Şablon Övgü Tespiti (Generic Sentiment Spam)
        # -------------------------------------------------------------
        for i in range(n_reviews):
            comp = complexities[i]
            sent = sentiments[i]
            cleaned = cleaned_texts[i]
            
            if cleaned and comp["word_count"] <= 3 and sent["label"] == "POSITIVE" and sent["score"] > 0.90:
                # Şablon kelimeler içeriyor mu?
                has_generic = any(kw in cleaned for kw in self.generic_keywords)
                if has_generic:
                    self._add_suspicion(suspicious_map, i, reviews[i]["text"], 
                                        "Spam bot paterni: Aşırı kısa ve şablon niteliğinde olumlu övgü barındırıyor.")

        # -------------------------------------------------------------
        # 4. Zaman Serisi Yorum Patlaması (Temporal Burst/Swarm) & Rakip Karalama
        # -------------------------------------------------------------
        # Geçerli tarihe sahip yorumları grupla
        date_groups = {}
        for i, d in enumerate(parsed_dates):
            if d:
                date_groups.setdefault(d, []).append(i)
                
        # Toplam yorum sayısı yeterliyse zaman patlaması analizi yap
        if len(date_groups) >= 1:
            total_dated = sum(len(indices) for indices in date_groups.values())
            avg_per_day = total_dated / len(date_groups)
            
            for d, indices in date_groups.items():
                count = len(indices)
                # Koşul: Günlük yorum sayısı en az 3 olmalı ve ortalamanın 2.5 katını aşmalı (veya toplamın %40'ından fazla olmalı)
                is_spike = count >= 3 and (count > avg_per_day * 2.5 or count >= total_dated * 0.4)
                
                if is_spike:
                    # Bu gündeki yorumların duygu/yıldız dağılımına bakarak "Karalama" mı yoksa "Bot Şişirme" mi olduğunu anla
                    neg_count = 0
                    pos_count = 0
                    for idx in indices:
                        rating = ratings[idx]
                        sent = sentiments[idx]
                        
                        is_neg_rating = rating is not None and rating <= 2
                        is_neg_sent = sent["label"] == "NEGATIVE" and sent["score"] > 0.8
                        
                        if is_neg_rating or is_neg_sent:
                            neg_count += 1
                        else:
                            pos_count += 1
                            
                    # A. Rakip Karalama Kampanyası (Negative Swarm): Patlama günündeki yorumların %70'i negatifse
                    if neg_count >= 3 and neg_count / count >= 0.7:
                        for idx in indices:
                            rating = ratings[idx]
                            sent = sentiments[idx]
                            # Sadece negatif olanları rakip saldırısı olarak flagle
                            is_neg = (rating is not None and rating <= 2) or (sent["label"] == "NEGATIVE")
                            if is_neg:
                                self._add_suspicion(suspicious_map, idx, reviews[idx]["text"], 
                                                    "Organize haksız karalama kampanyası: Şüpheli bir rakip saldırısı dalgasına ait olumsuz değerlendirme.", 
                                                    is_fake_negative=True)
                                
                    # B. Standart Swarm (Olumlu Bot Yorum Bombardımanı): Patlama günündeki yorumların %70'i pozitifse
                    elif pos_count >= 3 and pos_count / count >= 0.7:
                        for idx in indices:
                            rating = ratings[idx]
                            sent = sentiments[idx]
                            # Sadece pozitif olanları flagle
                            is_pos = (rating is not None and rating >= 4) or (sent["label"] == "POSITIVE")
                            if is_pos:
                                self._add_suspicion(suspicious_map, idx, reviews[idx]["text"], 
                                                    "Yorum patlaması (Swarm): Kısa sürede gerçekleştirilen organize olumlu bot faaliyeti kümesine dahil.")

        # -------------------------------------------------------------
        # 5. Klasik NLP Kuralı & Yapay Zeka (LLM) Dili Tespiti
        # -------------------------------------------------------------
        for i in range(n_reviews):
            comp = complexities[i]
            cleaned = cleaned_texts[i]
            
            # LLM Tespiti: Jenerik kalıpların uzun metinlerde sık kullanılması
            if cleaned and comp["word_count"] > 10:
                llm_match = sum(1 for phrase in self.llm_phrases if phrase in cleaned)
                if llm_match >= 1 and sentiments[i]["label"] == "POSITIVE":
                    self._add_suspicion(suspicious_map, i, reviews[i]["text"], 
                                        "Yapay zeka (LLM) paterni: Doğal olmayan, jenerik AI üslubu barındıran övgü metni.")
            
            # Karakter tekrarı (anlamsız harf dizilimi)
            if comp["avg_word_length"] > 15:
                self._add_suspicion(suspicious_map, i, reviews[i]["text"], 
                                    "Yapay dil kalıbı: Anlamsız derecede uzun harf dizilimi içeriyor.")
            
            # Aşırı kelime tekrarı
            if cleaned:
                words = cleaned.split()
                if len(words) > 0:
                    most_common = Counter(words).most_common(1)[0]
                    if most_common[1] > 3 and sentiments[i]["label"] == "POSITIVE":
                        self._add_suspicion(suspicious_map, i, reviews[i]["text"], 
                                            f"Yapay anlatım: Aşırı kelime tekrarı ('{most_common[0]}' kelimesi {most_common[1]} kez geçti).")

        # -------------------------------------------------------------
        # 6. U-Tipi Kutuplaşma (Polarization) Analizi
        # -------------------------------------------------------------
        valid_ratings_only = [r for r in ratings if r is not None]
        if len(valid_ratings_only) >= 5:
            count_1_5 = sum(1 for r in valid_ratings_only if r in [1, 5])
            count_2_3_4 = sum(1 for r in valid_ratings_only if r in [2, 3, 4])
            
            if count_1_5 / len(valid_ratings_only) > 0.75 and count_2_3_4 <= len(valid_ratings_only) * 0.25:
                polarization_warning = True
                for i in range(n_reviews):
                    rating = ratings[i]
                    if rating == 5 and i in suspicious_map:
                        self._add_suspicion(suspicious_map, i, reviews[i]["text"], "U-Tipi Anomali: Şüpheli bot şişirmesi bölgesinde (Kutuplaşmış Ürün).")
                    elif rating == 1 and i in suspicious_map:
                        self._add_suspicion(suspicious_map, i, reviews[i]["text"], "U-Tipi Anomali: Şüpheli karalama bölgesinde (Kutuplaşmış Ürün).", is_fake_negative=True)

        # -------------------------------------------------------------
        # ÇIKIŞ OLUŞTURMA VE ÇİFT YÖNLÜ GÜVEN SKORU HESABI
        # -------------------------------------------------------------
        suspicious_list = []
        fake_positives_count = 0
        fake_negatives_count = 0
        
        for idx, item in suspicious_map.items():
            is_fake_neg = item.get("is_fake_negative", False)
            if is_fake_neg:
                fake_negatives_count += 1
            else:
                fake_positives_count += 1
                
            suspicious_list.append({
                "text": item["text"],
                "reason": " ve ".join(item["reasons"])
            })

        # Toplam şüpheli oranı
        bot_percentage = int(((fake_positives_count + fake_negatives_count) / max(1, n_reviews)) * 100)

        # Çift Yönlü Güven Skoru (True Trust Score) Formülü:
        # - Sahte Olumlu (Spam/Bot) yorumların oyu (5.0) toplamdan elenerek puan düşürülür.
        # - Rakip Karalama (Haksız Negatif) yorumların oyu (1.0) toplamdan elenerek puan yükseltilir.
        total_ratings = n_reviews
        # Verified Purchase (Onaylı Satın Alım) Ceza Katsayısı
        # Eğer sahte pozitiflerin çoğu onaylı satın alım DEĞİLSE, cezayı artır
        unverified_bots = sum(1 for idx, item in suspicious_map.items() if not item.get("is_fake_negative", False) and is_verified_list[idx] is False)
        
        # Ağırlıklandırılmış bot yorum sayısı (Doğrulanmamış botlar x 1.5 ceza puanı)
        suspected_bot_ratings = fake_positives_count + (unverified_bots * 0.5)
        suspected_attack_ratings = fake_negatives_count
        
        organic_ratings_count = max(0, total_ratings - suspected_bot_ratings - suspected_attack_ratings)
        
        if organic_ratings_count <= 0 or total_ratings == 0:
            true_trust_score = actual_platform_score
        else:
            total_points = total_ratings * actual_platform_score
            
            # Sahte pozitifler 5.0 puan ile şişirmiş olsun
            bot_points = suspected_bot_ratings * 5.0
            # Rakip karalamalar 1.0 puan ile baltalamış olsun
            attack_points = suspected_attack_ratings * 1.0
            
            organic_points = max(0.0, total_points - bot_points - attack_points)
            calculated_score = organic_points / organic_ratings_count
            true_trust_score = round(max(1.0, min(5.0, calculated_score)), 1)

        # Metriklerin toplanması
        metrics = {
            "total_reviews": n_reviews,
            "fake_positives": fake_positives_count,
            "fake_negatives": fake_negatives_count,
            "bot_percentage": bot_percentage,
            "polarization_warning": polarization_warning
        }

        return {
            "suspicious_reviews": suspicious_list,
            "bot_percentage": bot_percentage,
            "calculated_trust_score": true_trust_score,
            "metrics": metrics
        }

    def _add_suspicion(self, suspicious_map: dict, idx: int, text: str, reason: str, is_fake_negative: bool = False):
        if idx not in suspicious_map:
            suspicious_map[idx] = {
                "text": text,
                "reasons": [],
                "is_fake_negative": False
            }
        if reason not in suspicious_map[idx]["reasons"]:
            suspicious_map[idx]["reasons"].append(reason)
        # Eğer bir kural bile bunu negatif kampanya olarak flaglediyse, True olarak korunsun
        if is_fake_negative:
            suspicious_map[idx]["is_fake_negative"] = True

import asyncio
import uuid
import logging
import random
from typing import Dict
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request

from app.models.schemas import ScanRequest, ScanResponse, ScanStatusResponse
from app.services.scraper import PlaywrightScraper

logger = logging.getLogger(__name__)

router = APIRouter()
TASKS_DB: Dict[str, dict] = {}

async def _run_analysis_pipeline(task_id: str, url: str, sentiment_analyzer):
    try:
        scraper = PlaywrightScraper(url)
        
        TASKS_DB[task_id]["status"] = "PROCESSING"
        TASKS_DB[task_id]["current_step"] = "1/3: Ürün Sayfası Headless Tarayıcı İle Taranıyor (Bu işlem uzun sürebilir)..."
        TASKS_DB[task_id]["progress"] = 15
        
        await scraper.fetch_page()
        actual_platform_score = scraper.extract_score()
        total_ratings, total_reviews = scraper.extract_metrics()
        
        TASKS_DB[task_id]["current_step"] = "1/3: Dinamik DOM Verileri İşleniyor..."
        TASKS_DB[task_id]["progress"] = 35
        
        real_comments = scraper.extract_real_comments()
        
        # Gerçek yorum sayısı, sitedeki (JSON-LD) resmi "total_reviews" ile sınırlanmalı!
        true_review_count = total_reviews if total_reviews > 0 else len(real_comments)
        
        TASKS_DB[task_id]["current_step"] = f"2/3: NLP Analizi Yapılıyor ({true_review_count} organik değerlendirme)..."
        TASKS_DB[task_id]["progress"] = 60
        
        from ai.src.preprocessing.text_cleaner import clean_text, calculate_text_complexity
        from collections import Counter
        
        suspicious_list = []
        
        # Eğer üründe 2 veya daha az yorum varsa, bot tehlikesi ASLA YOKTUR.
        if true_review_count <= 2:
            bot_percentage = 0
            true_trust_score = actual_platform_score
        else:
            # GERÇEK AI NLP ANALİZİ
            for comment in real_comments:
                cleaned = clean_text(comment)
                if not cleaned: continue
                
                complexity = calculate_text_complexity(comment)
                sentiment_result = sentiment_analyzer.analyze(cleaned)
                
                is_suspicious = False
                reasons = []
                
                # Aşırı tekrarlı/anlamsız karakter ve aşırı pozitiflik bot belirtisidir
                if complexity["avg_word_length"] > 15:
                    is_suspicious = True
                    reasons.append("Anlamsız ve aşırı uzun harf dizilimi içeriyor")
                
                if complexity["word_count"] < 3 and sentiment_result["label"] == "POSITIVE" and sentiment_result["score"] > 0.95:
                    is_suspicious = True
                    reasons.append("Aşırı kısa ama kesin pozitif (Spam bot paterni)")
                
                words = cleaned.split()
                if len(words) > 0:
                    most_common = Counter(words).most_common(1)[0]
                    if most_common[1] > 3 and sentiment_result["label"] == "POSITIVE":
                        is_suspicious = True
                        reasons.append(f"Aşırı kelime tekrarı ('{most_common[0]}' kelimesi {most_common[1]} kez geçti)")
                
                # Sadece pozitif olan ve şüpheli olanları listeye al
                if is_suspicious and sentiment_result["label"] == "POSITIVE":
                    suspicious_list.append({
                        "text": comment,
                        "reason": " ve ".join(reasons) + f" (AI Güveni: {round(sentiment_result['score']*100)}%)"
                    })

            safe_bot_count = len(suspicious_list)
            bot_percentage = int((safe_bot_count / max(1, len(real_comments))) * 100)
            
            # GERÇEK GÜVEN SKORU MATEMATİĞİ (Bot etkisini çıkarma)
            num_ratings = total_ratings if total_ratings > 0 else true_review_count
            suspected_bot_ratings = int(num_ratings * (bot_percentage / 100.0))
            organic_ratings_count = max(0, num_ratings - suspected_bot_ratings)
            
            if organic_ratings_count <= 0 or num_ratings == 0:
                true_trust_score = actual_platform_score
            else:
                total_points = num_ratings * actual_platform_score
                bot_vote_value = 5.0 if actual_platform_score >= 3.0 else 1.0
                bot_points = suspected_bot_ratings * bot_vote_value
                organic_points = max(0, total_points - bot_points)
                calculated_score = organic_points / organic_ratings_count
                true_trust_score = round(max(1.0, min(5.0, calculated_score)), 1)

        TASKS_DB[task_id]["current_step"] = "3/3: Ağ Analizi Tamamlanıyor..."
        TASKS_DB[task_id]["progress"] = 85
        await asyncio.sleep(1.0)

        TASKS_DB[task_id]["status"] = "COMPLETED"
        TASKS_DB[task_id]["progress"] = 100
        TASKS_DB[task_id]["current_step"] = "Analiz Tamamlandı!"
        TASKS_DB[task_id]["result"] = {
            "platform_score": actual_platform_score, 
            "true_trust_score": true_trust_score,
            "bot_percentage": bot_percentage,
            "total_ratings": total_ratings,
            "total_reviews": true_review_count,
            "suspicious_reviews": suspicious_list
        }
        
    except Exception as e:
        logger.error(f"Hata: {str(e)}")
        TASKS_DB[task_id]["status"] = "FAILED"
        TASKS_DB[task_id]["error_message"] = str(e)

@router.post("/", response_model=ScanResponse)
async def start_scan(request_data: ScanRequest, background_tasks: BackgroundTasks, request: Request):
    sentiment_analyzer = request.app.state.sentiment_analyzer
    task_id = str(uuid.uuid4())
    TASKS_DB[task_id] = {
        "status": "QUEUED",
        "progress": 0,
        "current_step": "Sıraya Alındı",
        "result": None,
        "error_message": None
    }
    background_tasks.add_task(_run_analysis_pipeline, task_id, str(request_data.url), sentiment_analyzer)
    return ScanResponse(task_id=task_id, message="Sıraya alındı.")

@router.get("/{task_id}", response_model=ScanStatusResponse)
async def check_scan_status(task_id: str):
    task = TASKS_DB.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Bulunamadı")
    return ScanStatusResponse(
        task_id=task_id, status=task["status"], progress_percentage=task["progress"],
        current_step=task["current_step"], result=task["result"], error_message=task["error_message"]
    )

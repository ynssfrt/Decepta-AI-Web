from pydantic import BaseModel, HttpUrl
from typing import Optional, List, Dict, Any

class ScanRequest(BaseModel):
    url: HttpUrl
    platform: Optional[str] = None 

class ScanResponse(BaseModel):
    task_id: str
    message: str
    status: str = "PENDING"

class ScanStatusResponse(BaseModel):
    task_id: str
    status: str                     
    progress_percentage: int        
    current_step: str               
    
    # Güncellenmiş Result Şeması
    result: Optional[Dict[str, Any]] = None 
    error_message: Optional[str] = None
    
# Gerçek zamanlı API Sonuç Yapısı Beklentisi (Dokümantasyon/Type Hint Tarafı İçin)
# result = {
#   "platform_score": 4.5,
#   "true_trust_score": 3.2,
#   "bot_percentage": 20,
#   "total_ratings": 1500,     # Yorumsuz puan verenler dahil
#   "total_reviews": 50,       # Sadece yazılı yorumlar
#   "suspicious_reviews": [
#       {
#           "text": "Kesinlikle alın harika bir ürün kargo çok hızlıydı şüpheli şekilde aynı kelimeler.",
#           "reason": "Toplu bot ağlarında çok sık kullanılan yapay (N-Gram) cümle dizilimi tespit edildi."
#       }
#   ]
# }

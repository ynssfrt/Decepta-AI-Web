import logging
import urllib.request
from io import BytesIO
import imagehash
from PIL import Image

logger = logging.getLogger(__name__)

class ImageAnalyzer:
    """
    Yorumlardaki fotoğrafların hash değerlerini çıkarıp, 
    kopya görsel (farklı hesaplardan yüklenen aynı görsel) tespitini yapar.
    ImageHash (pHash) kullanılarak kırpılmış, çözünürlüğü değişmiş veya filtrelenmiş 
    aynı görselleri de tespit eder.
    """
    def __init__(self):
        self.hashes = {} # {hash_string: [image_url1, image_url2]}
        
    def download_image(self, url: str) -> Image.Image:
        try:
            req = urllib.request.Request(
                url, 
                headers={'User-Agent': 'Mozilla/5.0'}
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                img_data = response.read()
                return Image.open(BytesIO(img_data))
        except Exception as e:
            logger.warning(f"Resim indirilemedi veya işlenemedi ({url}): {e}")
            return None

    def analyze_images(self, reviews_with_images: list) -> list:
        suspicious_list = []
        self.hashes = {}
        
        for review in reviews_with_images:
            images = review.get('images', [])
            if not images:
                continue
                
            is_duplicate_found = False
            
            for img_url in images:
                img = self.download_image(img_url)
                if not img:
                    continue
                
                try:
                    # Perceptual hash ile görüntünün anlamsal özetini çıkarıyoruz
                    # Bu sayede ufak kırpmalar ve filtreler phash değerini değiştirmez
                    h_obj = imagehash.phash(img)
                    h_str = str(h_obj)
                except Exception as e:
                    logger.error(f"pHash çıkarma hatası: {e}")
                    continue
                
                matched = False
                
                # ImageHash objelerinin farkını (hamming distance) hesaplayarak yakınlık bul
                for existing_h_str in self.hashes.keys():
                    existing_h_obj = imagehash.hex_to_hash(existing_h_str)
                    
                    # Hamming distance <= 5 ise görseller %95 aynıdır (kopya/çalıntı)
                    if h_obj - existing_h_obj <= 5:
                        self.hashes[existing_h_str].append(img_url)
                        matched = True
                        is_duplicate_found = True
                        break
                        
                if not matched:
                    self.hashes[h_str] = [img_url]
                    
            # Ek Mantık: Resim var ama yorum metni çok kısa veya boş
            text = review.get('text', '').strip()
            is_empty_text = len(text) < 3
            
            if is_duplicate_found:
                suspicious_list.append({
                    "text": text or "[Sadece Görsel]",
                    "reason": "Organize Bot Ağı Tespiti: Birebir kopya veya manipüle edilmiş (kırpılmış/filtrelenmiş) çalıntı görsel kullanımı."
                })
            elif is_empty_text and images:
                suspicious_list.append({
                    "text": text or "[Sadece Görsel]",
                    "reason": "Düşük Güvenlikli Değerlendirme: Betimleyici metin içermeyen şüpheli görsel paylaşımı."
                })
                
        return suspicious_list

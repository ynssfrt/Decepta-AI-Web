import logging
import urllib.request
from io import BytesIO
import imagehash
from PIL import Image
import os
import google.generativeai as genai

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
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.vision_model = None
        if self.api_key:
            try:
                genai.configure(api_key=self.api_key)
                self.vision_model = genai.GenerativeModel('gemini-2.5-flash')
            except Exception as e:
                logger.warning(f"Gemini Vision başlatılamadı: {e}")
        
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

    def analyze_images(self, reviews_with_images: list, product_title: str = "") -> list:
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
                
                # ---- YENİ: Gemini Vision ile Ürün/Görsel Tutarlılık Kontrolü ----
                if self.vision_model and product_title and product_title != "Bilinmeyen Ürün" and not review.get('_gemini_flagged'):
                    try:
                        prompt = f"Sen bir e-ticaret sahte yorum dedektifisin. Ürün adı: '{product_title}'. Görevin, müşterinin yüklediği bu fotoğrafın gerçekten bu ürüne (veya ürünün paketine, kurulumuna) ait olup olmadığını tespit etmektir. Eğer fotoğraftaki ana obje bu ürün DEĞİLSE (örneğin ürünü gösteren hiçbir şey yoksa, sadece bir emoji, gülücük, alakasız bir manzara, ekran görüntüsü veya tamamen BAŞKA bir ürün varsa) kesinlikle 'HAYIR' cevabını vermelisin. Fotoğrafta ürün görünüyorsa 'EVET' de. Cevabın SADECE 'EVET' veya 'HAYIR' kelimelerinden biri olmalıdır, nokta bile koyma."
                        response = self.vision_model.generate_content([prompt, img])
                        if response and response.text and "HAYIR" in response.text.upper():
                            logger.info(f"Gemini Vision alakasız görsel yakaladı: {product_title} için uygun değil.")
                            suspicious_list.append({
                                "text": review.get('text', '')[:100] + "..." if review.get('text') else "[Sadece Görsel]",
                                "reason": f"Yapay Zeka Görsel Analizi: Görseldeki içerik ürün ile eşleşmiyor veya alakasız. (Ürün: {product_title})"
                            })
                            review['_gemini_flagged'] = True
                            # Alakasız bulunduysa diğer fotoğraflara veya işlemlere geçebiliriz
                    except Exception as e:
                        logger.error(f"Gemini Vision analizi sırasında hata: {e}")
                    
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

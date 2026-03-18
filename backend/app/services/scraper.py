import asyncio
import logging
import re
from playwright.async_api import async_playwright

logger = logging.getLogger(__name__)

class PlaywrightScraper:
    """
    E-Ticaret sitelerindeki dinamik React/SPA yapılarını (Trendyol, Amazon vb.)
    gerçek bir tarayıcı ile okuyup (Headless Chromium) sayfadaki gerçek metinleri,
    değerlendirme sayısını ve yorum sayısını kazıyan sınıf.
    """
    def __init__(self, url: str):
        self.url = str(url)
        self.html_content = ""
        self.text_content = ""

    async def fetch_page(self):
        """Headless tarayıcıyla siteye gidip DOM'un yüklenmesini (JS) bekler ve sayfayı okur."""
        try:
            logger.info(f"Playwright ile canlı tarayıcı başlatılıyor: {self.url}")
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                )
                
                # E-ticaret siteleri yavaştır, timeout artırdık ve domcontentloaded bekliyoruz
                await page.goto(self.url, wait_until="domcontentloaded", timeout=45000)
                
                # Dinamik yorumların yüklenmesi için asgari 2.5 saniye ek süre tanı (Scroll simülasyonu)
                await page.evaluate("window.scrollTo(0, document.body.scrollHeight / 3)")
                await page.wait_for_timeout(1500)
                await page.evaluate("window.scrollTo(0, document.body.scrollHeight / 1.5)")
                await page.wait_for_timeout(1000)

                self.html_content = await page.content()
                
                # Sayfada görünen TÜM metni tek hamlede alıyoruz (Regex ile ayrıştırmak için)
                self.text_content = await page.evaluate("document.body.innerText")
                
                await browser.close()
                logger.info("Tarayıcı işlemi başarıyla tamamlandı.")
        except Exception as e:
            logger.error(f"Playwright Hatası: {str(e)}")

    def extract_score(self) -> float:
        """Sayfadaki tüm metin içinde ilk veya en belirgin 1.0 - 5.0 skoru bulur."""
        if not self.text_content:
            return 4.5
        # "4.2", "4,2", "Puan: 4.8" gibi metinleri tarar
        match = re.search(r'(?<![0-9])([1-4][.,][0-9]|5[.,]0)(?![0-9])', self.text_content)
        if match:
            extracted = float(match.group(1).replace(',', '.'))
            if 1.0 <= extracted <= 5.0:
                return extracted
        return 4.5

    def extract_metrics(self) -> tuple:
        """
        Değerlendirme sayısı ve Yorum sayısını ayıklamaya çalışır.
        Örn: "150 değerlendirme", "32 yorum" şeklindeki Türkçe metinleri Regex ile arar.
        """
        total_ratings = 0
        total_reviews = 0
        
        if not self.text_content:
            return 0, 0
            
        t_lower = self.text_content.lower()
        
        # Değerlendirme sayısı arayışı (Örn: "2.345 değerlendirme")
        rating_match = re.search(r'([0-9.,]+)\s+(?:değerlendirme|oy|kişi)', t_lower)
        if rating_match:
            try:
                raw_num = rating_match.group(1).replace('.', '').replace(',', '')
                total_ratings = int(raw_num)
            except: pass
            
        # Yorum sayısı arayışı (Örn: "124 yorum")
        review_match = re.search(r'([0-9.,]+)\s+(?:yorum|soru)', t_lower)
        if review_match:
            try:
                raw_num = review_match.group(1).replace('.', '').replace(',', '')
                total_reviews = int(raw_num)
            except: pass
            
        return total_ratings, total_reviews

    def extract_real_comments(self) -> list:
        """
        Görsel e-ticaret sitelerinden kopyalanan saf metinden anlamlı "Yorum" olabilecek paragrafları çeker.
        """
        if not self.text_content:
            return []
            
        lines = self.text_content.split('\n')
        comments = []
        
        for line in lines:
            line = line.strip()
            # Gerçek yoruma benzeyen metin: 30-600 karakter arası, içinde en az 4 boşluk(kelime) olan metin
            if 30 <= len(line) <= 600 and line.count(' ') > 4:
                # E-ticaret link/spam kelimeleri
                bad_words = ["ücretsiz", "kargo", "sepete ekle", "taksit", "giriş yap", "üye ol", "favoriye ekle", "stokta"]
                if not any(bw in line.lower() for bw in bad_words):
                    comments.append(line)
                    
        return list(set(comments))

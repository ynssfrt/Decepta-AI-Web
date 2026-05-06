from app.services.image_analyzer import ImageAnalyzer
import logging

logging.basicConfig(level=logging.INFO)

analyzer = ImageAnalyzer()

data = [
    {
        "text": "orijinal",
        "images": ["https://via.placeholder.com/150/0000FF/808080?text=Resim1"]
    },
    {
        "text": "kopya 1",
        "images": ["https://via.placeholder.com/150/FF0000/FFFFFF?text=SahteResim"]
    },
    {
        "text": "kopya 2",
        "images": ["https://via.placeholder.com/150/FF0000/FFFFFF?text=SahteResim"]
    }
]

print("Analiz ediliyor...")
res = analyzer.analyze_images(data)
print("Sonuc:", res)

import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../")))

from ai.src.sentiment.analyzer import SentimentAnalyzer
from ai.src.preprocessing.text_cleaner import clean_text

if __name__ == "__main__":
    print("Yapay Zeka Modeli yükleniyor...")
    analyzer = SentimentAnalyzer()
    
    test_text = "ürün harikaaa çok beğendiiim kesinlikle alınmalı"
    cleaned = clean_text(test_text)
    print(f"Cleaned Text: {cleaned}")
    
    result = analyzer.analyze(cleaned)
    print(f"Result: {result}")
    
    test_neg = "berbat bir ürün, hemen iade ettim"
    print(f"Neg Result: {analyzer.analyze(clean_text(test_neg))}")
    
    print("Test Başarılı!")

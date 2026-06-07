import sys
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from dotenv import load_dotenv

# Env dosyalarını yükle
load_dotenv()

# Add ai package to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from app.routers import scanner, history
from ai.src.sentiment.analyzer import SentimentAnalyzer
from app.database import engine
from app.models import scan_db

# Veritabanı tablolarını oluştur
scan_db.Base.metadata.create_all(bind=engine)

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Uygulama başlarken modeli yükle
    logger.info("Yapay zeka modeli yükleniyor...")
    app.state.sentiment_analyzer = SentimentAnalyzer()
    yield
    # Kapanırken yapılacaklar
    logger.info("Uygulama kapanıyor...")

app = FastAPI(
    title="Decepta AI - Backend API",
    description="E-Ticaret Sahte Yorum ve Bot Ağı Tespit Platformu Merkezi API'si",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Ayarları: Web Dashboard ve Mobile App'in lokalde/sunucuda API'ye erişebilmesi için
origins = [
    "http://localhost:3000",      # React / Next.js Web Dashboard
    "http://localhost:5173",      # Vite default
    "http://localhost:8080",
    "*"                           # Geliştirme aşamasında her şeye açık, canlıda kısıtlanmalı
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router'ları (Endpoint Kontrolcüleri) ana uygulamaya bağlıyoruz
app.include_router(scanner.router, prefix="/api/v1/scan", tags=["Scanner"])
app.include_router(history.router, prefix="/api/v1/history", tags=["History"])

@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "Decepta AI Backend Servisi Çalışıyor.",
        "docs": "/docs"
    }

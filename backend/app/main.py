import sys
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

# Add ai package to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from app.routers import scanner
from ai.src.sentiment.analyzer import SentimentAnalyzer

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

@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "Decepta AI Backend Servisi Çalışıyor.",
        "docs": "/docs"
    }

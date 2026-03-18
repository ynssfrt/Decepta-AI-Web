<p align="center">
  <h1 align="center">🕵️ Decepta AI — Web Dashboard</h1>
  <p align="center">
    <strong>E-Ticaret Sahte Yorum ve Bot Ağı Tespit Platformu</strong>
  </p>
  <p align="center">
    <a href="#teknoloji-yığını">Tech Stack</a> •
    <a href="#mimari">Mimari</a> •
    <a href="#kurulum">Kurulum</a> •
    <a href="#yol-haritası">Yol Haritası</a>
  </p>
</p>

---

## 📋 Proje Hakkında

Decepta AI, e-ticaret platformlarındaki sahte yorumları ve organize bot ağlarını tespit eden yapay zekâ destekli bir analiz platformudur.

Bu repo, **satıcılar ve analistler** için tasarlanmış **Web Dashboard** arayüzünü, backend API'yi ve yapay zekâ modüllerini içerir.

### Temel Özellikler

| Özellik | Açıklama |
|:---|:---|
| 🤖 **Duygu Analizi** | HuggingFace transformer modelleri ile Türkçe/İngilizce yorum analizi |
| 🕸️ **Bot Ağı Tespiti** | Neo4j graph veritabanı ile organize sahte yorum ağlarının görselleştirilmesi |
| 📊 **Zaman Serisi Analizi** | Yorum patlamalarının ve manipülatif kampanyaların tespiti |
| 🎯 **Güven Skoru** | NLP + Graph + Zaman Serisi verilerini harmanlayan çok katmanlı skor |
| 🔍 **Web Scraping** | E-ticaret sitelerinden otomatik yorum toplama |

---

## 🛠️ Teknoloji Yığını

| Katman | Teknoloji |
|:---|:---|
| **Yapay Zekâ** | Python, Scikit-learn, HuggingFace Transformers |
| **Backend** | FastAPI (Asenkron REST API) |
| **Veritabanı** | PostgreSQL + Neo4j (Graph DB) |
| **Frontend** | React.js / Next.js |
| **Veri Toplama** | Web Scraping Botları (BeautifulSoup, Selenium) |

---

## 🏗️ Mimari

```
Decepta-AI-Web/
├── ai/                    # Yapay zekâ modülleri
│   ├── src/
│   │   ├── preprocessing/ # Veri temizleme & tokenization
│   │   ├── sentiment/     # Duygu analizi modelleri
│   │   └── graph_analysis/# Neo4j ağ analizi
│   ├── tests/             # AI birim testleri
│   └── notebooks/         # Jupyter deney defterleri
│
├── backend/               # FastAPI REST API
│   └── app/
│       ├── main.py
│       ├── routers/       # API endpoint'leri
│       ├── models/        # Veritabanı modelleri
│       └── services/      # İş mantığı servisleri
│
├── web/                   # Next.js web dashboard
│   └── src/
│
└── docs/                  # Proje dokümantasyonu
```

---

## 🚀 Kurulum

### Gereksinimler

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Neo4j 5+

### AI & Backend Kurulumu

```bash
# AI bağımlılıklarını yükle
cd ai
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Backend'i başlat
cd ../backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Web Frontend Kurulumu

```bash
cd web
npm install
npm run dev
```

---

## 🗺️ Yol Haritası

| Hafta | Kapsam | Durum |
|:---:|:---|:---:|
| 1 | Proje kurulumu, veri araştırması, NLP metodoloji | ✅ |
| 2 | Veritabanı şemaları, UI wireframe | ⬜ |
| 3 | Veri ön işleme pipeline | ⬜ |
| 4 | HuggingFace duygu analizi | ⬜ |
| 5 | Neo4j entegrasyonu, graph algoritmaları | ⬜ |
| 6 | Web scraping servisi | ⬜ |
| 7 | FastAPI backend kurulumu | ⬜ |
| 9 | Next.js web dashboard | ⬜ |
| 10 | E2E testler ve simülasyonlar | ⬜ |
| 11 | Cloud deployment, MVP lansman | ⬜ |

---

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) ile lisanslanmıştır.

---

<p align="center">
  <sub>Decepta AI © 2025 — E-ticaretin güvenilirliğini yapay zekâ ile koruyoruz.</sub>
</p>

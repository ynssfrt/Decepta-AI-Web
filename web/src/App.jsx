import { useState } from 'react'
import './App.css'

function App() {
    const [url, setUrl] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showResults, setShowResults] = useState(false);

    const handleAnalyze = () => {
        if (!url) return;
        setIsAnalyzing(true);
        // Mock the analysis delay
        setTimeout(() => {
            setIsAnalyzing(false);
            setShowResults(true);
        }, 2500);
    };

    return (
        <div className="dashboard-container">
            <header>
                <h1>Decepta AI</h1>
                <p>B2B Analist Paneli & Ağ Tespiti</p>
            </header>

            <main>
                <div className="search-container">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Analiz edilecek ürün URL'sini yapıştırın (örn: trendyol.com/...)"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                    />
                    <button
                        className="search-button"
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                    >
                        {isAnalyzing ? "Analiz Ediliyor..." : "Sistemi Tarat"}
                    </button>
                </div>

                {showResults && (
                    <div className="results-grid">
                        {/* Trust Score Card */}
                        <div className="glass-card">
                            <h3>Gerçek Güven Skoru</h3>
                            <div className="score-display">
                                <span className="score-value danger">2.3</span>
                                <span className="score-max">/ 5.0</span>
                            </div>
                            <div className="bot-percentage">
                                ⚠ Yorumların %65'i şüpheli ağlardan geliyor!
                            </div>
                        </div>

                        {/* Keyword Card */}
                        <div className="glass-card">
                            <h3>Şüpheli NLP Şablonları</h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                                Bot ağlarının en çok kullandığı kelime öbekleri:
                            </p>
                            <div className="words-list">
                                <span className="word-tag">mükemmel sorunsuz</span>
                                <span className="word-tag">kesin alın aldırın</span>
                                <span className="word-tag">kargosu uçak gibi</span>
                                <span className="word-tag">harikaaaaa bayıldım</span>
                            </div>
                        </div>

                        {/* Platform Score Card (For contrast) */}
                        <div className="glass-card">
                            <h3>E-Ticaret Sitesi Skoru</h3>
                            <div className="score-display">
                                <span className="score-value safe">4.8</span>
                                <span className="score-max">/ 5.0</span>
                            </div>
                            <p style={{ color: 'var(--text-muted)', marginTop: '1rem', fontSize: '0.9rem' }}>
                                Manipüle edilmiş ürün değerlendirme ortalaması.
                            </p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}

export default App

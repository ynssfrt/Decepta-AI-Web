import { useState, useEffect } from 'react'
import './App.css'

function App() {
    const [url, setUrl] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showResults, setShowResults] = useState(false);

    // Polling states
    const [taskId, setTaskId] = useState(null);
    const [progress, setProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // Final Results
    const [analysisResult, setAnalysisResult] = useState(null);

    const API_BASE_URL = 'http://127.0.0.1:8000/api/v1/scan';

    const startAnalysis = async () => {
        if (!url.trim()) return;

        setIsAnalyzing(true);
        setShowResults(false);
        setProgress(0);
        setCurrentStep('Backend bağlantısı kuruluyor...');
        setErrorMsg('');
        setAnalysisResult(null);

        try {
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url.trim() })
            });

            if (!response.ok) throw new Error("API'ye bağlanılamadı.");

            const data = await response.json();
            setTaskId(data.task_id);
        } catch (err) {
            setErrorMsg(err.message || 'Bir hata oluştu.');
            setIsAnalyzing(false);
        }
    };

    // Listen task status
    useEffect(() => {
        let intervalId;

        if (taskId && isAnalyzing) {
            intervalId = setInterval(async () => {
                try {
                    const res = await fetch(`${API_BASE_URL}/${taskId}`);
                    if (!res.ok) throw new Error("Durum kontrolünde hata.");

                    const data = await res.json();

                    setProgress(data.progress_percentage);
                    setCurrentStep(data.current_step);

                    if (data.status === 'COMPLETED') {
                        setIsAnalyzing(false);
                        setAnalysisResult(data.result);
                        setShowResults(true);
                        setTaskId(null);
                        clearInterval(intervalId);
                    } else if (data.status === 'FAILED') {
                        throw new Error(data.error_message || "Sunucu hatası.");
                    }
                } catch (err) {
                    setErrorMsg(err.message || "Bağlantı koptu.");
                    setIsAnalyzing(false);
                    setTaskId(null);
                    clearInterval(intervalId);
                }
            }, 2000); // 2 seconds poll
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [taskId, isAnalyzing]);

    return (
        <div className="dashboard-container">
            <header>
                <h1>Decepta AI</h1>
                <p>B2B Analist Paneli & Ağ Tespiti (Gerçek Zamanlı)</p>
            </header>

            <main>
                <div className="search-container">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Analiz edilecek ürün URL'sini yapıştırın (örn: trendyol.com/...)"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={isAnalyzing}
                    />
                    <button
                        className="search-button"
                        onClick={startAnalysis}
                        disabled={isAnalyzing || !url.trim()}
                    >
                        {isAnalyzing ? "Analiz Ediliyor..." : "Sistemi Tarat"}
                    </button>
                </div>

                {errorMsg && (
                    <div style={{ color: "var(--accent-red)", textAlign: "center", marginBottom: "2rem" }}>
                        ❌ {errorMsg}
                    </div>
                )}

                {isAnalyzing && (
                    <div className="glass-card" style={{ marginBottom: '2rem', textAlign: 'center' }}>
                        <h3 style={{ color: 'var(--accent-blue)', marginBottom: '1rem' }}>{currentStep}</h3>
                        <div style={{ background: 'var(--bg-dark)', borderRadius: '10px', height: '20px', overflow: 'hidden' }}>
                            <div style={{
                                background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-green))',
                                height: '100%',
                                width: `${progress}%`,
                                transition: 'width 0.5s ease'
                            }} />
                        </div>
                        <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>%{progress} Tamamlandı</p>
                    </div>
                )}

                {showResults && analysisResult && (
                    <div className="results-grid">
                        <div className="glass-card">
                            <h3>Gerçek Güven Skoru</h3>
                            <div className="score-display">
                                <span className={`score-value ${analysisResult.true_trust_score < 3.0 ? 'danger' : 'safe'}`}>
                                    {analysisResult.true_trust_score}
                                </span>
                                <span className="score-max">/ 5.0</span>
                            </div>
                            <div className="bot-percentage">
                                ⚠ {analysisResult.analyzed_reviews} yorum içinde %{analysisResult.bot_percentage} şüpheli ağ tespiti!
                            </div>
                        </div>

                        <div className="glass-card">
                            <h3>Şüpheli NLP Şablonları</h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                                Zaman serisi ve AI modeli tarafından yakalanan tekrar eden öbekler:
                            </p>
                            <div className="words-list">
                                {analysisResult.suspicious_patterns.map((word, idx) => (
                                    <span key={idx} className="word-tag">{word}</span>
                                ))}
                            </div>
                        </div>

                        <div className="glass-card">
                            <h3>E-Ticaret Sitesi Skoru</h3>
                            <div className="score-display">
                                <span className="score-value safe">{analysisResult.platform_score}</span>
                                <span className="score-max">/ 5.0</span>
                            </div>
                            <p style={{ color: 'var(--text-muted)', marginTop: '1rem', fontSize: '0.9rem' }}>
                                Manipüle edilmiş standart değerlendirme ortalaması.
                            </p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}

export default App

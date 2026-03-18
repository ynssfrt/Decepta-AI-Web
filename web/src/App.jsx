import { useState, useEffect } from 'react'
import './App.css'

function App() {
    const [url, setUrl] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showResults, setShowResults] = useState(false);

    const [taskId, setTaskId] = useState(null);
    const [progress, setProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

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
            }, 2000);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [taskId, isAnalyzing]);

    return (
        <div className="dashboard-container">
            <header>
                <h1>Decepta AI</h1>
                <p>B2B Analist Paneli & Gerçek Zamanlı DOM Kazıma</p>
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
                        {isAnalyzing ? "Analiz Ediliyor..." : "Tarayıcıda Başlat"}
                    </button>
                </div>

                {errorMsg && (
                    <div style={{ color: "var(--accent-red)", textAlign: "center", marginBottom: "2rem", background: "rgba(239, 68, 68, 0.1)", padding: "1rem", borderRadius: "10px" }}>
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
                    <>
                        {/* Metrikler */}
                        <div className="results-grid" style={{ marginBottom: '2rem' }}>
                            <div className="glass-card">
                                <h3>Gerçek Güven Skoru</h3>
                                <div className="score-display">
                                    <span className={`score-value ${analysisResult.true_trust_score < 3.0 ? 'danger' : 'safe'}`}>
                                        {analysisResult.true_trust_score}
                                    </span>
                                    <span className="score-max">/ 5.0</span>
                                </div>
                                <div className="bot-percentage">
                                    Toplam {analysisResult.total_reviews} yazılı yorum incelendi. İhlal oranı: %{analysisResult.bot_percentage}
                                </div>
                            </div>

                            <div className="glass-card">
                                <h3>İstatistikler</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Toplam Değerlendirme Puanı:</span>
                                        <strong style={{ fontSize: '1.2rem' }}>{analysisResult.total_ratings}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Toplam Yazılı Yorum:</span>
                                        <strong style={{ fontSize: '1.2rem' }}>{analysisResult.total_reviews}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--accent-red)' }}>Şüpheli Yorum Tespiti:</span>
                                        <strong style={{ fontSize: '1.2rem', color: 'var(--accent-red)' }}>{analysisResult.suspicious_reviews?.length || 0}</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-card">
                                <h3>E-Ticaret Sitesi Skoru</h3>
                                <div className="score-display">
                                    <span className="score-value safe">{analysisResult.platform_score}</span>
                                    <span className="score-max">/ 5.0</span>
                                </div>
                                <p style={{ color: 'var(--text-muted)', marginTop: '1rem', fontSize: '0.9rem' }}>
                                    E-ticaret arayüzünde görünen manipüle edilmiş genel ortalama.
                                </p>
                            </div>
                        </div>

                        {/* Suspicious Reviews List */}
                        {analysisResult.suspicious_reviews && analysisResult.suspicious_reviews.length > 0 && (
                            <div className="glass-card" style={{ width: '100%' }}>
                                <h3 style={{ color: 'var(--accent-red)', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                                    Ağ İhlali Tespit Edilen Yorumlar
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    {analysisResult.suspicious_reviews.map((rev, idx) => (
                                        <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', borderLeft: '4px solid var(--accent-red)' }}>
                                            <p style={{ color: '#e2e8f0', fontSize: '1rem', fontStyle: 'italic', marginBottom: '0.8rem', lineHeight: '1.5' }}>
                                                "{rev.text}"
                                            </p>
                                            <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                                                🕵️ Sebep: {rev.reason}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {analysisResult.suspicious_reviews && analysisResult.suspicious_reviews.length === 0 && (
                            <div className="glass-card" style={{ width: '100%', textAlign: 'center' }}>
                                <h3 style={{ color: 'var(--accent-green)' }}>Hiçbir Şüpheli Yorum Bulunamadı</h3>
                                <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Ürün incelemeleri organik görünüyor. Bot ağ tespiti sıfır (0).</p>
                            </div>
                        )}

                    </>
                )}
            </main>
        </div>
    )
}

export default App

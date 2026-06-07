import logging
import os
from neo4j import GraphDatabase

logger = logging.getLogger(__name__)

class Neo4jService:
    def __init__(self):
        # Varsayılan docker ayarları
        self.uri = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
        self.user = os.environ.get("NEO4J_USER", "neo4j")
        self.password = os.environ.get("NEO4J_PASSWORD", "password")
        self.driver = None
        self.enabled = False
        
        try:
            self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
            self.driver.verify_connectivity()
            self.enabled = True
            logger.info("Neo4j Graph Veritabanına başarıyla bağlanıldı.")
            self._create_constraints()
        except Exception as e:
            logger.warning(f"Neo4j bağlantısı kurulamadı (Veritabanı kapalı olabilir). Graph analizi atlanacak. Hata: {e}")

    def close(self):
        if self.driver:
            self.driver.close()

    def _create_constraints(self):
        if not self.enabled: return
        with self.driver.session() as session:
            try:
                # Düğümlerin (Node) hızlı aranması için Index'ler ve Constraint'ler (Benzersizlik)
                session.run("CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE")
                session.run("CREATE CONSTRAINT product_url IF NOT EXISTS FOR (p:Product) REQUIRE p.url IS UNIQUE")
            except Exception as e:
                logger.debug(f"Constraint hatası (yoksayılabilir): {e}")

    def ingest_scan_data(self, product_url: str, reviews: list):
        """
        Tarama sonrası organik ve şüpheli tüm yorumları ağ veritabanına ekler.
        reviews list of dict: {author: "Ali", text: "...", rating: 5, date: "..."}
        """
        if not self.enabled: return
        
        with self.driver.session() as session:
            # 1. Product Node oluştur
            session.run("""
                MERGE (p:Product {url: $url})
            """, url=product_url)
            
            # 2. User ve Review'leri oluştur, ilişkileri bağla
            for r in reviews:
                author = r.get("author") or "Anonim"
                if author == "Anonim": continue # Anonimse ağ tespiti yapılamaz (Botnet tespiti isimsiz çalışmaz)
                
                text_snippet = r.get("text", "")[:100]
                rating = r.get("rating", 0)
                
                # MERGE: Varsa bul, yoksa yarat
                # CREATE: Her yorum farklı bir düğümdür (Review)
                session.run("""
                    MERGE (u:User {id: $author})
                    MERGE (p:Product {url: $url})
                    CREATE (rev:Review {text: $text, rating: $rating})
                    MERGE (u)-[:WROTE]->(rev)
                    MERGE (rev)-[:BELONGS_TO]->(p)
                """, author=author, url=product_url, text=text_snippet, rating=rating)
                
    def check_network_anomalies(self, authors: list) -> dict:
        """
        Verilen yazarların (author) Graph ağındaki geçmiş vukuatlarını tarar (Co-Reviewer sendikası vb).
        Döndürdüğü: { "YazarAdı": ["Uyarı 1", "Uyarı 2"] }
        """
        if not self.enabled: return {}
        
        anomalies = {}
        with self.driver.session() as session:
            for author in authors:
                if not author or author == "Anonim": continue
                
                # Soru 1: Co-Reviewer Tespiti: Bu kişiyle aynı 2+ ürüne yorum yapan "ortak" kişiler var mı?
                # (Eğer varsa, bunlar muhtemelen bir ajanstan görev alan botnet çetesidir)
                result = session.run("""
                    MATCH (u1:User {id: $author})-[:WROTE]->(r1:Review)-[:BELONGS_TO]->(p:Product)
                    MATCH (u2:User)-[:WROTE]->(r2:Review)-[:BELONGS_TO]->(p)
                    WHERE u1 <> u2
                    WITH u1, u2, count(DISTINCT p) as common_products
                    WHERE common_products >= 2
                    RETURN u2.id, common_products
                """, author=author)
                
                co_reviewers = [record["u2.id"] for record in result]
                if len(co_reviewers) > 0:
                    if author not in anomalies: anomalies[author] = []
                    anomalies[author].append(
                        f"Graph Ağ Tespiti: Bu kullanıcı, bilinen {len(co_reviewers)} farklı hesap ile koordineli olarak ortak ürünlere oy vermiş. (Organize Bot Sendikası)"
                    )
                    
        return anomalies

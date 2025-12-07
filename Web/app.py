from flask import Flask, render_template, send_file
from flask_cors import CORS
import os
import asyncio
import threading

from models import db
from routes import api
from telegram_bot import init_telegram_bot

telegram_bot = None


def create_app():
    """Фабрика приложения"""
    app = Flask(__name__, 
                static_folder='static',
                template_folder='templates')
    
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
        'DATABASE_URL', 
        'sqlite:///rational_assistant.db'
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
    app.config['TELEGRAM_BOT_TOKEN'] = os.getenv('TELEGRAM_BOT_TOKEN')  # НОВОЕ
    
    db.init_app(app)
    CORS(app)
    
    app.register_blueprint(api)
    
  
    @app.route('/')
    def landing():
        return render_template('landing.html')
    
    @app.route('/app/')
    @app.route('/app/<path:path>')
    def app_main(path=None):
        return render_template('index.html')
    
    @app.route('/health')
    def health():
        return {'status': 'ok', 'message': 'Рациональный Ассистент работает!'}
    
    @app.route('/download/android')
    def download_android():
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


def start_telegram_bot(app):
    """Запуск Telegram бота в отдельном потоке"""
    global telegram_bot
    
    with app.app_context():
        token = app.config.get('TELEGRAM_BOT_TOKEN')
        
        if not token:
            print("⚠️  TELEGRAM_BOT_TOKEN не найден в переменных окружения")
            print("💡 Создайте файл .env и добавьте: TELEGRAM_BOT_TOKEN=ваш_токен")
            return
        
        telegram_bot = init_telegram_bot(token, db.session)
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            loop.run_until_complete(telegram_bot.start_bot())
            loop.run_forever()
        except KeyboardInterrupt:
            telegram_bot.stop()
            loop.close()
            print("🛑 Telegram бот остановлен")


if __name__ == '__main__':
    app = create_app()
    init_db(app)
    
    bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
    
    if bot_token:
        print("\n🤖 Запуск Telegram бота...")
        bot_thread = threading.Thread(
            target=start_telegram_bot,
            args=(app,),
            daemon=True
        )
        bot_thread.start()
        print("✅ Telegram бот запущен в фоновом режиме")
    else:
        print("\n⚠️  Telegram бот НЕ запущен (отсутствует токен)")
        print("💡 Добавьте TELEGRAM_BOT_TOKEN в .env для включения уведомлений")
    
    print("\n🎯 Рациональный Ассистент запущен!")
    print("🌐 Лендинг: http://localhost:5000")
    print("📱 Приложение: http://localhost:5000/app/")
    print("\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
import os
import logging
from datetime import datetime, timedelta
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)


class TelegramNotificationBot:
    
    def __init__(self, token: str, db_session):
        self.token = token
        self.db = db_session
        self.application = None
        self.scheduler = BackgroundScheduler()
        
    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Обработчик команды /start"""
        chat_id = update.effective_chat.id
        
        await update.message.reply_text(
            "👋 Привет! Я T-Сберегатель бот.\n\n"
            "Для начала привяжи свой аккаунт:\n"
            "/link ваш_никнейм\n\n"
            "Доступные команды:\n"
            "/link никнейм - привязать аккаунт\n"
            "/unlink - отвязать аккаунт\n"
            "/pending - показать ожидающие покупки\n"
            "/stats - показать статистику\n"
            "/settings - настройки уведомлений"
        )
    
    async def link_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Привязка Telegram к аккаунту"""
        from models import User
        
        chat_id = update.effective_chat.id
        
        if not context.args:
            await update.message.reply_text(
                "❌ Укажите никнейм: /link ваш_никнейм"
            )
            return
        
        nickname = context.args[0]
        user = User.query.filter_by(nickname=nickname).first()
        
        if not user:
            await update.message.reply_text(
                f"❌ Пользователь с никнеймом '{nickname}' не найден.\n"
                "Сначала зарегистрируйтесь в веб-приложении."
            )
            return
        
        # Сохраняем chat_id в БД
        user.telegram_chat_id = str(chat_id)
        user.telegram_notifications_enabled = True
        self.db.commit()
        
        await update.message.reply_text(
            f"✅ Аккаунт '{nickname}' успешно привязан!\n\n"
            "Теперь вы будете получать уведомления о:\n"
            "• Окончании периода охлаждения\n"
            "• Достижении целей накопления\n"
            "• Импульсивных покупках\n\n"
            "Управление: /settings"
        )
    
    async def unlink_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Отвязка Telegram от аккаунта"""
        from models import User
        
        chat_id = str(update.effective_chat.id)
        user = User.query.filter_by(telegram_chat_id=chat_id).first()
        
        if not user:
            await update.message.reply_text("❌ Ваш аккаунт не привязан.")
            return
        
        user.telegram_chat_id = None
        user.telegram_notifications_enabled = False
        self.db.commit()
        
        await update.message.reply_text("✅ Аккаунт отвязан. Уведомления отключены.")
    
    async def pending_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Показать ожидающие покупки"""
        from models import User, Purchase
        
        chat_id = str(update.effective_chat.id)
        user = User.query.filter_by(telegram_chat_id=chat_id).first()
        
        if not user:
            await update.message.reply_text(
                "❌ Сначала привяжите аккаунт: /link ваш_никнейм"
            )
            return
        
        purchases = Purchase.query.filter_by(
            user_id=user.id,
            status='pending'
        ).order_by(Purchase.cooling_end_date).all()
        
        if not purchases:
            await update.message.reply_text(
                "📋 У вас нет ожидающих покупок.\n"
                "Все решения приняты! 🎉"
            )
            return
        
        message = "📋 <b>Ожидающие покупки:</b>\n\n"
        
        for p in purchases:
            end_date = p.cooling_end_date
            now = datetime.utcnow()
            days_left = (end_date - now).days
            
            status_emoji = "✅" if days_left <= 0 else "⏳"
            days_text = "Можно решить!" if days_left <= 0 else f"Осталось {days_left} дн"
            
            message += (
                f"{status_emoji} <b>{p.name}</b>\n"
                f"💰 {p.price:,.0f} ₽ | 📦 {p.category}\n"
                f"📅 {days_text}\n"
                f"{'🚫 В черном списке' if p.is_blacklisted else ''}\n\n"
            )
        
        # Добавляем кнопки для быстрых действий
        keyboard = [[
            InlineKeyboardButton("📊 Статистика", callback_data="stats"),
            InlineKeyboardButton("⚙️ Настройки", callback_data="settings")
        ]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            message,
            parse_mode='HTML',
            reply_markup=reply_markup
        )
    
    async def stats_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Показать статистику"""
        from models import User, Purchase
        from sqlalchemy import func
        
        chat_id = str(update.effective_chat.id)
        user = User.query.filter_by(telegram_chat_id=chat_id).first()
        
        if not user:
            await update.message.reply_text(
                "❌ Сначала привяжите аккаунт: /link ваш_никнейм"
            )
            return
        
        total = Purchase.query.filter_by(user_id=user.id).count()
        pending = Purchase.query.filter_by(user_id=user.id, status='pending').count()
        approved = Purchase.query.filter_by(user_id=user.id, status='approved').count()
        rejected = Purchase.query.filter_by(user_id=user.id, status='rejected').count()
        
        spent = self.db.query(func.sum(Purchase.price)).filter_by(
            user_id=user.id, status='approved'
        ).scalar() or 0
        
        saved = self.db.query(func.sum(Purchase.price)).filter_by(
            user_id=user.id, status='rejected'
        ).scalar() or 0
        
        message = (
            f"📊 <b>Ваша статистика</b>\n\n"
            f"👤 Пользователь: {user.nickname}\n"
            f"💰 Зарплата: {user.salary:,.0f} ₽\n"
            f"🏦 Накопления: {user.current_savings:,.0f} ₽\n\n"
            f"📈 <b>Покупки:</b>\n"
            f"Всего: {total}\n"
            f"⏳ Ожидают: {pending}\n"
            f"✅ Одобрено: {approved}\n"
            f"❌ Отклонено: {rejected}\n\n"
            f"💸 Потрачено: {spent:,.0f} ₽\n"
            f"💚 Сэкономлено: {saved:,.0f} ₽\n"
        )
        
        if saved > 0:
            efficiency = (saved / (spent + saved)) * 100
            message += f"\n🎯 Эффективность: {efficiency:.1f}%"
        
        await update.message.reply_text(message, parse_mode='HTML')
    
    async def settings_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Настройки уведомлений"""
        from models import User
        
        chat_id = str(update.effective_chat.id)
        user = User.query.filter_by(telegram_chat_id=chat_id).first()
        
        if not user:
            await update.message.reply_text(
                "❌ Сначала привяжите аккаунт: /link ваш_никнейм"
            )
            return
        
        status = "🟢 Включены" if user.telegram_notifications_enabled else "🔴 Отключены"
        
        keyboard = [[
            InlineKeyboardButton(
                "✅ Включить" if not user.telegram_notifications_enabled else "❌ Отключить",
                callback_data="toggle_notifications"
            )
        ]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            f"⚙️ <b>Настройки уведомлений</b>\n\n"
            f"Статус: {status}\n\n"
            f"Вы получаете уведомления о:\n"
            f"• ⏰ Окончании периода охлаждения\n"
            f"• 💰 Достижении целей накопления\n"
            f"• 🎯 Новых покупках\n"
            f"• 📊 Еженедельной статистике",
            parse_mode='HTML',
            reply_markup=reply_markup
        )
    
    async def button_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Обработка нажатий на кнопки"""
        from models import User
        
        query = update.callback_query
        await query.answer()
        
        chat_id = str(update.effective_chat.id)
        user = User.query.filter_by(telegram_chat_id=chat_id).first()
        
        if not user:
            await query.edit_message_text("❌ Аккаунт не привязан.")
            return
        
        if query.data == "toggle_notifications":
            user.telegram_notifications_enabled = not user.telegram_notifications_enabled
            self.db.commit()
            
            status = "включены ✅" if user.telegram_notifications_enabled else "отключены ❌"
            await query.edit_message_text(f"Уведомления {status}")
        
        elif query.data == "stats":
            await self.stats_command(update, context)
        
        elif query.data == "settings":
            await self.settings_command(update, context)
    
    # ===== УВЕДОМЛЕНИЯ =====
    
    async def send_notification(self, chat_id: str, message: str, parse_mode='HTML', reply_markup=None):
        """Отправить уведомление пользователю"""
        try:
            await self.application.bot.send_message(
                chat_id=chat_id,
                text=message,
                parse_mode=parse_mode,
                reply_markup=reply_markup
            )
            logger.info(f"Notification sent to {chat_id}")
        except Exception as e:
            logger.error(f"Failed to send notification to {chat_id}: {e}")
    
    async def notify_cooling_ended(self, purchase):
        """Уведомление об окончании периода охлаждения"""
        from models import User
        
        user = User.query.get(purchase.user_id)
        if not user or not user.telegram_chat_id or not user.telegram_notifications_enabled:
            return
        
        keyboard = [[
            InlineKeyboardButton("✅ Куплю", callback_data=f"approve_{purchase.id}"),
            InlineKeyboardButton("❌ Откажусь", callback_data=f"reject_{purchase.id}")
        ]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        message = (
            f"⏰ <b>Период ожидания закончился!</b>\n\n"
            f"🛍 <b>{purchase.name}</b>\n"
            f"💰 {purchase.price:,.0f} ₽\n"
            f"📦 {purchase.category}\n\n"
            f"Вы все еще хотите это купить?"
        )
        
        await self.send_notification(user.telegram_chat_id, message, reply_markup=reply_markup)
    
    async def notify_high_impulse(self, purchase, analysis):
        """Уведомление о высоком риске импульсивной покупки"""
        from models import User
        
        user = User.query.get(purchase.user_id)
        if not user or not user.telegram_chat_id or not user.telegram_notifications_enabled:
            return
        
        risk_emoji = {
            'high': '🔴',
            'medium': '🟡',
            'low': '🟢'
        }
        
        message = (
            f"{risk_emoji[analysis['risk_level']]} <b>Новая покупка добавлена</b>\n\n"
            f"🛍 <b>{purchase.name}</b>\n"
            f"💰 {purchase.price:,.0f} ₽\n"
            f"📊 Риск импульсивности: {analysis['impulse_score']}%\n\n"
            f"💡 {analysis['recommendation']}\n"
            f"⏰ Период охлаждения: {analysis['cooling_days']} дней"
        )
        
        await self.send_notification(user.telegram_chat_id, message)
    
    async def notify_savings_goal(self, user, purchase, days_left):
        """Уведомление о приближении к цели накопления"""
        if not user.telegram_chat_id or not user.telegram_notifications_enabled:
            return
        
        message = (
            f"🎯 <b>Цель накопления близка!</b>\n\n"
            f"До покупки <b>{purchase.name}</b> осталось накопить:\n"
            f"⏰ {days_left} дней\n"
            f"💰 Примерно {(purchase.price - user.current_savings):,.0f} ₽\n\n"
            f"Продолжайте откладывать, вы на правильном пути! 💪"
        )
        
        await self.send_notification(user.telegram_chat_id, message)
    
    async def notify_weekly_stats(self, user):
        """Еженедельная статистика"""
        from models import Purchase
        from sqlalchemy import func
        from datetime import timedelta
        
        if not user.telegram_chat_id or not user.telegram_notifications_enabled:
            return
        
        week_ago = datetime.utcnow() - timedelta(days=7)
        
        week_purchases = Purchase.query.filter(
            Purchase.user_id == user.id,
            Purchase.created_at >= week_ago
        ).count()
        
        week_spent = self.db.query(func.sum(Purchase.price)).filter(
            Purchase.user_id == user.id,
            Purchase.status == 'approved',
            Purchase.created_at >= week_ago
        ).scalar() or 0
        
        week_saved = self.db.query(func.sum(Purchase.price)).filter(
            Purchase.user_id == user.id,
            Purchase.status == 'rejected',
            Purchase.created_at >= week_ago
        ).scalar() or 0
        
        message = (
            f"📊 <b>Итоги недели</b>\n\n"
            f"👤 {user.nickname}\n"
            f"🛍 Покупок добавлено: {week_purchases}\n"
            f"💸 Потрачено: {week_spent:,.0f} ₽\n"
            f"💚 Сэкономлено: {week_saved:,.0f} ₽\n\n"
        )
        
        if week_saved > week_spent:
            message += "🏆 Отличная работа! Вы сэкономили больше, чем потратили!"
        elif week_saved > 0:
            message += "✅ Хороший результат! Продолжайте в том же духе!"
        else:
            message += "💡 На этой неделе не было отказов от покупок. Попробуйте быть осторожнее!"
        
        await self.send_notification(user.telegram_chat_id, message)
    
    # ===== ПЛАНИРОВЩИК =====
    
    def check_cooling_periods(self):
        """Проверка окончания периодов охлаждения (выполняется каждый час)"""
        from models import Purchase
        import asyncio
        
        now = datetime.utcnow()
        ready_purchases = Purchase.query.filter(
            Purchase.status == 'pending',
            Purchase.cooling_end_date <= now
        ).all()
        
        for purchase in ready_purchases:
            asyncio.run(self.notify_cooling_ended(purchase))
    
    def send_weekly_stats(self):
        """Отправка еженедельной статистики (каждый понедельник в 9:00)"""
        from models import User
        import asyncio
        
        users = User.query.filter(
            User.telegram_chat_id.isnot(None),
            User.telegram_notifications_enabled == True
        ).all()
        
        for user in users:
            asyncio.run(self.notify_weekly_stats(user))
    
    def start_scheduler(self):
        """Запуск планировщика задач"""
        # Проверка периодов охлаждения каждый час
        self.scheduler.add_job(
            self.check_cooling_periods,
            CronTrigger(minute=0),  # Каждый час в :00
            id='check_cooling',
            replace_existing=True
        )
        
        # Еженедельная статистика (понедельник 9:00)
        self.scheduler.add_job(
            self.send_weekly_stats,
            CronTrigger(day_of_week='mon', hour=9, minute=0),
            id='weekly_stats',
            replace_existing=True
        )
        
        self.scheduler.start()
        logger.info("Scheduler started")
    
    async def start_bot(self):
        """Запуск бота"""
        self.application = Application.builder().token(self.token).build()
        
        # Регистрация обработчиков команд
        self.application.add_handler(CommandHandler("start", self.start_command))
        self.application.add_handler(CommandHandler("link", self.link_command))
        self.application.add_handler(CommandHandler("unlink", self.unlink_command))
        self.application.add_handler(CommandHandler("pending", self.pending_command))
        self.application.add_handler(CommandHandler("stats", self.stats_command))
        self.application.add_handler(CommandHandler("settings", self.settings_command))
        self.application.add_handler(CallbackQueryHandler(self.button_callback))
        
        # Запуск планировщика
        self.start_scheduler()
        
        # Запуск бота
        await self.application.initialize()
        await self.application.start()
        await self.application.updater.start_polling()
        
        logger.info("Bot started successfully!")
    
    def stop(self):
        """Остановка бота"""
        if self.scheduler.running:
            self.scheduler.shutdown()
        logger.info("Bot stopped")


# Глобальный экземпляр бота
bot_instance = None


def init_telegram_bot(token: str, db_session):
    """Инициализация бота"""
    global bot_instance
    bot_instance = TelegramNotificationBot(token, db_session)
    return bot_instance


def get_bot():
    """Получить экземпляр бота"""
    return bot_instance
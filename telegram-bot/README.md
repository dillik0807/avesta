# Telegram Bot (PostgreSQL версия)

Бот работает через REST API бэкенда (`postgres-version/backend`).

## Настройка

1. Скопируй `.env.example` в `.env` и заполни:
   - `TELEGRAM_BOT_TOKEN` — токен от @BotFather
   - `API_URL` — URL бэкенда (локально `http://localhost:3000`, на Railway — URL деплоя)
   - `DEFAULT_YEAR` — год по умолчанию

2. Установи зависимости:
   ```
   npm install
   ```

3. Запусти бот:
   ```
   npm start
   ```

## Важно

Бэкенд (`postgres-version/backend`) должен быть запущен и доступен по `API_URL`.
Бот использует те же логины/пароли что и веб-приложение.

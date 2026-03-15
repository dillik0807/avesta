#!/bin/bash

echo "🚀 Запуск системы учёта товаров (PostgreSQL версия)"
echo ""

# Переход в директорию backend
cd backend

# Проверка наличия node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 Установка зависимостей..."
    npm install
    echo ""
fi

# Проверка наличия .env
if [ ! -f ".env" ]; then
    echo "❌ Файл .env не найден!"
    echo "Скопируйте .env.example в .env и настройте DATABASE_URL"
    exit 1
fi

# Тест подключения
echo "🔍 Проверка подключения к базе данных..."
npm run test-connection

# Если тест прошел успешно, запускаем сервер
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Подключение успешно!"
    echo "🚀 Запуск сервера..."
    echo ""
    npm start
else
    echo ""
    echo "❌ Ошибка подключения к базе данных"
    echo "Проверьте настройки в .env"
    exit 1
fi

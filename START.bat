@echo off
echo ========================================
echo   🚀 Запуск системы учёта товаров
echo   PostgreSQL версия
echo ========================================
echo.

cd backend

REM Проверка наличия node
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js не установлен!
    echo.
    echo Скачайте и установите Node.js:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js найден
node --version
echo.

REM Проверка наличия node_modules
if not exist "node_modules" (
    echo 📦 Установка зависимостей...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Ошибка установки зависимостей
        pause
        exit /b 1
    )
    echo ✅ Зависимости установлены
    echo.
)

REM Проверка наличия .env
if not exist ".env" (
    echo ❌ Файл .env не найден!
    echo.
    echo Скопируйте .env.example в .env и настройте DATABASE_URL
    pause
    exit /b 1
)

echo ✅ Конфигурация найдена
echo.

REM Тест подключения
echo 🔍 Проверка подключения к базе данных...
call npm run test-connection
echo.

if %errorlevel% neq 0 (
    echo ⚠️ Проблема с подключением к базе данных
    echo.
    echo Попробуйте инициализировать базу данных:
    echo   npm run init-db
    echo.
    choice /C YN /M "Инициализировать базу данных сейчас"
    if errorlevel 2 goto skipinit
    if errorlevel 1 (
        echo.
        echo 🗄️ Инициализация базы данных...
        call npm run init-db
        echo.
    )
)

:skipinit
echo ========================================
echo   ✅ Все проверки пройдены!
echo   🚀 Запуск сервера...
echo ========================================
echo.
echo Сервер будет доступен на:
echo   http://localhost:3000
echo.
echo Откройте в браузере:
echo   frontend/index.html
echo.
echo Логин: admin
echo Пароль: admin123
echo.
echo ⚠️ НЕ ЗАКРЫВАЙТЕ ЭТО ОКНО!
echo    Сервер работает здесь.
echo.
echo ========================================
echo.

call npm start

@echo off
echo ========================================
echo   🚀 ЗАПУСК СИСТЕМЫ УЧЁТА ТОВАРОВ
echo   PostgreSQL версия
echo ========================================
echo.

REM Проверка Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js не установлен!
    echo Скачайте: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js найден
node --version
echo.

REM Установка зависимостей backend
echo 📦 Проверка зависимостей backend...
cd backend
if not exist "node_modules" (
    echo Установка зависимостей...
    call npm install
)
cd ..
echo.

REM Запуск backend сервера в новом окне
echo 🚀 Запуск backend сервера (порт 3001)...
start "Backend Server" cmd /k "cd backend && npm start"
timeout /t 3 /nobreak >nul
echo.

REM Запуск frontend сервера в новом окне
echo 🌐 Запуск frontend сервера (порт 8080)...
start "Frontend Server" cmd /k "cd frontend && node server.js"
timeout /t 2 /nobreak >nul
echo.

echo ========================================
echo   ✅ ОБА СЕРВЕРА ЗАПУЩЕНЫ!
echo ========================================
echo.
echo Backend API:  http://localhost:3001
echo Frontend:     http://localhost:8080
echo.
echo Откроется автоматически через 3 секунды...
timeout /t 3 /nobreak >nul

REM Открываем браузер
start http://localhost:8080

echo.
echo ========================================
echo   📝 ИНФОРМАЦИЯ
echo ========================================
echo.
echo Логин:  admin
echo Пароль: admin123
echo.
echo ⚠️  НЕ ЗАКРЫВАЙТЕ окна серверов!
echo    Backend Server - API сервер
echo    Frontend Server - Веб сервер
echo.
echo Для остановки: закройте оба окна серверов
echo.
pause

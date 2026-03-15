@echo off
echo ========================================
echo   Проверка статуса сервера
echo ========================================
echo.

echo Проверка порта 3000...
netstat -an | findstr ":3000"

if %errorlevel% equ 0 (
    echo.
    echo ✅ Сервер запущен на порту 3000
    echo.
    echo Попробуйте открыть в браузере:
    echo http://localhost:3000/health
) else (
    echo.
    echo ❌ Сервер НЕ запущен на порту 3000
    echo.
    echo Запустите сервер:
    echo   cd backend
    echo   npm start
)

echo.
pause

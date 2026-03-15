@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════╗
echo ║     Установка Avesta 2026            ║
echo ╚══════════════════════════════════════╝
echo.

set "CURRENT_DIR=%~dp0"
set "INDEX_FILE=%CURRENT_DIR%index.html"
set "VBS_FILE=%TEMP%\create_shortcut.vbs"

:: Создаём VBS скрипт
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%VBS_FILE%"
echo sDesktop = oWS.SpecialFolders("Desktop") >> "%VBS_FILE%"
echo sLink = sDesktop ^& "\Avesta 2026.lnk" >> "%VBS_FILE%"
echo Set oLink = oWS.CreateShortcut(sLink) >> "%VBS_FILE%"
echo oLink.TargetPath = "%INDEX_FILE%" >> "%VBS_FILE%"
echo oLink.Description = "Avesta 2026" >> "%VBS_FILE%"
echo oLink.Save >> "%VBS_FILE%"

:: Запускаем VBS
cscript //nologo "%VBS_FILE%"
del "%VBS_FILE%" >nul 2>&1

:: Проверяем результат
for /f %%i in ('powershell -NoProfile -Command "[Environment]::GetFolderPath(\"Desktop\")"') do set "DESKTOP=%%i"
if exist "%DESKTOP%\Avesta 2026.lnk" (
    echo ✅ Ярлык "Avesta 2026" создан на рабочем столе!
) else (
    echo ❌ Ошибка создания ярлыка
)

echo.
pause

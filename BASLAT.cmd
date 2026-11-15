@echo off
chcp 65001 >nul
title Canli Oyun - Baslatici
cd /d "%~dp0"

rem Ilk calistirmada paketleri kur
if not exist node_modules\electron\dist\electron.exe (
  echo Paketler kuruluyor, bir kez yapilir...
  call npm install || goto :hata
)

rem Sunucuyu ayri pencerede yayin modunda baslat (bu pencereyi yayin boyunca kapatma)
start "Canli Oyun SUNUCU - yayin boyunca acik kalsin" cmd /k "npm start"

rem Oyun ekrani: cercevesiz, tam 9:16 yayin penceresi.
rem LIVE Studio'da "Pencere yakalama" ile "Canli Oyun - Yayin Ekrani" penceresini sec.
rem Sunucu hazir olana kadar pencere kendisi tekrar dener. Esc ile kapanir.
start "" "node_modules\electron\dist\electron.exe" desktop\main.cjs

rem Kontrol paneli: normal tarayicida (sunucunun acilmasini bekle)
timeout /t 8 /nobreak >nul
start "" http://127.0.0.1:4300/panel
exit /b 0

:hata
echo.
echo Kurulum basarisiz oldu. Node.js 22 veya ustu yuklu mu?
pause

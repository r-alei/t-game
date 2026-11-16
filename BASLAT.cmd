@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
title Canli Oyun - Baslatici
cd /d "%~dp0"

rem Hangi oyun? "BASLAT.cmd vapur" gibi ad verilebilir; verilmezse liste sorulur.
rem Her oyun client\src\games\<ad>\ klasorundedir; oradaki BASLAT.cmd yalniz o oyunu acar.
set "OYUN=%~1"
if not "%OYUN%"=="" goto :oyun_secildi

echo.
echo Hangi oyun acilsin?
set n=0
for /d %%D in ("client\src\games\*") do (
  if /i not "%%~nxD"=="demo" (
    set /a n+=1
    set "oyun!n!=%%~nxD"
    echo   !n! - %%~nxD
  )
)
set "sec=1"
set /p "sec=Numara yaz ve Enter'a bas [1]: "
set "OYUN=!oyun%sec%!"
if "%OYUN%"=="" (
  echo Gecersiz secim.
  pause
  exit /b 1
)

:oyun_secildi
if not exist "client\src\games\%OYUN%\" (
  echo "%OYUN%" adinda oyun klasoru yok: client\src\games\%OYUN%
  pause
  exit /b 1
)
title Canli Oyun - %OYUN%
echo Aciliyor: %OYUN%

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
set "OYUN_URL=http://127.0.0.1:4300/?game=%OYUN%"
start "" "node_modules\electron\dist\electron.exe" desktop\main.cjs

rem Kontrol paneli: normal tarayicida (sunucunun acilmasini bekle)
timeout /t 8 /nobreak >nul
start "" "http://127.0.0.1:4300/panel?game=%OYUN%"
exit /b 0

:hata
echo.
echo Kurulum basarisiz oldu. Node.js 22 veya ustu yuklu mu?
pause

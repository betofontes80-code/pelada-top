@echo off
cd /d "%~dp0"
title Pelada Top - Servidor Local
echo ====================================================
echo      PELADA TOP - SERVIDOR LOCAL PWA ATIVO
echo ====================================================
echo.
echo Abrindo http://localhost:8080 no seu navegador...
echo Mantenha esta janela aberta enquanto estiver usando o app.
echo.
echo ====================================================
echo Acesso no Celular/Tablet (mesmo Wi-Fi):
echo   http://192.168.1.100:8080
echo ====================================================
echo.
echo Mantenha esta janela aberta enquanto a pelada estiver rolando!
echo.
start "" "http://localhost:8080"
node server.js
pause



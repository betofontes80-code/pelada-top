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
start "" "http://localhost:8080"
node server.js
pause


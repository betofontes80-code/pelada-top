@echo off
cd /d "%~dp0"
title Pelada Top - Servidor Local + Link Online (4G / 5G)
cls
echo ====================================================================
echo      PELADA TOP - SERVIDOR LOCAL + LINK ONLINE (4G / 5G)
echo ====================================================================
echo.
echo 1. Iniciando servidor local na porta 8080...
start "" node server.js
timeout /t 2 >nul

echo.
echo 2. Gerando link seguro HTTPS para os celulares (mesmo fora do Wi-Fi)...
echo    Aguarde alguns segundos para o link aparecer abaixo...
echo.
echo ====================================================================
echo Copie o link que aparecer e envie no WhatsApp para os jogadores:
echo ====================================================================
echo.
npx localtunnel --port 8080
pause

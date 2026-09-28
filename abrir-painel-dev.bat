@echo off
chcp 65001 >nul
title Pelada Top - Console Local de Testes e Diagnóstico
cls
echo ======================================================================
echo  ⚽ PELADA TOP - CONSOLE EXCLUSIVO DE TESTES DEV (MÁQUINA LOCAL)
echo ======================================================================
echo.

cd /d "%~dp0"

:: 1. Verifica se o Node.js está instalado
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Node.js não foi encontrado no PATH. Instale o Node.js para continuar.
    pause
    exit /b 1
)

:: 2. Verifica se o servidor local já está ativo na porta 8080
netstat -ano | findstr :8080 | findstr LISTENING >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [STATUS] Servidor local já está ativo e respondendo na porta 8080.
) else (
    echo [INICIANDO] Subindo servidor local Node.js em segundo plano...
    start /min "Pelada Top Server" node server.js
    timeout /t 2 /nobreak >nul
)

:: 3. Abre a página de teste no navegador padrão (em janela única)
echo [NAVEGADOR] Abrindo Console de Testes e Diagnóstico...
start "" "http://localhost:8080/teste"

echo.
echo ======================================================================
echo  ✅ CONSOLE DE TESTES ABERTO:
echo     Link direto: http://localhost:8080/teste
echo.
echo  ⚽ Painel Master: http://localhost:8080/painel
echo  📱 App Principal: http://localhost:8080/
echo ======================================================================
echo.
timeout /t 4 >nul
exit /b 0

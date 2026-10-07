@echo off
title Terminal VPS Hostinger - Pelada Top (179.236.252.58)
color 0A
cls
echo ===================================================================
echo     CONEXAO DIRETA VPS HOSTINGER - PELADA TOP
echo     IP do Servidor: 179.236.252.58
echo     Usuario: root
echo ===================================================================
echo.
echo Conectando via SSH...
echo.

ssh -o ServerAliveInterval=60 -i "%USERPROFILE%\.ssh\id_ed25519" root@179.236.252.58

if %errorlevel% neq 0 (
    echo.
    echo -------------------------------------------------------------------
    echo Tentando conexao direta com pedido de senha...
    echo -------------------------------------------------------------------
    ssh root@179.236.252.58
)

echo.
echo Conexao encerrada.
pause


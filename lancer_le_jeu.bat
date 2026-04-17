@echo off
title La Course des Monstres - Serveur local
echo.
echo  ==========================================
echo   La Course des Monstres
echo   Lancement du serveur local (Node.js)...
echo  ==========================================
echo.
cd /d "%~dp0"
node serveur.js
echo.
echo  Serveur arrete.
pause

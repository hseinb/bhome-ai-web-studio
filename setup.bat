@echo off
title B HOME Product Studio - Initiation ^& Setup
color 0A
cls

echo ===============================================================
echo   B HOME - Product Specialist Web Studio Initiation
echo ===============================================================
echo.
echo [1/3] Checking Node.js environment...
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo ERROR: Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/ and run this setup again.
    pause
    exit /b 1
)

node -v
echo Node.js is ready.
echo.

echo [2/3] Installing all required dependencies (npm install)...
call npm install
if %errorlevel% neq 0 (
    color 0C
    echo ERROR: npm install failed.
    pause
    exit /b 1
)
echo Dependencies installed successfully.
echo.

echo [3/3] Building production bundle (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    color 0C
    echo ERROR: Production build failed.
    pause
    exit /b 1
)
echo Production build compiled successfully into /dist folder.
echo.

echo ===============================================================
echo   SETUP COMPLETED SUCCESSFULLY!
echo ===============================================================
echo.
echo You can now start the studio at any time by double-clicking:
echo   launch.bat  or  running 'node launch.js'
echo.
echo Backend Target: http://192.168.1.3:8090
echo Pictures Path:  C:\mssql-firebase-bridge\Pictures
echo.
pause

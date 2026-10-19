@echo off
title B HOME Product Studio Launcher
color 0B
cls

echo ===============================================================
echo   Starting B HOME Product Specialist Web Studio...
echo ===============================================================
echo.

node launch.js

if %errorlevel% neq 0 (
    echo.
    echo Node server stopped or encountered an error.
    pause
)

@echo off
title WONS ERP One-Click Deployer
echo ==============================================
echo  Starting WONS ERP Auto Build and Deploy...
echo ==============================================
echo.
echo [1/3] Cleaning deployment cache...
if exist node_modules\.cache\gh-pages (
    rd /s /q node_modules\.cache\gh-pages
)
echo.
echo [2/3] Building project (Production mode)...
call npm.cmd run build
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Build failed! Please check your code.
    pause
    exit /b %errorlevel%
)
echo.
echo [3/3] Uploading build files to GitHub Pages...
call npx.cmd gh-pages -d dist
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Deployment failed! Check internet connection or credentials.
    pause
    exit /b %errorlevel%
)
echo.
echo ==============================================
echo  SUCCESS! App deployed to GitHub successfully.
echo  It will be live in 1 minute.
echo ==============================================
pause

@echo off
echo ===================================================
echo             WONS ERP GitHub Upload Program
echo ===================================================
echo.
echo [1/4] Preparing changed files (git add)...
git add .

echo.
echo [2/4] Recording modification message (git commit)...
git commit -m "update: ERP improvements and build error fix"

echo.
echo [3/4] Uploading source code to GitHub (git push)...
git push origin main

echo.
echo [4/4] Starting build and deploy (npm run deploy)...
call npm.cmd run deploy

echo.
echo ===================================================
echo   Upload and Deployment completed!
echo   Please wait 1-2 minutes and press Ctrl+F5 on your website.
echo ===================================================
pause

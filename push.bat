@echo off
echo ================================
echo   SnapVerse Auto Git Push
echo ================================
echo.

git add .
git commit -m "Auto update from SnapVerse"
git push origin main

echo.
echo Push complete!
pause

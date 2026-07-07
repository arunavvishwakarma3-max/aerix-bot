@echo on
cd /d "C:\Users\DELL\OneDrive\Desktop\DC_Bot"
title DC Bot V2
echo Starting bot...
node index.js
if %errorlevel% neq 0 (
    echo ERROR: Bot crashed with code %errorlevel%
    pause
    exit /b %errorlevel%
)
pause

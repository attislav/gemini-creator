@echo off
echo Beende Gemini Creator Server (Port 3222)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3222 ^| findstr LISTENING') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo Server beendet.
timeout /t 2 /nobreak >nul

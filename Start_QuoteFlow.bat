@echo off
SETLOCAL
cd /d "%~dp0"
TITLE QuoteFlow Launcher

:: Force Chrome to open the app
set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_PATH% set CHROME_PATH="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

echo.
echo Checking dependencies...
if not exist node_modules (
    echo Installing dependencies. Please wait...
    call npm install
)

echo.
echo Starting QuoteFlow Engine...
echo.
:: Start the engine in a minimized window
start /min "QuoteFlowEngine" npm run dev

echo Waiting for engine to warm up...
timeout /t 5 /nobreak > nul

echo Opening QuoteFlow in Chrome...
if exist %CHROME_PATH% (
    start "" %CHROME_PATH% --app=http://localhost:3000
) else (
    start http://localhost:3000
)

echo.
echo ==================================================
echo QuoteFlow is now running! 
echo.
echo [IMPORTANT] When you are finished, press any key 
echo here to properly STOP the engine and close app.
echo ==================================================
echo.
pause
echo Stopping engine...
taskkill /f /im node.exe > nul 2>&1
echo Done. Goodbye!
timeout /t 2 > nul
exit

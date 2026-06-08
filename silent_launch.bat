@echo off
SETLOCAL
cd /d "%~dp0"

:: Force Chrome to open the app
set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_PATH% set CHROME_PATH="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

:: Robust dependency check
if not exist "node_modules\tsx" (
    echo.
    echo ============================================================
    echo   [FIRST RUN] SETTING UP QUOTEFLOW ENGINE
    echo ============================================================
    echo   This is a one-time setup. Please wait while we install
    echo   professional dependencies. This window will close 
    echo   automatically once finished.
    echo.
    echo   Please stay connected to the internet.
    echo.
    call npm install --no-audit --no-fund
    if errorlevel 1 (
        echo.
        echo ERROR: Installation failed. Please check your internet.
        pause
        exit
    )
    cls
)

:: Start the engine in a hidden window via npm
:: We use 'npx' as a fallback to ensure 'tsx' is found
start /min "QuoteFlowEngine" npx tsx server.ts

:: Wait for engine to start (12 seconds for extra safety on laptop)
timeout /t 12 /nobreak > nul

:: Open Chrome
if exist %CHROME_PATH% (
    start "" %CHROME_PATH% --app=http://localhost:3000
) else (
    start http://localhost:3000
)

exit

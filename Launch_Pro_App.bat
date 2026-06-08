@echo off
SETLOCAL
cd /d "%~dp0"
TITLE QuoteFlow Engine

:: 1. Check if setup is already done (Fast check)
if exist "node_modules\.bin\electron.cmd" if exist "dist\index.html" goto launch

echo.
echo ============================================================
echo   CHECKING QUOTEFLOW ENGINE READYNESS...
echo ============================================================
echo.

:: 2. Check for dependencies and build files
if not exist "node_modules\.bin\electron.cmd" (
    echo [STEP 1/2] First-time setup: Downloading desktop libraries...
    echo (Please stay connected to internet)
    echo.
    call npm install --no-audit --no-fund
    if errorlevel 1 goto error
)

if not exist "dist\index.html" (
    echo.
    echo [STEP 2/2] Preparing application assets for first use...
    echo (This will make the app run faster)
    echo.
    call npm run build
    if errorlevel 1 goto error
    echo Setup Complete!
)

:launch
:: 3. Launch App WITHOUT 'start' to keep it in the hidden VBS process
:: This prevents a new CMD window from popping up.
".\node_modules\.bin\electron.cmd" .
exit

:error
echo.
echo ! ERROR: Setup failed. Please check your internet connection.
pause
exit

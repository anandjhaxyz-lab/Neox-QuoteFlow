@echo off
SETLOCAL
cd /d "%~dp0"

echo ============================================================
echo   BUILDING STANDALONE DESKTOP APP (.EXE)
echo ============================================================
echo.
echo   This will convert QuoteFlow into a single .exe file.
echo   First run? This might take 3-5 minutes to download tools.
echo.

:: 1. Install dependencies
echo [1/3] Downloading professional build tools...
call npm install --no-audit --no-fund
if errorlevel 1 goto error

:: 2. Build the project
echo [2/3] Preparing application assets...
call npm run build
if errorlevel 1 goto error

:: 3. Package into EXE
echo [3/3] Packaging into a standalone .exe...
call npm run electron:build
if errorlevel 1 goto error

echo.
echo ============================================================
echo   SUCCESS! YOUR APP IS READY
echo ============================================================
echo.
echo   Check the "release" folder. 
echo   You will find "QuoteFlow.exe" there.
echo.
echo   You can move this .exe anywhere (like Pendrive) and run it.
echo.
pause
exit

:error
echo.
echo ! ERROR: Build failed. Please check your internet connection.
echo ! Make sure Node.js is installed correctly.
pause
exit

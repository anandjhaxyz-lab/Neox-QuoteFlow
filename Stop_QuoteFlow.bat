@echo off
SETLOCAL
TITLE Stop QuoteFlow
echo Stopping QuoteFlow Engine...
taskkill /f /im node.exe > nul 2>&1
echo.
echo Engine Stopped.
echo You can now close your browser.
echo.
timeout /t 3
exit

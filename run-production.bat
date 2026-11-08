@echo off
setlocal enabledelayedexpansion
title Little Scholar School System - Production Server

echo ========================================================
echo       Little Scholar School System - Single Server
echo ========================================================
echo.

cd /d "%~dp0"

:: Verify Python Virtual Environment
if not exist "%~dp0backend\.venv\Scripts\python.exe" (
    echo [ERROR] Backend virtual environment not detected.
    echo Please run setup.bat first.
    pause
    exit /b 1
)

:: Auto-synchronize database schema
echo Synchronizing database schema to latest version...
pushd "%~dp0backend"
call ".venv\Scripts\python.exe" "scripts\setup-db.py"
popd

:: Verify built frontend exists
if not exist "%~dp0frontend\dist\index.html" (
    echo.
    echo [NOTICE] Production frontend build not found.
    echo Compiling React frontend with Vite...
    pushd "%~dp0frontend"
    call npm run build
    popd
    if not exist "%~dp0frontend\dist\index.html" (
        echo [ERROR] Frontend build failed.
        pause
        exit /b 1
    )
)

:: Detect host Wi-Fi IP
set "LOCAL_IP="
for /f "tokens=*" %%i in ('backend\.venv\Scripts\python.exe -c "import socket; s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('10.255.255.255', 1)); print(s.getsockname()[0]); s.close()" 2^>nul') do (
    set "LOCAL_IP=%%i"
)
if "!LOCAL_IP!"=="" set "LOCAL_IP=127.0.0.1"

:: Start Unified FastAPI Server (Serves both compiled UI and API on port 8000)
echo.
echo Starting Unified Application Server on port 8000...
cd /d "%~dp0backend"
start "Little Scholar - Unified Server (Port 8000)" cmd /k "call .venv\Scripts\activate.bat && uvicorn main:app --host 0.0.0.0 --port 8000"

:: Return to root directory
cd /d "%~dp0"

:: Wait 2 seconds and open browser
timeout /t 2 /nobreak >nul
start http://localhost:8000

echo.
echo ========================================================
echo   Little Scholar System is running on port 8000!
echo ========================================================
echo   * Admin Access (Laptop):       http://localhost:8000
echo   * Teachers on Wi-Fi:           http://!LOCAL_IP!:8000
echo   * API Documentation:           http://localhost:8000/docs
echo.
echo Single-Server Mode active: No Node.js process required.
echo ========================================================

:PROD_MENU
echo.
echo Quick Actions:
echo   [1] Open Portal in browser (http://localhost:8000)
echo   [2] Copy Teacher Wi-Fi Link (http://!LOCAL_IP!:8000) to clipboard
echo   [3] Create Instant Database Backup (backend\backups\)
echo   [4] Stop Unified Server (Port 8000)
echo   [5] Exit this launcher window
echo.

choice /c 12345 /n /m "Select an option [1-5]: "
set "USER_CHOICE=!errorlevel!"

if "!USER_CHOICE!"=="1" (
    start http://localhost:8000
    goto PROD_MENU
)
if "!USER_CHOICE!"=="2" (
    echo | set /p="http://!LOCAL_IP!:8000" | clip
    echo [COPIED] Link "http://!LOCAL_IP!:8000" copied to clipboard!
    goto PROD_MENU
)
if "!USER_CHOICE!"=="3" (
    echo.
    echo Creating disaster recovery backup...
    backend\.venv\Scripts\python.exe -c "import sys; from pathlib import Path; sys.path.insert(0, str(Path.cwd())); from backend.app.routers.system import create_local_snapshot; r = create_local_snapshot(); print('[SUCCESS] Backup created:', r['filename'], '(', r['size_mb'], 'MB )')"
    echo.
    goto PROD_MENU
)
if "!USER_CHOICE!"=="4" (
    echo.
    echo Stopping server on port 8000...
    taskkill /fi "WINDOWTITLE eq Little Scholar - Unified Server (Port 8000)*" /f /t >nul 2>&1
    for /f "tokens=5" %%p in ('netstat -aon 2^>nul ^| findstr /r ":8000\>" ^| findstr /i "LISTENING"') do (
        taskkill /f /t /pid %%p >nul 2>&1
    )
    echo Server stopped.
    pause
    exit /b 0
)
if "!USER_CHOICE!"=="5" (
    exit /b 0
)

goto PROD_MENU


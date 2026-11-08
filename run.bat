@echo off
setlocal enabledelayedexpansion
title School Management System - Runner

echo ========================================================
echo         School Management System - Launcher
echo ========================================================
echo.

:: Change directory to the repository root where this script resides
cd /d "%~dp0"

:: ----------------------------------------------------------
:: 1. Verify Prerequisites & Environment
:: ----------------------------------------------------------
set "NEED_SETUP=0"

if not exist "%~dp0backend\.venv\Scripts\python.exe" (
    echo [NOTICE] Backend virtual environment not detected.
    set "NEED_SETUP=1"
)

if not exist "%~dp0frontend\node_modules" (
    echo [NOTICE] Frontend node_modules not detected.
    set "NEED_SETUP=1"
)

if "!NEED_SETUP!"=="1" (
    echo.
    echo Running setup.bat first to configure your environment...
    call "%~dp0setup.bat"
    if not exist "%~dp0backend\.venv\Scripts\python.exe" (
        echo [ERROR] Setup failed or was aborted. Cannot start backend.
        pause
        exit /b 1
    )
)

:: ----------------------------------------------------------
:: 2. Auto-Synchronize Database Schema (Preserves Existing Data)
:: ----------------------------------------------------------
echo Synchronizing database schema to latest version...
pushd "%~dp0backend"
call ".venv\Scripts\python.exe" "scripts\setup-db.py"
popd

:: ----------------------------------------------------------
:: 3. Detect Host Machine Wi-Fi / LAN IP for Multi-Device Access
:: ----------------------------------------------------------
set "LOCAL_IP="
for /f "tokens=*" %%i in ('backend\.venv\Scripts\python.exe -c "import socket; s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('10.255.255.255', 1)); print(s.getsockname()[0]); s.close()" 2^>nul') do (
    set "LOCAL_IP=%%i"
)
if "!LOCAL_IP!"=="" set "LOCAL_IP=127.0.0.1"

:: ----------------------------------------------------------
:: 4. Launch Backend and Frontend in Separate Windows (0.0.0.0)
:: ----------------------------------------------------------
echo.
echo Starting Backend (FastAPI on 0.0.0.0:8000)...
cd /d "%~dp0backend"
start "School Management - Backend (FastAPI)" cmd /k "call .venv\Scripts\activate.bat && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo Starting Frontend (Vite on 0.0.0.0:5173)...
cd /d "%~dp0frontend"
start "School Management - Frontend (Vite)" cmd /k "npm run dev -- --host 0.0.0.0 --port 5173"

:: Return to root directory
cd /d "%~dp0"

:: ----------------------------------------------------------
:: 5. Server Status & Quick Actions Menu
:: ----------------------------------------------------------
echo.
echo ========================================================
echo     Both services have been launched successfully!
echo ========================================================
echo   * Host Laptop Access:
echo     - Frontend App:         http://localhost:5173
echo     - Backend API:          http://127.0.0.1:8000
echo     - API Documentation:    http://127.0.0.1:8000/docs
echo.
echo   * Mobile Devices ^& Teachers on Same Wi-Fi:
echo     - Teacher Web Access:   http://!LOCAL_IP!:5173
echo     - Mobile Backend API:   http://!LOCAL_IP!:8000
echo.
echo Both servers are running in separate terminal windows.
echo Keep those windows open while using the application.
echo ========================================================

:MENU
echo.
echo Quick Actions:
echo   [1] Open Frontend in browser (http://localhost:5173)
echo   [2] Open API Documentation in browser (http://127.0.0.1:8000/docs)
echo   [3] Open Both in browser
echo   [4] Copy Mobile Wi-Fi URL (http://!LOCAL_IP!:5173) to clipboard
echo   [5] Create Instant Database Backup (Safely saves to backend\backups\)
echo   [6] Stop all running servers (kill port 8000 and 5173)
echo   [7] Run setup.bat (Update dependencies, sync schema ^& rebuild)
echo   [8] Exit this launcher window (servers keep running)
echo.

choice /c 12345678 /n /m "Select an option [1-8]: "
set "USER_CHOICE=!errorlevel!"

if "!USER_CHOICE!"=="1" (
    start http://localhost:5173
    goto MENU
)
if "!USER_CHOICE!"=="2" (
    start http://127.0.0.1:8000/docs
    goto MENU
)
if "!USER_CHOICE!"=="3" (
    start http://localhost:5173
    start http://127.0.0.1:8000/docs
    goto MENU
)
if "!USER_CHOICE!"=="4" (
    echo | set /p="http://!LOCAL_IP!:5173" | clip
    echo [COPIED] Mobile URL "http://!LOCAL_IP!:5173" copied to clipboard!
    goto MENU
)
if "!USER_CHOICE!"=="5" (
    echo.
    echo Creating instant disaster recovery database backup...
    backend\.venv\Scripts\python.exe -c "import sys; from pathlib import Path; sys.path.insert(0, str(Path.cwd())); from backend.app.routers.system import create_local_snapshot; r = create_local_snapshot(); print('[SUCCESS] Backup created:', r['filename'], '(', r['size_mb'], 'MB )')"
    echo.
    goto MENU
)
if "!USER_CHOICE!"=="6" (
    echo.
    echo Stopping servers running on port 8000 and port 5173...
    taskkill /fi "WINDOWTITLE eq School Management - Backend (FastAPI)*" /f /t >nul 2>&1
    taskkill /fi "WINDOWTITLE eq School Management - Frontend (Vite)*" /f /t >nul 2>&1
    for /f "tokens=5" %%p in ('netstat -aon 2^>nul ^| findstr /r ":8000\>" ^| findstr /i "LISTENING"') do (
        taskkill /f /t /pid %%p >nul 2>&1
    )
    for /f "tokens=5" %%p in ('netstat -aon 2^>nul ^| findstr /r ":5173\>" ^| findstr /i "LISTENING"') do (
        taskkill /f /t /pid %%p >nul 2>&1
    )
    echo Servers stopped.
    echo.
    pause
    exit /b 0
)
if "!USER_CHOICE!"=="7" (
    echo.
    echo Running setup.bat to update dependencies and rebuild...
    call "%~dp0setup.bat"
    goto MENU
)
if "!USER_CHOICE!"=="8" (
    exit /b 0
)

goto MENU

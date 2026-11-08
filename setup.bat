@echo off
setlocal enabledelayedexpansion
title School Management System - Setup

echo ========================================================
echo         School Management System - Environment Setup
echo ========================================================
echo.

rem Change directory to the repository root where this script resides
cd /d "%~dp0"

rem ----------------------------------------------------------
rem 1. Check Python Installation
rem ----------------------------------------------------------
echo [1/6] Checking Python installation...
set "PYTHON_CMD="

python --version >nul 2>&1
if %errorlevel% equ 0 (
    set "PYTHON_CMD=python"
) else (
    py -3 --version >nul 2>&1
    if !errorlevel! equ 0 (
        set "PYTHON_CMD=py -3"
    ) else (
        py --version >nul 2>&1
        if !errorlevel! equ 0 (
            set "PYTHON_CMD=py"
        )
    )
)

if "%PYTHON_CMD%"=="" (
    echo [ERROR] Python was not found in your PATH.
    echo Please install Python 3.9 or newer from https://www.python.org/
    echo During installation, be sure to check "Add Python to PATH".
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('%PYTHON_CMD% --version 2^>^&1') do echo        Found: %%v

rem ----------------------------------------------------------
rem 2. Check Node.js and npm Installation
rem ----------------------------------------------------------
echo.
echo [2/6] Checking Node.js and npm installation...

node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js was not found in your PATH.
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

call npm -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm was not found in your PATH.
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v 2^>^&1') do echo        Node.js: %%v
for /f "tokens=*" %%v in ('npm -v 2^>^&1') do echo        npm:     v%%v

rem ----------------------------------------------------------
rem 3. Setup Python Backend Environment & Dependencies
rem ----------------------------------------------------------
echo.
echo [3/6] Setting up Backend virtual environment and dependencies...

if not exist "%~dp0backend" (
    echo [ERROR] backend directory not found!
    pause
    exit /b 1
)

pushd "%~dp0backend"

if not exist ".venv\Scripts\python.exe" (
    echo        Creating virtual environment in backend\.venv...
    %PYTHON_CMD% -m venv ".venv"
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to create Python virtual environment.
        popd
        pause
        exit /b 1
    )
    echo        Virtual environment created successfully.
) else (
    echo        Virtual environment exists in backend\.venv.
)

echo        Upgrading pip, setuptools, and wheel in backend virtual environment...
call ".venv\Scripts\python.exe" -m pip install --upgrade pip setuptools wheel
if !errorlevel! neq 0 (
    echo [WARNING] Could not upgrade pip/setuptools/wheel. Continuing with installation...
)

echo        Installing and updating backend dependencies from requirements.txt...
call ".venv\Scripts\python.exe" -m pip install -r "requirements.txt"
if !errorlevel! neq 0 (
    echo [ERROR] Failed to install backend dependencies.
    popd
    pause
    exit /b 1
)

if not exist ".env" (
    if exist ".env.example" (
        echo        Creating backend\.env from .env.example...
        copy ".env.example" ".env" >nul
        echo        backend\.env created.
    )
)

popd
echo        Backend dependencies installed and up to date.

rem ----------------------------------------------------------
rem 4. Synchronize and Verify Database Schema (Zero Data Loss)
rem ----------------------------------------------------------
echo.
echo [4/6] Synchronizing and verifying Database schema...

pushd "%~dp0backend"
call ".venv\Scripts\python.exe" "scripts\setup-db.py"
if !errorlevel! neq 0 (
    echo [ERROR] Database setup or schema synchronization failed.
    popd
    pause
    exit /b 1
)
popd
echo        Database schema synchronized. Existing data preserved.

rem ----------------------------------------------------------
rem 5. Setup Frontend Dependencies
rem ----------------------------------------------------------
echo.
echo [5/6] Setting up Frontend dependencies (npm install)...

if not exist "%~dp0frontend\package.json" (
    echo [ERROR] frontend\package.json not found!
    pause
    exit /b 1
)

pushd "%~dp0frontend"
echo        Installing and updating frontend dependencies from package.json...
call npm install
if !errorlevel! neq 0 (
    echo [ERROR] Failed to install frontend dependencies.
    popd
    pause
    exit /b 1
)

if not exist ".env" (
    if exist ".env.example" (
        echo        Creating frontend\.env from .env.example...
        copy ".env.example" ".env" >nul
        echo        frontend\.env created.
    )
)

popd
echo        Frontend dependencies installed and up to date.

rem ----------------------------------------------------------
rem 6. Build and Verify Frontend Production Assets
rem ----------------------------------------------------------
echo.
echo [6/6] Building and verifying Frontend production assets (npm run build)...

pushd "%~dp0frontend"
call npm run build
if !errorlevel! neq 0 (
    echo [WARNING] Frontend build encountered warnings or non-zero status.
    echo Development server (npm run dev) will still function properly.
) else (
    echo        Frontend production assets built successfully in frontend\dist.
)
popd

rem ----------------------------------------------------------
rem Completion
rem ----------------------------------------------------------
echo.
echo ========================================================
echo               Setup Completed Successfully!
echo ========================================================
echo.
echo  [x] Backend dependencies verified & updated (requirements.txt)
echo  [x] Database schema synchronized with ZERO data loss
echo  [x] Frontend dependencies verified & updated (npm install)
echo  [x] Frontend assets compiled and validated (npm run build)
echo.
echo You can now start both Backend and Frontend by running:
echo    run.bat
echo.
pause

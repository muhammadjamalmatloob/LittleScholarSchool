@echo off
setlocal enabledelayedexpansion

echo ==============================================================================
echo        LITTLE SCHOLAR SCHOOL SYSTEM - ELECTRON INSTALLER BUILDER
echo ==============================================================================
echo.

:: 1. Detect Python and Node
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not found in PATH. Please install Node.js version 18 or newer.
    pause
    exit /b 1
)

set "PYTHON_EXE=python"
if exist "backend\.venv\Scripts\python.exe" (
    set "PYTHON_EXE=backend\.venv\Scripts\python.exe"
)

%PYTHON_EXE% --version >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python was not found. Please verify Python is installed.
    pause
    exit /b 1
)

echo [INFO] Using Python: %PYTHON_EXE%
echo.

:: 2. Build React Frontend
echo [STEP 1/4] Building React Production Frontend...
cd frontend
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to compile React frontend.
    cd ..
    pause
    exit /b 1
)
cd ..
echo [OK] Frontend build complete.
echo.

:: 3. Freeze Python FastAPI Backend
echo [STEP 2/4] Compiling Standalone Python Backend to api-server.exe...
%PYTHON_EXE% -m pip install pyinstaller
%PYTHON_EXE% electron\build_api_server.py
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to build backend executable.
    pause
    exit /b 1
)
echo [OK] Backend executable ready.
echo.

:: 4. Install Electron Dependencies
echo [STEP 3/4] Installing Electron dependencies...
cd electron
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install electron dependencies.
    cd ..
    pause
    exit /b 1
)

:: 5. Package into Windows Installer (.exe)
echo.
echo [STEP 4/4] Generating Installable Windows Setup EXE with electron-builder...
call npm run dist
if %ERRORLEVEL% neq 0 (
    echo [ERROR] electron-builder failed to build the installer.
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo ==============================================================================
echo [SUCCESS] Complete Installable EXE generated successfully!
echo Frontend, Standalone Backend, and Database are all bundled inside.
echo Output Location: electron\dist-installer\
echo ==============================================================================
echo.
pause

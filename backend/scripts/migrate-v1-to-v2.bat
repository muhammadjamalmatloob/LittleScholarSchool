@echo off
setlocal
cd /d "%~dp0\..\.."

if not exist "backend\.venv\Scripts\python.exe" (
    echo Backend virtual environment not found.
    echo Create it with: python -m venv backend\.venv
    pause
    exit /b 1
)

"backend\.venv\Scripts\python.exe" "backend\scripts\migrate_v1_to_v2.py"
if errorlevel 1 (
    echo Database migration failed.
    pause
    exit /b 1
)

echo Database migration completed successfully.
pause
endlocal

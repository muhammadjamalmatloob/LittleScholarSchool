# School Management System

A desktop and web-ready School Management System built with FastAPI (Backend) and React + Vite + Tailwind CSS (Frontend).

---

## Quick Start (Windows)

You can set up and run both the backend and frontend using the provided batch scripts:

### 1. Setup Environment
Double-click `setup.bat` or run:
```cmd
setup.bat
```
This script will:
- Check for Python 3.9+ and Node.js / npm.
- Create the Python virtual environment in `backend\.venv`.
- Install backend dependencies (`fastapi`, `uvicorn`, etc.).
- Install frontend dependencies (`npm install`).

### 2. Run Application
Double-click `run.bat` or run:
```cmd
run.bat
```
This script will:
- Verify that your environment is set up (auto-runs `setup.bat` if needed).
- Launch the **FastAPI Backend** (`http://127.0.0.1:8000`) in its own terminal window.
- Launch the **Vite React Frontend** (`http://localhost:5173`) in its own terminal window.
- Provide a quick-actions menu to open the app or API docs in your browser, or stop all servers.

---

## Manual Setup & Execution

### Backend

Create and activate a virtual environment, install the dependencies, and run FastAPI:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

- **Backend API:** `http://127.0.0.1:8000`
- **Swagger Documentation:** `http://127.0.0.1:8000/docs`

### Frontend

Install dependencies and start the Vite development server:

```powershell
cd frontend
npm install
npm run dev
```

- **Frontend Application:** `http://localhost:5173`

## Phase 0 database migration

The revised plan uses the v2 database schema. Migration is intentionally
explicit and is not run automatically when the API starts. Stop the API, then
run this from the repository root:

```powershell
backend\scripts\migrate-v1-to-v2.bat
```

The migration creates a timestamped `school_data_v1_backup_*.db` backup before
replacing the database. It converts numeric student IDs to `STUD_0001`-style
IDs and creates the academic-year, teacher, fee-charge, exam-type, and
exam-record tables.

Student roll numbers are assigned automatically by the backend. They restart
at `1` for each class and academic year, and are not entered in the student
form or CSV import.

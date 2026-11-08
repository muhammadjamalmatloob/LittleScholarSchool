import sys
from pathlib import Path

# Ensure project root directory is on sys.path
if getattr(sys, "frozen", False):
    _base_bundle = Path(getattr(sys, "_MEIPASS", Path(sys.executable).parent))
    _root_dir = _base_bundle
    _frontend_dist = _base_bundle / "frontend" / "dist"
else:
    _root_dir = Path(__file__).resolve().parent.parent.parent
    if str(_root_dir) not in sys.path:
        sys.path.insert(0, str(_root_dir))
    _frontend_dist = _root_dir / "frontend" / "dist"

from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.app.config import settings
from backend.app.database import init_database
from backend.app.middleware.licensing import require_module
from backend.app.routers import (
    auth_router,
    users_router,
    classes_router,
    students_router,
    import_router,
    teachers_router,
    academic_years_router,
    class_teacher_assignment_router,
    fees_router,
    subjects_router,
    exams_router,
    attendance_router,
    timetable_router,
    reports_router,
    student_promotion_router,
    system_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database and seed defaults on startup
    init_database()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="FastAPI Backend for Little Scholar School System with RBAC, Student Management, and Section-Wise Academic Management",
    lifespan=lifespan,
)

# Configure Cross-Origin Resource Sharing (CORS) for Localhost, Wi-Fi LAN subnets, and Mobile Webview
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS or ["*"],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$|^capacitor://localhost$|^http://localhost$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers (Strictly under /api prefix with module-level feature gating)
app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(classes_router, prefix="/api")
app.include_router(students_router, prefix="/api")
app.include_router(import_router, prefix="/api")
app.include_router(
    teachers_router,
    prefix="/api",
    dependencies=[Depends(require_module("teachers"))],
)
app.include_router(academic_years_router, prefix="/api")
app.include_router(class_teacher_assignment_router, prefix="/api")
app.include_router(
    fees_router,
    prefix="/api",
    dependencies=[Depends(require_module("fees"))],
)
app.include_router(subjects_router, prefix="/api")
app.include_router(
    exams_router,
    prefix="/api",
    dependencies=[Depends(require_module("exams"))],
)
app.include_router(
    attendance_router,
    prefix="/api",
    dependencies=[Depends(require_module("attendance"))],
)
app.include_router(
    timetable_router,
    prefix="/api",
    dependencies=[Depends(require_module("timetable"))],
)
app.include_router(
    reports_router,
    prefix="/api",
    dependencies=[Depends(require_module("reports"))],
)
app.include_router(
    student_promotion_router,
    prefix="/api",
    dependencies=[Depends(require_module("promotion"))],
)
app.include_router(system_router, prefix="/api")


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "healthy", "school": "Little Scholar School System"}


# =============================================================================
# Production Single-Server Static File Serving (Vite SPA)
# When frontend/dist exists, FastAPI serves the compiled React app directly.
# This enables single-server desktop deployments without requiring Node.js.
# =============================================================================
_frontend_dist = _root_dir / "frontend" / "dist"
_assets_dir = _frontend_dist / "assets"

if _frontend_dist.exists() and (_frontend_dist / "index.html").exists():
    if _assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa_frontend(full_path: str):
        # Never intercept API, Docs, or OpenAPI schema endpoints
        if (
            full_path.startswith("api")
            or full_path.startswith("docs")
            or full_path.startswith("redoc")
            or full_path == "openapi.json"
        ):
            raise HTTPException(status_code=404, detail="Endpoint not found")

        candidate_file = _frontend_dist / full_path
        if candidate_file.is_file():
            return FileResponse(candidate_file)

        # Fallback to index.html for React Router SPA routes
        return FileResponse(_frontend_dist / "index.html")
else:
    @app.get("/")
    def read_root() -> dict[str, str]:
        return {
            "message": "Little Scholar School System API is running (Development Mode)",
            "docs_url": "/docs",
            "version": settings.VERSION,
        }

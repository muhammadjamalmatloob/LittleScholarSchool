import os
import shutil
import sqlite3
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.config import BACKEND_DIR, settings
from backend.app.database import get_db
from backend.app.middleware.rbac import require_roles
from backend.app.models import User
from backend.app.utils.licensing import (
    activate_license_key,
    deactivate_license,
    get_active_license,
    sync_active_license,
)

router = APIRouter(prefix="/system", tags=["System & Backup"])

BACKUP_DIR = BACKEND_DIR / "backups"
BACKUP_DIR.mkdir(parents=True, exist_ok=True)


def _get_active_db_path() -> Path:
    """Return the resolved Path of the active SQLite database."""
    return Path(settings.canonical_db_file)


@router.get("/status")
def get_system_status(
    current_user: User = Depends(require_roles("admin", "principal")),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Retrieve system diagnostics, database size, and snapshot metrics."""
    db_path = _get_active_db_path()
    db_size_bytes = db_path.stat().st_size if db_path.exists() else 0

    snapshots = sorted(
        BACKUP_DIR.glob("*.db"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )

    return {
        "status": "healthy",
        "app_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": {
            "path": db_path.name,
            "size_bytes": db_size_bytes,
            "size_mb": round(db_size_bytes / (1024 * 1024), 2),
            "last_modified": (
                datetime.fromtimestamp(db_path.stat().st_mtime).isoformat()
                if db_path.exists()
                else None
            ),
        },
        "backups": {
            "count": len(snapshots),
            "latest": snapshots[0].name if snapshots else None,
        },
    }


@router.get("/backup/download")
def download_database_backup(
    current_user: User = Depends(require_roles("admin", "principal")),
):
    """Generate a consistent hot SQLite backup and stream it as a downloadable file."""
    db_path = _get_active_db_path()
    if not db_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active database file not found.",
        )

    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    download_filename = f"little_scholar_backup_{timestamp_str}.db"

    # Create temporary snapshot file to avoid locking or race conditions during transfer
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".db")
    temp_file.close()

    try:
        src_conn = sqlite3.connect(str(db_path))
        dst_conn = sqlite3.connect(temp_file.name)
        src_conn.backup(dst_conn)
        dst_conn.close()
        src_conn.close()

        return FileResponse(
            path=temp_file.name,
            filename=download_filename,
            media_type="application/x-sqlite3",
        )
    except Exception as e:
        if os.path.exists(temp_file.name):
            os.remove(temp_file.name)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate backup: {str(e)}",
        )


@router.post("/backup/snapshot")
def create_local_snapshot(
    current_user: User = Depends(require_roles("admin", "principal")),
) -> Dict[str, Any]:
    """Create a timestamped disaster recovery snapshot inside backend/backups/."""
    db_path = _get_active_db_path()
    if not db_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active database file not found.",
        )

    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    snapshot_filename = f"school_backup_{timestamp_str}.db"
    snapshot_path = BACKUP_DIR / snapshot_filename

    try:
        src_conn = sqlite3.connect(str(db_path))
        dst_conn = sqlite3.connect(str(snapshot_path))
        src_conn.backup(dst_conn)
        dst_conn.close()
        src_conn.close()

        size_bytes = snapshot_path.stat().st_size
        return {
            "message": "Disaster recovery snapshot created successfully.",
            "filename": snapshot_filename,
            "size_bytes": size_bytes,
            "size_mb": round(size_bytes / (1024 * 1024), 2),
            "created_at": datetime.now().isoformat(),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create snapshot: {str(e)}",
        )


@router.get("/backup/snapshots")
def list_snapshots(
    current_user: User = Depends(require_roles("admin", "principal")),
) -> List[Dict[str, Any]]:
    """List all available disaster recovery snapshots in backend/backups/."""
    snapshots = []
    for p in sorted(BACKUP_DIR.glob("*.db"), key=lambda f: f.stat().st_mtime, reverse=True):
        stat = p.stat()
        snapshots.append(
            {
                "filename": p.name,
                "size_bytes": stat.st_size,
                "size_mb": round(stat.st_size / (1024 * 1024), 2),
                "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            }
        )
    return snapshots


@router.post("/backup/restore")
async def restore_database(
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles("admin")),
) -> Dict[str, Any]:
    """Safely validate and restore an uploaded SQLite database file with automatic safety snapshot."""
    if not file.filename.endswith(".db") and not file.filename.endswith(".sqlite"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Uploaded file must have a .db or .sqlite extension.",
        )

    # Save uploaded file to temporary location for integrity verification
    temp_upload = tempfile.NamedTemporaryFile(delete=False, suffix=".db")
    try:
        content = await file.read()
        if len(content) < 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty or too small to be a valid SQLite database.",
            )
        temp_upload.write(content)
        temp_upload.close()

        # Step 1: Verify SQLite magic header bytes
        with open(temp_upload.name, "rb") as f:
            header = f.read(16)
        if not header.startswith(b"SQLite format 3\x00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is not a valid SQLite database.",
            )

        # Step 2: Test PRAGMA integrity_check
        test_conn = sqlite3.connect(temp_upload.name)
        cursor = test_conn.cursor()
        cursor.execute("PRAGMA integrity_check;")
        res = cursor.fetchone()
        if not res or res[0] != "ok":
            test_conn.close()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Database integrity check failed. The file appears to be corrupted.",
            )

        # Step 3: Verify core schema tables exist
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users', 'students', 'classes');"
        )
        existing_tables = {row[0] for row in cursor.fetchall()}
        test_conn.close()

        if len(existing_tables) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded database does not contain Little Scholar school tables (users, students, classes).",
            )

        # Step 4: Take automatic emergency safety snapshot of current active DB
        db_path = _get_active_db_path()
        if db_path.exists():
            safety_ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            safety_path = BACKUP_DIR / f"auto_pre_restore_safety_{safety_ts}.db"
            active_conn = sqlite3.connect(str(db_path))
            safety_conn = sqlite3.connect(str(safety_path))
            active_conn.backup(safety_conn)
            safety_conn.close()
            active_conn.close()

        # Step 5: Safely hot-restore uploaded database to active path
        restore_src = sqlite3.connect(temp_upload.name)
        restore_dst = sqlite3.connect(str(db_path))
        restore_src.backup(restore_dst)
        restore_dst.close()
        restore_src.close()

        return {
            "message": "Database successfully restored. Safety pre-restore snapshot was automatically archived.",
            "restored_from": file.filename,
            "restored_at": datetime.now().isoformat(),
        }
    finally:
        if os.path.exists(temp_upload.name):
            os.remove(temp_upload.name)


class LicenseActivationRequest(BaseModel):
    license_key: str


@router.get("/license")
def get_system_license() -> Dict[str, Any]:
    """Retrieve active school branding, license status, and unlocked feature modules."""
    return get_active_license()


@router.get("/logo")
def get_school_logo():
    """Serve the active school logo (cached locally on activation)."""
    for ext, mtype in [
        (".png", "image/png"),
        (".jpg", "image/jpeg"),
        (".jpeg", "image/jpeg"),
        (".webp", "image/webp"),
    ]:
        logo_path = BACKEND_DIR / f"school_logo{ext}"
        if logo_path.exists():
            return FileResponse(
                logo_path,
                media_type=mtype,
                headers={"Cache-Control": "no-cache, must-revalidate"},
            )

    import sys
    bundle_base = Path(getattr(sys, "_MEIPASS", Path(sys.executable).parent if getattr(sys, "frozen", False) else BACKEND_DIR.parent))
    candidates = [
        BACKEND_DIR.parent / "frontend" / "public" / "logo.jpg",
        bundle_base / "frontend" / "dist" / "logo.jpg",
        bundle_base / "frontend" / "public" / "logo.jpg",
    ]
    for default_logo in candidates:
        if default_logo.exists():
            return FileResponse(
                default_logo,
                media_type="image/jpeg",
                headers={"Cache-Control": "no-cache, must-revalidate"},
            )

    raise HTTPException(status_code=404, detail="School logo not found")


@router.post("/activate-license")
def activate_system_license(
    payload: LicenseActivationRequest,
) -> Dict[str, Any]:
    """Activate a school license key (supports DEV-ALL, DEV-FEE-ONLY, DEV-ACADEMIC in dev mode)."""
    return activate_license_key(payload.license_key)


@router.post("/deactivate-license")
def deactivate_system_license() -> Dict[str, Any]:
    """Reset or remove the local license file (reverts to unactivated or default dev state)."""
    return deactivate_license()


@router.post("/sync-license")
def sync_system_license(
    current_user: User = Depends(require_roles("admin", "principal")),
) -> Dict[str, Any]:
    """Refresh active school license, plan modules, and branding from central cloud registry."""
    return sync_active_license()




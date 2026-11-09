import os
import sys
import subprocess
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / "backend"
output_dir = root_dir / "electron" / "api-server"

print("=" * 60)
print("Building Standalone FastAPI Backend for Electron...")
print("=" * 60)

cmd = [
    sys.executable,
    "-m",
    "PyInstaller",
    "--noconfirm",
    "--onedir",
    "--clean",
    "--name", "api-server",
    "--distpath", str(root_dir / "electron"),
    "--workpath", str(root_dir / "electron" / "build_cache"),
    "--specpath", str(root_dir / "electron"),
    f"--paths={str(root_dir)}",
    f"--paths={str(backend_dir)}",
    # Hidden imports required by FastAPI and Uvicorn
    "--hidden-import=uvicorn",
    "--hidden-import=uvicorn.logging",
    "--hidden-import=uvicorn.loops",
    "--hidden-import=uvicorn.loops.auto",
    "--hidden-import=uvicorn.protocols",
    "--hidden-import=uvicorn.protocols.http",
    "--hidden-import=uvicorn.protocols.http.auto",
    "--hidden-import=uvicorn.protocols.http.h11_impl",
    "--hidden-import=uvicorn.protocols.websockets",
    "--hidden-import=uvicorn.protocols.websockets.auto",
    "--hidden-import=uvicorn.lifespan",
    "--hidden-import=uvicorn.lifespan.on",
    "--hidden-import=backend.app.main",
    "--hidden-import=backend.app.models",
    "--hidden-import=backend.app.database",
    "--hidden-import=backend.app.routers",
    "--hidden-import=backend.app.routers.auth",
    "--hidden-import=backend.app.routers.students",
    "--hidden-import=backend.app.routers.student_promotion",
    "--hidden-import=backend.app.routers.classes",
    "--hidden-import=backend.app.routers.teachers",
    "--hidden-import=backend.app.routers.subjects",
    "--hidden-import=backend.app.routers.attendance",
    "--hidden-import=backend.app.routers.fees",
    "--hidden-import=backend.app.routers.exams",
    "--hidden-import=backend.app.routers.timetable",
    "--hidden-import=backend.app.routers.reports",
    "--hidden-import=backend.app.routers.academic_years",
    "--hidden-import=backend.app.utils.student_promotion",
    "--hidden-import=backend.app.utils.roll_numbers",
    "--hidden-import=sqlalchemy.dialects.sqlite",
    "--hidden-import=reportlab",
    "--hidden-import=openpyxl",
    "--hidden-import=bcrypt",
    "--hidden-import=jwt",
    "--hidden-import=python_multipart",
    str(backend_dir / "main.py"),
]

print("Executing PyInstaller command...")
res = subprocess.run(cmd)
if res.returncode == 0:
    print("\n[OK] api-server.exe built successfully in electron/api-server/")
else:
    print(f"\n[ERROR] Build failed with exit code {res.returncode}")
    sys.exit(res.returncode)

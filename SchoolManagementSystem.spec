# -*- mode: python ; coding: utf-8 -*-
import os
import sys
from pathlib import Path
from PyInstaller.utils.hooks import collect_data_files, collect_dynamic_libs, collect_submodules

block_cipher = None
project_root = Path.cwd()

# Static assets and seed data to bundle
added_data = [
    (str(project_root / 'frontend' / 'dist'), os.path.join('frontend', 'dist')),
]

# Add webview lib data files (needed by pywebview on Windows)
added_data += collect_data_files('webview')

# Include initial seed db / logo if present (license.json is NOT bundled so customer activates on first boot)
for filename in ['school_data.db', 'school_logo.png']:
    file_path = project_root / 'backend' / filename
    if file_path.exists():
        added_data.append((str(file_path), 'backend'))

added_binaries = collect_dynamic_libs('webview')

hidden_imports = [
    'webview',
    'webview.platforms.winforms',
    'webview.platforms.edgechromium',
    'pythonnet',
    'clr',
    'clr_loader',
    'proxy_tools',
    'bottle',
    'uvicorn',
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.http.h11_impl',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'fastapi',
    'starlette',
    'starlette.middleware',
    'starlette.middleware.cors',
    'starlette.staticfiles',
    'pydantic',
    'pydantic_core',
    'sqlalchemy',
    'sqlalchemy.dialects.sqlite',
    'sqlalchemy.ext.baked',
    'sqlalchemy.orm',
    'reportlab',
    'openpyxl',
    'httpx',
    'bcrypt',
    'jwt',
    'python_multipart',
    'multipart',
    'PIL',
    'PIL.Image',
    'sqlite3',
    'backend.app.main',
    'backend.app.config',
    'backend.app.database',
    'backend.app.models',
    'backend.app.schemas',
    'backend.app.routers',
    'backend.app.routers.auth',
    'backend.app.routers.users',
    'backend.app.routers.classes',
    'backend.app.routers.students',
    'backend.app.routers.teachers',
    'backend.app.routers.courses',
    'backend.app.routers.attendance',
    'backend.app.routers.fees',
    'backend.app.routers.exams',
    'backend.app.routers.timetable',
    'backend.app.routers.reports',
    'backend.app.routers.promotion',
    'backend.app.routers.system',
    'backend.app.middleware.licensing',
    'backend.app.middleware.rbac',
    'backend.app.utils.licensing',
]

hidden_imports += collect_submodules('webview')

a = Analysis(
    ['desktop_launcher.py'],
    pathex=[str(project_root)],
    binaries=added_binaries,
    datas=added_data,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'PyQt5', 'PySide2', 'IPython', 'notebook'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='SchoolManagementSystem',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=str(project_root / 'app_icon.ico') if (project_root / 'app_icon.ico').exists() else None,
)

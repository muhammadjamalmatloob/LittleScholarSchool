import sys
import multiprocessing
from pathlib import Path

# Ensure project root directory is on sys.path so 'backend.app' can be resolved
_project_root = Path(__file__).resolve().parent.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

_backend_dir = Path(__file__).resolve().parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from backend.app.main import app  # noqa: F401

if __name__ == '__main__':
    multiprocessing.freeze_support()
    import uvicorn
    is_frozen = getattr(sys, 'frozen', False)
    uvicorn.run(
        app if is_frozen else 'main:app',
        host='127.0.0.1',
        port=8000,
        reload=not is_frozen,
    )

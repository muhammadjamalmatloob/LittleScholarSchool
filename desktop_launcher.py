import os
import sys

# Crucial Windows GUI fix: When compiled with console=False, sys.stdout and sys.stderr are None.
# If left as None, Uvicorn's default logging formatters crash with:
# "ValueError: Unable to configure formatter 'default'"
if sys.stdout is None:
    sys.stdout = open(os.devnull, "w")
if sys.stderr is None:
    sys.stderr = open(os.devnull, "w")

import socket
import time
import logging
import threading
import shutil
from pathlib import Path

# Ensure root directory is on sys.path
_this_dir = Path(__file__).resolve().parent
if str(_this_dir) not in sys.path:
    sys.path.insert(0, str(_this_dir))

# Configure frozen environment for PyInstaller
if getattr(sys, "frozen", False):
    os.environ["ENVIRONMENT"] = "production"
    EXE_DIR = Path(sys.executable).parent
    DATA_DIR = EXE_DIR / "data"
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Initial data seeding: If data/ files don't exist on a fresh machine, copy initial seed files
    bundle_root = Path(getattr(sys, "_MEIPASS", EXE_DIR))
    bundled_db = bundle_root / "backend" / "school_data.db"
    bundled_logo = bundle_root / "backend" / "school_logo.png"

    target_db = DATA_DIR / "school_data.db"
    target_logo = DATA_DIR / "school_logo.png"

    if not target_db.exists() and bundled_db.exists():
        try:
            shutil.copy2(bundled_db, target_db)
        except Exception:
            pass

    if not target_logo.exists() and bundled_logo.exists():
        try:
            shutil.copy2(bundled_logo, target_logo)
        except Exception:
            pass

    # Configure logging to data/desktop_app.log
    log_file = DATA_DIR / "desktop_app.log"
    logging.basicConfig(
        filename=str(log_file),
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
else:
    logging.basicConfig(level=logging.INFO)

logger = logging.getLogger("desktop_app")


def find_available_port(start_port=8000) -> int:
    """Find a free port starting at 8000, avoiding collisions if another instance is running."""
    for port in range(start_port, start_port + 20):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(("0.0.0.0", port))
                return port
        except OSError:
            continue
    return start_port


def wait_for_server(port: int, timeout=15.0) -> bool:
    """Poll localhost until the FastAPI server is accepting HTTP connections."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(0.5)
                if s.connect_ex(("127.0.0.1", port)) == 0:
                    return True
        except Exception:
            pass
        time.sleep(0.2)
    return False


def start_uvicorn_server(server_port: int):
    """Run Uvicorn inside a background daemon thread with null log_config to prevent formatter crash."""
    try:
        import uvicorn
        from backend.app.main import app
        # log_config=None prevents Uvicorn from attempting to configure sys.stdout formatters
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=server_port,
            log_config=None,
            access_log=False,
        )
    except Exception as e:
        logger.error(f"Uvicorn server crashed: {e}", exc_info=True)


def main():
    logger.info("Starting Little Scholar School System Desktop Application...")
    port = find_available_port(8000)
    logger.info(f"Selected port: {port}")

    # 1. Start the backend server in a background daemon thread
    server_thread = threading.Thread(target=start_uvicorn_server, args=(port,), daemon=True)
    server_thread.start()

    # 2. Wait for the server to come online before launching GUI
    server_ready = wait_for_server(port, timeout=12.0)
    if not server_ready:
        logger.error(f"Server did not respond on port {port} within timeout!")
    else:
        logger.info(f"Backend server is healthy and accepting requests on port {port}.")

    app_url = f"http://127.0.0.1:{port}"
    logger.info(f"Opening native desktop window to {app_url}...")

    # 3. Launch native desktop window using pywebview
    try:
        import webview
        from backend.app.config import settings

        window = webview.create_window(
            title=f"{settings.PROJECT_NAME}",
            url=app_url,
            width=1340,
            height=860,
            min_size=(1024, 700),
            confirm_close=False,
            text_select=True,
        )
        # webview.start blocks until the user closes the window
        webview.start(debug=False)
        os._exit(0)

    except Exception as e:
        logger.error(f"Native desktop window error: {e}. Falling back to default browser.", exc_info=True)
        import webbrowser
        webbrowser.open(app_url)
        # Keep background server alive
        while True:
            time.sleep(1)


if __name__ == "__main__":
    main()

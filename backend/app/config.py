import os
import sys
from pathlib import Path
from dotenv import load_dotenv

if getattr(sys, "frozen", False):
    # Running inside PyInstaller compiled executable:
    # When installed under C:\Program Files, the application directory is READ-ONLY for standard users.
    # Writable user data (database, licenses, backups, logos) MUST live in %APPDATA%/little-scholar-school-system
    appdata_env = os.environ.get("APPDATA")
    if appdata_env:
        DATA_DIR = Path(appdata_env) / "little-scholar-school-system"
    else:
        DATA_DIR = Path.home() / ".little-scholar-school-system"

    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass

    BACKEND_DIR = DATA_DIR
    EXE_DIR = Path(sys.executable).parent
    APP_DIR = Path(getattr(sys, "_MEIPASS", EXE_DIR)) / "backend" / "app"
else:
    APP_DIR = Path(__file__).resolve().parent
    BACKEND_DIR = APP_DIR.parent

# Load .env file
env_path = BACKEND_DIR / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
elif getattr(sys, "frozen", False) and (Path(sys.executable).parent / ".env").exists():
    load_dotenv(dotenv_path=Path(sys.executable).parent / ".env")
else:
    load_dotenv()


class Settings:
    PROJECT_NAME: str = "Little Scholar School System"
    VERSION: str = "2.0.0"

    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", "little-scholar-secret-key-change-in-production"
    )
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")
    )
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(
        os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7")
    )

    # Runtime Environment (development | production | test)
    ENVIRONMENT: str = os.getenv(
        "ENVIRONMENT",
        "production" if getattr(sys, "frozen", False) else "development",
    ).lower()

    # Licensing Configuration
    LICENSE_FILE: Path = (BACKEND_DIR / "license.json").resolve()
    LICENSE_SECRET: str = os.getenv(
        "LICENSE_SECRET", "sms-master-licensing-secret-key-2026"
    )
    GOOGLE_SHEET_WEBHOOK_URL: str = os.getenv(
        "GOOGLE_SHEET_WEBHOOK_URL",
        "https://script.google.com/macros/s/AKfycbzr6mVJPDUKyttEm1D_WxOa46G8iOk10zdAjCesmR0kVUbwyLajHUqz53SMMJhGzSSf/exec",
    )

    # Canonical SQLite path: ALWAYS stored in backend/school_data.db
    canonical_db_file = (BACKEND_DIR / "school_data.db").resolve()
    raw_db_url = os.getenv("DATABASE_URL", "")
    custom_db_path = os.getenv("DATABASE_PATH", "")

    if custom_db_path and custom_db_path.strip():
        DATABASE_URL: str = f"sqlite:///{Path(custom_db_path.strip()).resolve().as_posix()}"
    elif (
        not raw_db_url
        or raw_db_url.strip() == "sqlite:///./school_data.db"
        or raw_db_url.strip() == "sqlite:///school_data.db"
    ):
        DATABASE_URL: str = f"sqlite:///{canonical_db_file.as_posix()}"
    else:
        DATABASE_URL: str = raw_db_url

    # CORS configuration
    _raw_cors = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000",
    )
    CORS_ORIGINS: list[str] = [
        origin.strip() for origin in _raw_cors.split(",") if origin.strip()
    ]


settings = Settings()

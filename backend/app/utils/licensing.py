import hashlib
import hmac
import json
import logging
import platform
import re
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import HTTPException, status
from backend.app.config import BACKEND_DIR, settings

logger = logging.getLogger("licensing")

# Canonical list of feature modules that can be individually gated
ALL_MODULES = [
    "students",
    "classes",
    "teachers",
    "courses",
    "attendance",
    "fees",
    "exams",
    "timetable",
    "reports",
    "promotion",
    "lan_mobile",
]

# Preset templates for offline development and local simulation across all 7 commercial tiers
DEV_PRESETS: Dict[str, Dict[str, Any]] = {
    # Tier 1: Finance Specialist (Students + Fees)
    "DEV-1-FINANCE": {
        "school_name": "Beacon Accounts Academy",
        "school_logo_url": "/api/system/logo",
        "plan_name": "Tier 1: Finance & Fee Specialist",
        "expires_at": None,
        "modules": {
            "students": True,
            "classes": True,
            "teachers": False,
            "courses": False,
            "attendance": False,
            "fees": True,
            "exams": False,
            "timetable": False,
            "reports": True,
            "promotion": False,
            "lan_mobile": False,
        },
    },
    # Tier 2: Academic Standard (Students + Exams & Reports)
    "DEV-2-ACADEMIC-STD": {
        "school_name": "National Grammar High",
        "school_logo_url": "/api/system/logo",
        "plan_name": "Tier 2: Academic Standard (Exams)",
        "expires_at": None,
        "modules": {
            "students": True,
            "classes": True,
            "teachers": False,
            "courses": True,
            "attendance": False,
            "fees": False,
            "exams": True,
            "timetable": False,
            "reports": True,
            "promotion": True,
            "lan_mobile": False,
        },
    },
    # Tier 3: Essential Bundle (Students + Fees + Exams)
    "DEV-3-ESSENTIAL": {
        "school_name": "Horizon Model School",
        "school_logo_url": "/api/system/logo",
        "plan_name": "Tier 3: Essential Bundle (Fees + Exams)",
        "expires_at": None,
        "modules": {
            "students": True,
            "classes": True,
            "teachers": False,
            "courses": True,
            "attendance": False,
            "fees": True,
            "exams": True,
            "timetable": False,
            "reports": True,
            "promotion": True,
            "lan_mobile": False,
        },
    },
    # Tier 4: Daily Operations (Students + Fees + Attendance)
    "DEV-4-DAILY-OPS": {
        "school_name": "Al-Falah Public School",
        "school_logo_url": "/api/system/logo",
        "plan_name": "Tier 4: Daily Operations (Fees + Attendance)",
        "expires_at": None,
        "modules": {
            "students": True,
            "classes": True,
            "teachers": False,
            "courses": False,
            "attendance": True,
            "fees": True,
            "exams": False,
            "timetable": False,
            "reports": True,
            "promotion": False,
            "lan_mobile": False,
        },
    },
    # Tier 5: Academic & Presence (Students + Exams + Attendance)
    "DEV-5-PRESENCE": {
        "school_name": "Apex Grammar High School",
        "school_logo_url": "/api/system/logo",
        "plan_name": "Tier 5: Academic & Presence (Attendance + Exams)",
        "expires_at": None,
        "modules": {
            "students": True,
            "classes": True,
            "teachers": True,
            "courses": True,
            "attendance": True,
            "fees": False,
            "exams": True,
            "timetable": True,
            "reports": True,
            "promotion": True,
            "lan_mobile": False,
        },
    },
    # Tier 6: Campus Suite (All modules, single PC - no LAN/Mobile)
    "DEV-6-CAMPUS": {
        "school_name": "Crescent Standard Campus",
        "school_logo_url": "/api/system/logo",
        "plan_name": "Tier 6: Campus Suite (Full ERP Single-PC)",
        "expires_at": None,
        "modules": {
            "students": True,
            "classes": True,
            "teachers": True,
            "courses": True,
            "attendance": True,
            "fees": True,
            "exams": True,
            "timetable": True,
            "reports": True,
            "promotion": True,
            "lan_mobile": False,
        },
    },
    # Tier 7: Enterprise ERP & Mobile (All features + Wi-Fi LAN + Mobile)
    "DEV-7-ENTERPRISE": {
        "school_name": "Little Scholar Enterprise Campus",
        "school_logo_url": "/api/system/logo",
        "plan_name": "Tier 7: Enterprise ERP & Mobile Suite",
        "expires_at": None,
        "modules": {m: True for m in ALL_MODULES},
    },
    # Trial Expired Lockout Simulation
    "DEV-EXPIRED": {
        "school_name": "Expired Trial Academy",
        "school_logo_url": "/api/system/logo",
        "plan_name": "Trial License (Expired)",
        "expires_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
        "modules": {m: False for m in ALL_MODULES},
    },
}

# Aliases for convenience & test compatibility
DEV_PRESETS["DEV-ALL"] = DEV_PRESETS["DEV-7-ENTERPRISE"]
DEV_PRESETS["DEV-FEE-ONLY"] = DEV_PRESETS["DEV-1-FINANCE"]
DEV_PRESETS["DEV-ACADEMIC"] = DEV_PRESETS["DEV-5-PRESENCE"]



def format_logo_url(url: str) -> str:
    """Transform Google Drive viewing links into direct image CDN URLs."""
    if not url:
        return ""
    clean_url = str(url).strip()
    if "drive.google.com" in clean_url:
        match = re.search(r"(?:/file/d/|/d/|id=)([a-zA-Z0-9_-]{25,})", clean_url)
        if match:
            file_id = match.group(1)
            return f"https://lh3.googleusercontent.com/d/{file_id}"
    return clean_url


def get_machine_hardware_id() -> str:
    """Generate a consistent unique hardware fingerprint for this machine."""
    try:
        raw = f"{platform.node()}-{uuid.getnode()}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16].upper()
    except Exception:
        return "HARDWARE-DEFAULT"


def _get_license_file_path() -> Path:
    """Return the absolute path to the license file."""
    return Path(settings.LICENSE_FILE)


def sign_license_payload(payload: Dict[str, Any]) -> str:
    """Generate HMAC-SHA256 signature for tamper-evidence."""
    raw = f"{payload.get('license_key')}:{payload.get('school_name')}:{payload.get('expires_at')}:{json.dumps(payload.get('modules', {}), sort_keys=True)}"
    return hmac.new(
        settings.LICENSE_SECRET.encode("utf-8"),
        raw.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def verify_license_signature(payload: Dict[str, Any]) -> bool:
    """Verify that the license file has not been tampered with."""
    sig = payload.get("signature")
    if not sig:
        return False
    expected = sign_license_payload(payload)
    return hmac.compare_digest(sig, expected)


def get_default_dev_license() -> Dict[str, Any]:
    """Fallback license for localhost development when no license.json file exists."""
    return {
        "is_activated": True,
        "is_dev_mode": True,
        "hardware_id": get_machine_hardware_id(),
        "school_name": "Little Scholar School System (Dev Mode)",
        "school_logo_url": "",
        "plan_name": "Developer Super-License",
        "expires_at": None,
        "is_expired": False,
        "modules": {m: True for m in ALL_MODULES},
    }


def get_unactivated_license() -> Dict[str, Any]:
    """Default state when the software is unactivated in production."""
    return {
        "is_activated": False,
        "is_dev_mode": False,
        "hardware_id": get_machine_hardware_id(),
        "school_name": "Unregistered School Installation",
        "school_logo_url": "",
        "plan_name": "Unactivated",
        "expires_at": None,
        "is_expired": False,
        "modules": {m: False for m in ALL_MODULES},
    }


def get_active_license() -> Dict[str, Any]:
    """
    Read and parse the local license.json file.
    If no file exists or license is unlinked, returns unactivated state requiring activation.
    """
    lic_file = _get_license_file_path()

    if not lic_file.exists():
        return get_unactivated_license()

    try:
        with open(lic_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        # In production mode, verify signature integrity
        if settings.ENVIRONMENT == "production" and not data.get("is_dev_mode"):
            if not verify_license_signature(data):
                logger.error("License file signature mismatch! Potential manual tampering detected.")
                return get_unactivated_license()

        # Check expiration date if configured
        expires_at = data.get("expires_at")
        is_expired = False
        if expires_at:
            try:
                exp_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
                if datetime.now(timezone.utc) > exp_dt:
                    is_expired = True
            except Exception as e:
                logger.warning(f"Failed to parse license expiry date '{expires_at}': {e}")

        # Build clean license response
        modules = data.get("modules", {})
        full_modules = {m: bool(modules.get(m, False)) for m in ALL_MODULES}

        # If expired, disable all features
        if is_expired:
            full_modules = {m: False for m in ALL_MODULES}

        return {
            "is_activated": not is_expired and bool(data.get("is_activated", True)),
            "is_dev_mode": bool(data.get("is_dev_mode", False)),
            "hardware_id": get_machine_hardware_id(),
            "school_name": data.get("school_name", "School Management System"),
            "school_logo_url": format_logo_url(data.get("school_logo_url", "")),
            "plan_name": data.get("plan_name", "Custom Plan"),
            "license_key": data.get("license_key", ""),
            "expires_at": expires_at,
            "is_expired": is_expired,
            "modules": full_modules,
        }

    except Exception as e:
        logger.error(f"Error reading license file at {lic_file}: {e}")
        return get_unactivated_license()


def download_and_cache_logo(raw_url: str) -> str:
    """Download school logo from remote cloud URL and cache it locally for offline resilience."""
    if not raw_url:
        return ""
    direct_url = format_logo_url(raw_url)
    try:
        import httpx
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        }
        with httpx.Client(follow_redirects=True, timeout=12.0, headers=headers) as client:
            resp = client.get(direct_url)
            if resp.status_code == 200 and len(resp.content) > 50:
                content_type = resp.headers.get("content-type", "").lower()
                ext = ".png"
                if "jpeg" in content_type or "jpg" in content_type:
                    ext = ".jpg"
                elif "webp" in content_type:
                    ext = ".webp"

                # Clean up any previously cached logo files to prevent extension conflicts
                for old_ext in (".png", ".jpg", ".jpeg", ".webp"):
                    old_file = BACKEND_DIR / f"school_logo{old_ext}"
                    if old_file.exists():
                        try:
                            old_file.unlink()
                        except Exception:
                            pass

                logo_file = BACKEND_DIR / f"school_logo{ext}"
                logo_file.write_bytes(resp.content)
                logger.info(f"Successfully cached school logo locally at {logo_file}")
                return "/api/system/logo"
    except Exception as e:
        logger.warning(f"Failed to cache remote logo ({e}); falling back to direct URL.")
    return direct_url


def query_google_sheets_webhook(license_key: str, hardware_id: str) -> Dict[str, Any]:
    """Call Google Apps Script webhook to verify customer license key and bind hardware."""
    webhook_url = settings.GOOGLE_SHEET_WEBHOOK_URL.strip()
    if not webhook_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Sheets activation webhook URL is not configured. For testing, use DEV-ALL, DEV-FEE-ONLY, or DEV-ACADEMIC.",
        )

    request_payload = {
        "action": "activate",
        "license_key": license_key,
        "hardware_id": hardware_id,
    }

    try:
        import httpx
        with httpx.Client(follow_redirects=True, timeout=15.0) as client:
            resp = client.post(webhook_url, json=request_payload)
            result = resp.json()

        if not result.get("valid"):
            msg = result.get("message", "Invalid license key or machine mismatch.")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

        # Parse comma-separated or list of modules from Google Sheets response
        raw_modules = result.get("modules", [])
        if isinstance(raw_modules, str):
            allowed_modules = {m.strip().lower() for m in raw_modules.split(",") if m.strip()}
        elif isinstance(raw_modules, list):
            allowed_modules = {str(m).strip().lower() for m in raw_modules}
        else:
            allowed_modules = set(ALL_MODULES)

        if "all" in allowed_modules or "*" in allowed_modules:
            modules_dict = {m: True for m in ALL_MODULES}
        else:
            modules_dict = {m: (m in allowed_modules) for m in ALL_MODULES}

        return {
            "school_name": result.get("school_name", "Registered School"),
            "school_logo_url": result.get("school_logo_url", ""),
            "plan_name": result.get("plan_name", "Production Plan"),
            "expires_at": result.get("expires_at"),
            "modules": modules_dict,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to connect to Google Sheets webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Unable to reach licensing activation server: {str(e)}",
        )


def activate_license_key(license_key: str) -> Dict[str, Any]:
    """
    Validate and activate a license key.
    Supports offline DEV- keys in development/testing mode,
    and Google Sheets Webhook verification for production keys.
    """
    key = (license_key or "").strip().upper()

    if not key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="License key cannot be empty.",
        )

    hardware_id = get_machine_hardware_id()
    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. Dev keys handling
    if key.startswith("DEV-"):
        if key not in DEV_PRESETS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown dev test key '{key}'. Valid dev keys are: {list(DEV_PRESETS.keys())}",
            )

        preset = DEV_PRESETS[key]

        payload = {
            "is_activated": key != "DEV-EXPIRED",
            "is_dev_mode": True,
            "license_key": key,
            "hardware_id": hardware_id,
            "school_name": preset["school_name"],
            "school_logo_url": preset["school_logo_url"],
            "plan_name": preset["plan_name"],
            "expires_at": preset["expires_at"],
            "modules": preset["modules"],
            "activated_at": now_iso,
        }
        payload["signature"] = sign_license_payload(payload)

        lic_file = _get_license_file_path()
        with open(lic_file, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)

        return get_active_license()

    # 2. Production key validation via Google Sheets Webhook
    sheet_data = query_google_sheets_webhook(key, hardware_id)
    cached_logo = download_and_cache_logo(sheet_data.get("school_logo_url", ""))

    payload = {
        "is_activated": True,
        "is_dev_mode": False,
        "license_key": key,
        "hardware_id": hardware_id,
        "school_name": sheet_data["school_name"],
        "school_logo_url": cached_logo,
        "plan_name": sheet_data["plan_name"],
        "expires_at": sheet_data["expires_at"],
        "modules": sheet_data["modules"],
        "activated_at": now_iso,
    }
    payload["signature"] = sign_license_payload(payload)

    lic_file = _get_license_file_path()
    with open(lic_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    return get_active_license()


def deactivate_license() -> Dict[str, Any]:
    """
    Remove or reset the license file.
    Reverts system to unactivated / default dev state.
    """
    lic_file = _get_license_file_path()
    if lic_file.exists():
        try:
            lic_file.unlink()
        except Exception as e:
            logger.error(f"Failed to remove license file: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to deactivate license: {str(e)}",
            )

    # Clean up any cached logo files
    for ext in (".png", ".jpg", ".jpeg", ".webp"):
        cached = BACKEND_DIR / f"school_logo{ext}"
        if cached.exists():
            try:
                cached.unlink()
            except Exception:
                pass

    return get_active_license()


def sync_active_license() -> Dict[str, Any]:
    """
    Refresh and re-synchronize the active license directly from the Google Sheets webhook.
    Uses the existing stored license_key and this machine's hardware_id.
    """
    lic_file = _get_license_file_path()
    if not lic_file.exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="System is not activated yet. Please activate your school license first.",
        )

    try:
        with open(lic_file, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read current license file: {str(e)}",
        )

    key = str(data.get("license_key", "")).strip()
    if not key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active license key found in local installation.",
        )

    return activate_license_key(key)


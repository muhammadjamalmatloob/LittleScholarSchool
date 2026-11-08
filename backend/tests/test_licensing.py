import pytest
from backend.app.routers.system import (
    get_system_license,
    activate_system_license,
    deactivate_system_license,
    sync_system_license,
    LicenseActivationRequest,
)
from backend.app.utils.licensing import (
    get_active_license,
    sync_active_license,
    _get_license_file_path,
)
from fastapi import HTTPException


@pytest.fixture(autouse=True)
def cleanup_license():
    """Ensure clean license state during each test, and restore prior license afterwards."""
    lic_file = _get_license_file_path()
    backup_data = None
    if lic_file.exists():
        backup_data = lic_file.read_bytes()
        lic_file.unlink()
    yield
    if backup_data is not None:
        lic_file.write_bytes(backup_data)
    elif lic_file.exists():
        lic_file.unlink()


def test_default_dev_license_on_localhost():
    """When no license file exists on localhost, returns developer master license."""
    data = get_system_license()
    assert data["is_activated"] is True
    assert data["is_dev_mode"] is True
    assert data["modules"]["students"] is True
    assert data["modules"]["fees"] is True
    assert data["modules"]["exams"] is True
    assert data["modules"]["attendance"] is True


def test_activate_dev_fee_only_key():
    """Activating DEV-FEE-ONLY unlocks fees and students, while locking exams and attendance."""
    req = LicenseActivationRequest(license_key="DEV-FEE-ONLY")
    data = activate_system_license(req)
    assert data["is_activated"] is True
    assert "Finance" in data["plan_name"] or "Accounts" in data["plan_name"]
    assert data["school_name"] == "Beacon Accounts Academy"
    assert data["modules"]["students"] is True
    assert data["modules"]["fees"] is True
    assert data["modules"]["exams"] is False
    assert data["modules"]["attendance"] is False
    assert data["modules"]["timetable"] is False

    # Verify persistent get_license returns the same
    persisted = get_system_license()
    assert persisted["modules"]["fees"] is True
    assert persisted["modules"]["exams"] is False


def test_activate_dev_academic_key():
    """Activating DEV-ACADEMIC unlocks exams and attendance, but locks fees."""
    req = LicenseActivationRequest(license_key="DEV-ACADEMIC")
    data = activate_system_license(req)
    assert data["is_activated"] is True
    assert "Academic" in data["plan_name"]
    assert data["school_name"] == "Apex Grammar High School"
    assert data["modules"]["exams"] is True
    assert data["modules"]["attendance"] is True
    assert data["modules"]["fees"] is False


def test_all_seven_commercial_tiers():
    """Verify all 7 commercial tiers activate correctly with their expected modules."""
    tiers = [
        ("DEV-1-FINANCE", {"fees": True, "exams": False, "attendance": False}),
        ("DEV-2-ACADEMIC-STD", {"fees": False, "exams": True, "attendance": False}),
        ("DEV-3-ESSENTIAL", {"fees": True, "exams": True, "attendance": False}),
        ("DEV-4-DAILY-OPS", {"fees": True, "exams": False, "attendance": True}),
        ("DEV-5-PRESENCE", {"fees": False, "exams": True, "attendance": True}),
        ("DEV-6-CAMPUS", {"fees": True, "exams": True, "attendance": True, "lan_mobile": False}),
        ("DEV-7-ENTERPRISE", {"fees": True, "exams": True, "attendance": True, "lan_mobile": True}),
    ]
    for key, expected_flags in tiers:
        res = activate_system_license(LicenseActivationRequest(license_key=key))
        assert res["is_activated"] is True
        for mod, flag in expected_flags.items():
            assert res["modules"][mod] == flag, f"Failed for {key} on {mod}"



def test_activate_dev_expired_key():
    """Activating DEV-EXPIRED marks license as expired with all modules disabled."""
    req = LicenseActivationRequest(license_key="DEV-EXPIRED")
    data = activate_system_license(req)
    assert data["is_activated"] is False
    assert data["is_expired"] is True
    assert data["modules"]["fees"] is False
    assert data["modules"]["students"] is False


def test_invalid_license_key():
    """Invalid keys raise 400 Bad Request."""
    req = LicenseActivationRequest(license_key="DEV-INVALID-KEY")
    with pytest.raises(HTTPException) as excinfo:
        activate_system_license(req)
    assert excinfo.value.status_code == 400
    assert "DEV-" in excinfo.value.detail or "Unknown dev" in excinfo.value.detail


def test_deactivate_license():
    """Deactivating removes local file and resets back to default dev state."""
    req = LicenseActivationRequest(license_key="DEV-FEE-ONLY")
    activate_system_license(req)
    assert _get_license_file_path().exists()

    deact = deactivate_system_license()
    assert not _get_license_file_path().exists()
    assert deact["is_dev_mode"] is True
    assert deact["is_activated"] is True


def test_require_module_middleware_feature_gating():
    """Verify require_module permits licensed features and returns 403 on unlicensed features."""
    from backend.app.middleware.licensing import require_module

    # 1. Activate Fee-Only license
    activate_system_license(LicenseActivationRequest(license_key="DEV-FEE-ONLY"))

    # 'fees' should pass without error
    check_fees = require_module("fees")
    check_fees()  # No exception raised

    # 'exams' should raise 403
    check_exams = require_module("exams")
    with pytest.raises(HTTPException) as exc_exams:
        check_exams()
    assert exc_exams.value.status_code == 403
    assert "exams" in exc_exams.value.detail

    # 'attendance' should raise 403
    check_attendance = require_module("attendance")
    with pytest.raises(HTTPException) as exc_att:
        check_attendance()
    assert exc_att.value.status_code == 403
    assert "attendance" in exc_att.value.detail

    # 2. Switch to Academic license
    activate_system_license(LicenseActivationRequest(license_key="DEV-ACADEMIC"))

    # 'exams' now passes
    check_exams()  # No exception

    # 'fees' now raises 403
    with pytest.raises(HTTPException) as exc_fees:
        check_fees()
    assert exc_fees.value.status_code == 403
    assert "fees" in exc_fees.value.detail


def test_anti_tamper_signature_verification():
    """Modifying license.json manually causes signature mismatch in production."""
    import json
    activate_system_license(LicenseActivationRequest(license_key="DEV-FEE-ONLY"))

    lic_file = _get_license_file_path()
    with open(lic_file, "r") as f:
        data = json.load(f)

    # Tamper with modules
    data["modules"]["exams"] = True
    data["is_dev_mode"] = False
    with open(lic_file, "w") as f:
        json.dump(data, f)

    from backend.app.config import settings
    orig_env = settings.ENVIRONMENT
    try:
        settings.ENVIRONMENT = "production"
        active = get_active_license()
        assert active["is_activated"] is False
    finally:
        settings.ENVIRONMENT = orig_env


def test_sync_active_license():
    """Syncing an active license re-validates and refreshes the modules."""
    activate_system_license(LicenseActivationRequest(license_key="DEV-FEE-ONLY"))
    assert _get_license_file_path().exists()

    synced = sync_active_license()
    assert synced["is_activated"] is True
    assert synced["modules"]["fees"] is True
    assert synced["modules"]["exams"] is False




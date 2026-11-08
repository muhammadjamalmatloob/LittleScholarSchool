import json
from collections import defaultdict
from datetime import datetime, timezone
from threading import Lock
import time
from fastapi import APIRouter, Depends, HTTPException, Request, status

# In-memory sliding window rate limiter for login attempts
_login_failures: dict[str, list[float]] = defaultdict(list)
_rate_limit_lock = Lock()
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_WINDOW_SECONDS = 60

# Pre-computed valid 12-round bcrypt hash to ensure constant-time verification for non-existent emails
DUMMY_BCRYPT_HASH = "$2b$12$WSybduJ80i85fCAG0e/nFeALNuUyPd2Uw6Wr.Ha0HyJ0uYuXDT6fG"


def _check_rate_limit(key: str) -> None:
    now = time.time()
    with _rate_limit_lock:
        attempts = [t for t in _login_failures[key] if now - t < LOCKOUT_WINDOW_SECONDS]
        _login_failures[key] = attempts
        if len(attempts) >= MAX_FAILED_ATTEMPTS:
            oldest = attempts[0]
            retry_after = int(LOCKOUT_WINDOW_SECONDS - (now - oldest)) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed login attempts. Please wait {retry_after} seconds before trying again.",
                headers={"Retry-After": str(retry_after)},
            )


def _record_failed_attempt(key: str) -> None:
    now = time.time()
    with _rate_limit_lock:
        _login_failures[key].append(now)


def _clear_failed_attempts(key: str) -> None:
    with _rate_limit_lock:
        _login_failures.pop(key, None)
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import User
from backend.app.schemas import (
    LoginRequest,
    RefreshTokenRequest,
    ChangePasswordRequest,
    TokenResponse,
    CurrentUserResponse,
    MessageResponse,
    UserOut,
    PermissionOut,
)
from backend.app.crud import (
    get_user_by_email,
    get_user_by_id,
    get_permissions_by_role,
    create_audit_log,
)
from backend.app.utils.security import (
    verify_password,
    hash_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from backend.app.middleware.auth import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, req: Request, db: Session = Depends(get_db)):
    """Authenticate user with email and password, returning JWT access & refresh tokens."""
    client_ip = req.client.host if (req and getattr(req, "client", None)) else "unknown"
    rate_limit_key = f"{client_ip}:{request.email.lower().strip()}"

    # 1. Enforce rate limiting (5 attempts per minute)
    _check_rate_limit(rate_limit_key)

    # 2. Look up user
    user = get_user_by_email(db, email=request.email)

    # 3. Constant-time verification & timing attack mitigation
    if not user:
        # Run dummy bcrypt check so timing is identical for valid & non-existent emails
        verify_password(request.password, DUMMY_BCRYPT_HASH)
        _record_failed_attempt(rate_limit_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(request.password, user.password_hash):
        _record_failed_attempt(rate_limit_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Contact the administrator.",
        )

    # Reset failure tracking on successful authentication
    _clear_failed_attempts(rate_limit_key)

    token_data = {"sub": str(user.id), "email": user.email, "role": user.role}
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)

    create_audit_log(
        db,
        user_id=user.id,
        action="LOGIN",
        table_name="users",
        record_id=user.id,
        new_values=json.dumps({"login_time": datetime.now(timezone.utc).isoformat()}),
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        refresh_token=refresh_token,
        user=UserOut.model_validate(user),
    )


@router.post("/logout", response_model=MessageResponse)
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Log out the current user and write an audit log entry."""
    create_audit_log(
        db,
        user_id=current_user.id,
        action="LOGOUT",
        table_name="users",
        record_id=current_user.id,
    )
    return MessageResponse(message="Successfully logged out")


@router.post("/refresh-token")
def refresh_token(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Exchange a valid refresh token for a newly minted access token."""
    payload = decode_token(request.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Provided token is not a refresh token",
        )

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token payload",
        )

    user = get_user_by_id(db, user_id=int(user_id_str))
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer active or exists",
        )

    new_access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role}
    )
    return {"access_token": new_access_token, "token_type": "bearer"}


@router.get("/current-user", response_model=CurrentUserResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the profile and permissions of the currently authenticated user."""
    permissions = get_permissions_by_role(db, role=current_user.role)
    return CurrentUserResponse(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        permissions=[PermissionOut.model_validate(p) for p in permissions],
    )


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change the password for the currently logged-in user."""
    if not verify_password(request.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    current_user.password_hash = hash_password(request.new_password)
    db.commit()

    create_audit_log(
        db,
        user_id=current_user.id,
        action="CHANGE_PASSWORD",
        table_name="users",
        record_id=current_user.id,
    )

    return MessageResponse(message="Password updated successfully")

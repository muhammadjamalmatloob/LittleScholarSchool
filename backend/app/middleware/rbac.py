from typing import Callable, List
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import User
from backend.app.middleware.auth import get_current_user
from backend.app.crud import has_permission


def require_roles(*allowed_roles: str) -> Callable[[User], User]:
    """Dependency factory that checks if the authenticated user has one of the required roles."""
    normalized_roles = [r.lower().strip() for r in allowed_roles]

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = current_user.role.lower().strip()
        # Admin always has overarching access unless explicitly restricted
        if user_role == "admin" or user_role in normalized_roles:
            return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Requires one of roles: {', '.join(allowed_roles)}",
        )

    return role_checker


def require_permission(resource: str, action: str) -> Callable[[User, Session], User]:
    """Dependency factory that checks if user has permission for (resource, action) from the database."""

    def permission_checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        user_role = current_user.role.lower().strip()

        # Admin bypasses all specific permission checks
        if user_role == "admin":
            return current_user

        if has_permission(db, role=user_role, resource=resource, action=action):
            return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied: role '{current_user.role}' cannot {action} on {resource}",
        )

    return permission_checker

import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import User
from backend.app.schemas import UserOut, UserCreate, UserUpdate, PermissionOut, MessageResponse
from backend.app.crud import (
    get_users,
    get_user_by_id,
    get_user_by_email,
    create_user,
    update_user,
    delete_user,
    get_permissions_by_role,
    create_audit_log,
)
from backend.app.middleware.rbac import require_roles

router = APIRouter(prefix="/users", tags=["User Management"])


@router.get("", response_model=List[UserOut])
def list_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    """Retrieve all users in the system (Admin & Principal only)."""
    return get_users(db, skip=skip, limit=limit)


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_new_user(
    user_in: UserCreate,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    """Create a new user account (Admin only)."""
    existing_user = get_user_by_email(db, email=user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with email '{user_in.email}' already exists",
        )

    valid_roles = ["admin"]
    if user_in.role.lower().strip() not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}",
        )

    user = create_user(db, user_in=user_in)
    create_audit_log(
        db,
        user_id=current_user.id,
        action="CREATE_USER",
        table_name="users",
        record_id=user.id,
        new_values=json.dumps({"email": user.email, "role": user.role}),
    )
    return user


@router.get("/{user_id}", response_model=UserOut)
def get_user_details(
    user_id: int,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    """Retrieve specific user details by ID."""
    user = get_user_by_id(db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found",
        )
    return user


@router.put("/{user_id}", response_model=UserOut)
def update_user_details(
    user_id: int,
    user_in: UserUpdate,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    """Update a user account (Admin only)."""
    user = get_user_by_id(db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found",
        )

    if user_in.email and user_in.email.lower() != user.email.lower():
        conflict = get_user_by_email(db, email=user_in.email)
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{user_in.email}' is already in use by another user",
            )

    if user_in.role:
        valid_roles = ["admin"]
        if user_in.role.lower().strip() not in valid_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}",
            )

    old_values = json.dumps({"email": user.email, "role": user.role, "is_active": user.is_active})
    updated = update_user(db, db_user=user, user_in=user_in)
    create_audit_log(
        db,
        user_id=current_user.id,
        action="UPDATE_USER",
        table_name="users",
        record_id=user.id,
        old_values=old_values,
        new_values=json.dumps({"email": updated.email, "role": updated.role, "is_active": updated.is_active}),
    )
    return updated


@router.delete("/{user_id}", response_model=MessageResponse)
def remove_user(
    user_id: int,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    """Delete a user account (Admin only)."""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own administrator account",
        )

    user = get_user_by_id(db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found",
        )

    delete_user(db, db_user=user)
    create_audit_log(
        db,
        user_id=current_user.id,
        action="DELETE_USER",
        table_name="users",
        record_id=user_id,
        old_values=json.dumps({"email": user.email, "role": user.role}),
    )
    return MessageResponse(message=f"User '{user.email}' deleted successfully")


@router.get("/{user_id}/permissions", response_model=List[PermissionOut])
def get_user_permissions(
    user_id: int,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    """Retrieve the permissions for a specific user based on their assigned role."""
    user = get_user_by_id(db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found",
        )

    permissions = get_permissions_by_role(db, role=user.role)
    return permissions

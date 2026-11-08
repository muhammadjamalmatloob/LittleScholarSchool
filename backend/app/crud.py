from typing import List, Optional
from sqlalchemy.orm import Session

from backend.app.models import User, Permission, AuditLog
from backend.app.schemas import UserCreate, UserUpdate
from backend.app.utils.security import hash_password


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Retrieve a user by their primary key ID."""
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Retrieve a user by their email address."""
    return db.query(User).filter(User.email == email.lower().strip()).first()


def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
    """Retrieve a list of users with pagination."""
    return db.query(User).offset(skip).limit(limit).all()


def create_user(db: Session, user_in: UserCreate) -> User:
    """Create a new user with hashed password."""
    db_user = User(
        email=user_in.email.lower().strip(),
        password_hash=hash_password(user_in.password),
        role=user_in.role.lower().strip(),
        full_name=user_in.full_name.strip(),
        is_active=user_in.is_active,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def update_user(db: Session, db_user: User, user_in: UserUpdate) -> User:
    """Update user properties."""
    if user_in.email is not None:
        db_user.email = user_in.email.lower().strip()
    if user_in.role is not None:
        db_user.role = user_in.role.lower().strip()
    if user_in.full_name is not None:
        db_user.full_name = user_in.full_name.strip()
    if user_in.is_active is not None:
        db_user.is_active = user_in.is_active
    if user_in.password is not None and user_in.password.strip():
        db_user.password_hash = hash_password(user_in.password)

    db.commit()
    db.refresh(db_user)
    return db_user


def delete_user(db: Session, db_user: User) -> None:
    """Delete a user record from the database."""
    db.delete(db_user)
    db.commit()


def get_permissions_by_role(db: Session, role: str) -> List[Permission]:
    """Retrieve all permission entries for a given role."""
    return db.query(Permission).filter(Permission.role == role.lower().strip()).all()


def has_permission(db: Session, role: str, resource: str, action: str) -> bool:
    """Check if a specific role possesses permission for resource and action."""
    if role == "admin":
        return True
    perm = (
        db.query(Permission)
        .filter(
            Permission.role == role.lower().strip(),
            Permission.resource == resource.lower().strip(),
            Permission.action == action.lower().strip(),
        )
        .first()
    )
    return perm is not None


def create_audit_log(
    db: Session,
    user_id: int,
    action: str,
    table_name: Optional[str] = None,
    record_id: Optional[int] = None,
    old_values: Optional[str] = None,
    new_values: Optional[str] = None,
) -> AuditLog:
    """Record an audit trail log entry."""
    log = AuditLog(
        user_id=user_id,
        action=action,
        table_name=table_name,
        record_id=record_id,
        old_values=old_values,
        new_values=new_values,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log

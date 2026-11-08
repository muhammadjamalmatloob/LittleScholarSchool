from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import AuditLog, User
from backend.app.middleware.rbac import require_roles, require_permission
from backend.app.utils.student_promotion import (
    preview_promotion,
    execute_promotion,
)

router = APIRouter(prefix="/student-promotion", tags=["Student Promotion"])


class PromotionRequest(BaseModel):
    from_academic_year_id: int
    to_academic_year_id: int
    promotion_mapping: Dict[str, Optional[int]] = Field(
        ...,
        description="Map of current class_id (as string or int) to target class_id (or null for graduating)",
    )
    min_attendance: float = Field(75.0, ge=0, le=100)
    min_marks: float = Field(40.0, ge=0, le=100)
    student_overrides: Optional[Dict[str, str]] = Field(
        default_factory=dict,
        description="Map of student_id to forced action ('promote', 'repeat', 'graduate')",
    )
    make_destination_current: bool = False
    class_id: Optional[int] = Field(
        None,
        description="Optional class_id filter if promoting only a single class",
    )


@router.post("/preview")
def preview_student_promotion(
    payload: PromotionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("students", "read")),
) -> Dict[str, Any]:
    """Preview which students will be promoted, repeated, or graduated without modifying records."""
    try:
        # Convert string class_id keys to integers
        mapping: Dict[int, Optional[int]] = {
            int(k): v for k, v in payload.promotion_mapping.items()
        }
        return preview_promotion(
            db=db,
            from_year_id=payload.from_academic_year_id,
            to_year_id=payload.to_academic_year_id,
            promotion_mapping=mapping,
            min_attendance=payload.min_attendance,
            min_marks=payload.min_marks,
            class_id=payload.class_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Preview error: {str(e)}")


@router.post("/execute")
def execute_student_promotion(
    payload: PromotionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
) -> Dict[str, Any]:
    """Execute student promotion across academic years and reset roll numbers (Admin only)."""
    try:
        mapping: Dict[int, Optional[int]] = {
            int(k): v for k, v in payload.promotion_mapping.items()
        }
        return execute_promotion(
            db=db,
            user_id=current_user.id,
            from_year_id=payload.from_academic_year_id,
            to_year_id=payload.to_academic_year_id,
            promotion_mapping=mapping,
            min_attendance=payload.min_attendance,
            min_marks=payload.min_marks,
            student_overrides=payload.student_overrides,
            make_destination_current=payload.make_destination_current,
            class_id=payload.class_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Execution error: {str(e)}")


@router.get("/history")
def get_promotion_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("audit-logs", "read")),
) -> List[Dict[str, Any]]:
    """Retrieve historical logs of all promotion executions."""
    logs = (
        db.query(AuditLog, User.full_name)
        .outerjoin(User, User.id == AuditLog.user_id)
        .filter(AuditLog.action == "STUDENT_PROMOTION")
        .order_by(AuditLog.created_at.desc())
        .all()
    )
    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "user_name": user_name or "System Administrator",
            "action": log.action,
            "record_id": log.record_id,
            "details": log.new_values,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log, user_name in logs
    ]

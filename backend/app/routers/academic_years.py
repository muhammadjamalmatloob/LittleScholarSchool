from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.middleware.rbac import require_permission, require_roles
from backend.app.models import AcademicYear, User
from backend.app.schemas import (
    AcademicYearCreate,
    AcademicYearOut,
    AcademicYearUpdate,
)

router = APIRouter(prefix="/academic-years", tags=["Academic Years"])


def _validate_dates(start_date: date, end_date: date):
    if end_date < start_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="End date must be on or after start date",
        )


def _ensure_no_overlap(
    db: Session,
    start_date: date,
    end_date: date,
    exclude_id: Optional[int] = None,
):
    query = db.query(AcademicYear).filter(
        AcademicYear.start_date <= end_date,
        AcademicYear.end_date >= start_date,
    )
    if exclude_id is not None:
        query = query.filter(AcademicYear.id != exclude_id)
    if query.first() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Academic year dates overlap an existing academic year",
        )


@router.get("", response_model=list[AcademicYearOut])
def list_academic_years(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("academic-years", "read")),
):
    query = db.query(AcademicYear)
    if not include_inactive:
        query = query.filter(AcademicYear.is_active.is_(True))
    return query.order_by(AcademicYear.start_date.desc()).all()


@router.post("", response_model=AcademicYearOut, status_code=status.HTTP_201_CREATED)
def create_academic_year(
    payload: AcademicYearCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    _validate_dates(payload.start_date, payload.end_date)
    _ensure_no_overlap(db, payload.start_date, payload.end_date)
    if db.query(AcademicYear).filter(AcademicYear.year_name == payload.year_name.strip()).first():
        raise HTTPException(status_code=409, detail="Academic year name already exists")

    academic_year = AcademicYear(
        year_name=payload.year_name.strip(),
        start_date=payload.start_date,
        end_date=payload.end_date,
        is_current=False,
        is_active=True,
    )
    db.add(academic_year)
    db.commit()
    db.refresh(academic_year)
    return academic_year


@router.put("/{academic_year_id}", response_model=AcademicYearOut)
def update_academic_year(
    academic_year_id: int,
    payload: AcademicYearUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    academic_year = db.query(AcademicYear).filter(AcademicYear.id == academic_year_id).first()
    if academic_year is None:
        raise HTTPException(status_code=404, detail="Academic year not found")

    values = payload.model_dump(exclude_unset=True)
    year_name = values.get("year_name", academic_year.year_name)
    start_date = values.get("start_date", academic_year.start_date)
    end_date = values.get("end_date", academic_year.end_date)
    _validate_dates(start_date, end_date)
    _ensure_no_overlap(db, start_date, end_date, exclude_id=academic_year.id)
    duplicate = (
        db.query(AcademicYear)
        .filter(AcademicYear.year_name == year_name.strip(), AcademicYear.id != academic_year.id)
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="Academic year name already exists")

    for field, value in values.items():
        setattr(academic_year, field, value.strip() if field == "year_name" else value)
    db.commit()
    db.refresh(academic_year)
    return academic_year


@router.post("/{academic_year_id}/set-current", response_model=AcademicYearOut)
def set_current_academic_year(
    academic_year_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    academic_year = db.query(AcademicYear).filter(
        AcademicYear.id == academic_year_id,
        AcademicYear.is_active.is_(True),
    ).first()
    if academic_year is None:
        raise HTTPException(status_code=404, detail="Active academic year not found")

    db.query(AcademicYear).filter(AcademicYear.is_current.is_(True)).update(
        {"is_current": False}, synchronize_session=False
    )
    academic_year.is_current = True
    db.commit()
    db.refresh(academic_year)
    return academic_year


@router.delete("/{academic_year_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_academic_year(
    academic_year_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    academic_year = db.query(AcademicYear).filter(AcademicYear.id == academic_year_id).first()
    if academic_year is None:
        raise HTTPException(status_code=404, detail="Academic year not found")
    if academic_year.is_current:
        raise HTTPException(status_code=409, detail="The current academic year cannot be deactivated")
    academic_year.is_active = False
    db.commit()


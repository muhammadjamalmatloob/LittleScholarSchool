import json
from calendar import monthrange
from datetime import date, datetime
from typing import Optional, List
from fastapi.responses import FileResponse
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from backend.app.database import get_db
from backend.app.models import AcademicYear, Student, Class, Attendance, Fee, FeeCharge, User
from pydantic import BaseModel
from backend.app.schemas import (
    StudentCreate,
    StudentUpdate,
    StudentListItem,
    StudentDetail,
    StudentListResponse,
    AttendanceSummaryResponse,
    FeeStatusResponse,
    MessageResponse,
)
from backend.app.middleware.rbac import require_permission, require_roles
from backend.app.crud import create_audit_log
from backend.app.utils.roll_numbers import allocate_roll_number

router = APIRouter(prefix="/students", tags=["Student Management"])


def _next_student_id(db: Session) -> str:
    existing_ids = db.query(Student.id).filter(Student.id.like("STUD_%")).all()
    highest = max(
        (int(student_id.split("_", 1)[1]) for (student_id,) in existing_ids),
        default=0,
    )
    return f"STUD_{highest + 1:04d}"


def _current_academic_year(db: Session) -> AcademicYear:
    academic_year = (
        db.query(AcademicYear)
        .filter(AcademicYear.is_current.is_(True), AcademicYear.is_active.is_(True))
        .first()
    )
    if academic_year is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No current academic year is configured",
        )
    return academic_year


def _compute_student_stats(db: Session, student_id: str):
    """Calculate attendance percentage and overall fee status for a student."""
    # Attendance %: 0.0 for newly enrolled students with no historical records
    total_att = db.query(Attendance).filter(Attendance.student_id == student_id).count()
    if total_att > 0:
        present_count = (
            db.query(Attendance)
            .filter(Attendance.student_id == student_id, Attendance.status.in_(["present", "half-day"]))
            .count()
        )
        att_percentage = round((present_count / total_att) * 100, 1)
    else:
        att_percentage = 0.0

    # Fee status:
    # A student can only have "paid" status if fee records exist and NONE are pending/partial/overdue.
    # Newly enrolled students with zero generated chalans default to "pending".
    total_fees = db.query(Fee).filter(Fee.student_id == student_id).count()
    if total_fees > 0:
        pending_fees = (
            db.query(Fee)
            .filter(Fee.student_id == student_id, Fee.status.in_(["pending", "partial", "overdue"]))
            .first()
        )
        fee_status = "pending" if pending_fees else "paid"
    else:
        fee_status = "pending"

    return att_percentage, fee_status


def _format_roll_number(s: Student) -> str:
    """Generate roll number combination of session + class + section + sequence number."""
    year_str = s.academic_year.year_name if s.academic_year else "2024-2025"
    sess = year_str.split("-")[0] if "-" in year_str else year_str
    sec = (s.student_class.section if s.student_class and s.student_class.section else "A").upper()
    c_raw = (s.student_class.name if s.student_class else "10").replace("Grade ", "").replace("Class ", "").strip()
    roll_seq = s.roll_number if s.roll_number is not None else 1
    return f"{sess}-{c_raw}-{sec}-{roll_seq:02d}"


@router.get("", response_model=StudentListResponse)
def list_students(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=500),
    search: Optional[str] = Query(None, description="Search by student name or roll number"),
    class_id: Optional[int] = Query(None, description="Filter by class ID"),
    section: Optional[str] = Query(None, description="Filter by section (A, B, etc.)"),
    gender: Optional[str] = Query(None, description="Filter by gender (male, female, etc.)"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    sort_by: Optional[str] = Query(None, description="Sort order: name_asc, name_desc, class_asc, roll_asc, roll_desc"),
    academic_year_id: Optional[int] = Query(None, description="Filter by Academic Year ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("students", "read")),
):
    """Retrieve students with optional search, filtering, and pagination."""
    query = db.query(Student).join(Class, Student.class_id == Class.id)

    if search and isinstance(search, str) and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(Student.name).like(term),
                func.lower(Student.roll_number).like(term),
                func.lower(Student.parent_name).like(term),
            )
        )

    if class_id is not None and isinstance(class_id, int):
        query = query.filter(Student.class_id == class_id)

    if section and isinstance(section, str) and section.strip() and section.strip() != "all":
        query = query.filter(func.lower(Class.section) == section.strip().lower())

    if gender and isinstance(gender, str) and gender.strip() and gender.strip().lower() != "all":
        query = query.filter(func.lower(Student.gender).like(f"{gender.strip().lower()[0]}%"))

    if is_active is not None and isinstance(is_active, bool):
        query = query.filter(Student.is_active == is_active)

    if academic_year_id is not None and isinstance(academic_year_id, int):
        query = query.filter(Student.academic_year_id == academic_year_id)

    # Sorting
    if sort_by == "name_asc":
        query = query.order_by(Student.name.asc())
    elif sort_by == "name_desc":
        query = query.order_by(Student.name.desc())
    elif sort_by == "roll_asc":
        query = query.order_by(Student.roll_number.asc())
    elif sort_by == "roll_desc":
        query = query.order_by(Student.roll_number.desc())
    elif sort_by == "class_asc":
        query = query.order_by(Class.name.asc(), Class.section.asc(), Student.roll_number.asc())
    else:
        query = query.order_by(Student.id.desc())

    total = query.count()
    students = query.offset(skip).limit(limit).all()

    items = []
    for s in students:
        att_pct, fee_st = _compute_student_stats(db, s.id)
        class_name = s.student_class.name if s.student_class else "Unassigned"
        sec = s.student_class.section if s.student_class else None
        if s.student_class and s.student_class.section:
            class_name = f"{s.student_class.name}-{s.student_class.section}"

        year_name = s.academic_year.year_name if s.academic_year else None
        formatted_roll = _format_roll_number(s)

        items.append(
            StudentListItem(
                id=s.id,
                name=s.name,
                roll_number=s.roll_number,
                formatted_roll_number=formatted_roll,
                class_id=s.class_id,
                academic_year_id=s.academic_year_id,
                academic_year_name=year_name,
                class_name=class_name,
                section=sec,
                date_of_birth=s.date_of_birth,
                gender=s.gender,
                parent_name=s.parent_name,
                contact_number=s.contact_number,
                email=s.email,
                address=s.address,
                city=s.city,
                admission_date=s.admission_date,
                is_active=s.is_active,
                concession_type=getattr(s, "concession_type", "None") or "None",
                discount_percentage=getattr(s, "discount_percentage", 0.0) or 0.0,
                discount_amount=getattr(s, "discount_amount", 0.0) or 0.0,
                attendance_percentage=att_pct,
                fee_status=fee_st,
            )
        )

    return StudentListResponse(total=total, items=items)


@router.post("", response_model=StudentDetail, status_code=status.HTTP_201_CREATED)
def create_student(
    student_in: StudentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("students", "create")),
):
    """Add a new student to the system."""
    academic_year_id = student_in.academic_year_id or _current_academic_year(db).id
    if not student_in.date_of_birth:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Date of Birth is required",
        )

    # Validate class exists
    class_obj = db.query(Class).filter(Class.id == student_in.class_id).first()
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Class with ID {student_in.class_id} does not exist",
        )
    active_student_count = db.query(Student).filter(
        Student.class_id == class_obj.id,
        Student.is_active.is_(True),
    ).count()
    if active_student_count >= class_obj.total_strength:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{class_obj.name} {class_obj.section or ''} has reached its capacity of {class_obj.total_strength}",
        )

    new_student = Student(
        id=_next_student_id(db),
        name=student_in.name.strip(),
        roll_number=student_in.roll_number or allocate_roll_number(
            db, class_id=student_in.class_id, academic_year_id=academic_year_id
        ),
        class_id=student_in.class_id,
        academic_year_id=academic_year_id,
        date_of_birth=student_in.date_of_birth,
        gender=student_in.gender,
        parent_name=student_in.parent_name.strip() if student_in.parent_name else None,
        contact_number=student_in.contact_number.strip() if student_in.contact_number else None,
        email=student_in.email.strip().lower() if student_in.email else None,
        address=student_in.address.strip() if student_in.address else None,
        city=student_in.city.strip() if student_in.city else None,
        admission_date=student_in.admission_date or date.today(),
        is_active=student_in.is_active,
        concession_type=student_in.concession_type or "None",
        discount_percentage=student_in.discount_percentage or 0.0,
        discount_amount=student_in.discount_amount or 0.0,
        notes=student_in.notes,
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)

    # Auto-generate initial fee vouchers if active FeeCharge records exist for this class & session
    active_charges = db.query(FeeCharge).filter(
        FeeCharge.class_id == new_student.class_id,
        FeeCharge.academic_year_id == academic_year_id,
        FeeCharge.is_active.is_(True),
    ).all()

    if active_charges:
        today = date.today()
        due_day = min(10, monthrange(today.year, today.month)[1])
        due_date = date(today.year, today.month, due_day)
        disc_pct = new_student.discount_percentage or 0.0

        for charge in active_charges:
            if charge.charge_type in {"yearly", "one-time"} and charge.applicable_from_month not in (None, today.month):
                continue
            base_amount = charge.amount or 0.0
            if disc_pct > 0 and charge.charge_type == "monthly":
                final_amount = round(base_amount * (1.0 - (disc_pct / 100.0)), 2)
            else:
                final_amount = base_amount

            db.add(
                Fee(
                    student_id=new_student.id,
                    fee_charge_id=charge.id,
                    month=today.month,
                    year=today.year,
                    due_date=due_date,
                    amount=final_amount,
                    status="pending",
                    paid_amount=0.0,
                    created_by=current_user.id,
                )
            )
        db.commit()

    formatted_roll = _format_roll_number(new_student)

    create_audit_log(
        db,
        user_id=current_user.id,
        action="CREATE_STUDENT",
        table_name="students",
        record_id=new_student.id,
        new_values=json.dumps({"name": new_student.name, "roll_number": new_student.roll_number, "formatted_roll_number": formatted_roll}),
    )

    class_name = f"{class_obj.name}-{class_obj.section}" if class_obj.section else class_obj.name
    year_name = new_student.academic_year.year_name if new_student.academic_year else None

    return StudentDetail(
        id=new_student.id,
        name=new_student.name,
        roll_number=new_student.roll_number,
        formatted_roll_number=formatted_roll,
        class_id=new_student.class_id,
        academic_year_id=new_student.academic_year_id,
        academic_year_name=year_name,
        class_name=class_name,
        section=class_obj.section,
        date_of_birth=new_student.date_of_birth,
        gender=new_student.gender,
        parent_name=new_student.parent_name,
        contact_number=new_student.contact_number,
        email=new_student.email,
        address=new_student.address,
        city=new_student.city,
        admission_date=new_student.admission_date,
        is_active=new_student.is_active,
        concession_type=new_student.concession_type or "None",
        discount_percentage=new_student.discount_percentage or 0.0,
        discount_amount=new_student.discount_amount or 0.0,
        notes=new_student.notes,
        attendance_percentage=None,
        fee_status="no_records",
        created_at=new_student.created_at,
        updated_at=new_student.updated_at,
    )


@router.get("/{student_id}", response_model=StudentDetail)
def get_student(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("students", "read")),
):
    """Retrieve complete profile details for a specific student."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID {student_id} not found",
        )

    att_pct, fee_st = _compute_student_stats(db, student.id)
    class_obj = student.student_class
    class_name = f"{class_obj.name}-{class_obj.section}" if class_obj and class_obj.section else (class_obj.name if class_obj else "Unassigned")
    year_name = student.academic_year.year_name if student.academic_year else None
    formatted_roll = _format_roll_number(student)

    return StudentDetail(
        id=student.id,
        name=student.name,
        roll_number=student.roll_number,
        formatted_roll_number=formatted_roll,
        class_id=student.class_id,
        academic_year_id=student.academic_year_id,
        academic_year_name=year_name,
        class_name=class_name,
        section=class_obj.section if class_obj else None,
        date_of_birth=student.date_of_birth,
        gender=student.gender,
        parent_name=student.parent_name,
        contact_number=student.contact_number,
        email=student.email,
        address=student.address,
        city=student.city,
        admission_date=student.admission_date,
        is_active=student.is_active,
        concession_type=student.concession_type or "None",
        discount_percentage=student.discount_percentage or 0.0,
        discount_amount=student.discount_amount or 0.0,
        notes=student.notes,
        attendance_percentage=att_pct,
        fee_status=fee_st,
        created_at=student.created_at,
        updated_at=student.updated_at,
    )


@router.put("/{student_id}", response_model=StudentDetail)
def update_student(
    student_id: str,
    student_in: StudentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("students", "update")),
):
    """Update student record."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID {student_id} not found",
        )

    # Validate class if updated
    if student_in.class_id is not None:
        class_obj = db.query(Class).filter(Class.id == student_in.class_id).first()
        if not class_obj:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Class with ID {student_in.class_id} not found",
            )
        active_student_count = db.query(Student).filter(
            Student.class_id == class_obj.id,
            Student.is_active.is_(True),
            Student.id != student.id,
        ).count()
        if student_in.is_active is not False and active_student_count >= class_obj.total_strength:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{class_obj.name} {class_obj.section or ''} has reached its capacity of {class_obj.total_strength}",
            )
        student.class_id = student_in.class_id
    if student_in.academic_year_id is not None:
        student.academic_year_id = student_in.academic_year_id

    if student_in.name is not None:
        student.name = student_in.name.strip()
    if student_in.date_of_birth is not None:
        student.date_of_birth = student_in.date_of_birth
    if student_in.gender is not None:
        student.gender = student_in.gender
    if student_in.parent_name is not None:
        student.parent_name = student_in.parent_name.strip()
    if student_in.contact_number is not None:
        student.contact_number = student_in.contact_number.strip()
    if student_in.email is not None:
        student.email = student_in.email.strip().lower()
    if student_in.address is not None:
        student.address = student_in.address.strip()
    if student_in.city is not None:
        student.city = student_in.city.strip()
    if student_in.admission_date is not None:
        student.admission_date = student_in.admission_date
    if student_in.is_active is not None:
        student.is_active = student_in.is_active
    if student_in.concession_type is not None:
        student.concession_type = student_in.concession_type
    if student_in.discount_percentage is not None:
        student.discount_percentage = student_in.discount_percentage
    if student_in.discount_amount is not None:
        student.discount_amount = student_in.discount_amount
    if student_in.notes is not None:
        student.notes = student_in.notes

    db.commit()
    db.refresh(student)

    formatted_roll = _format_roll_number(student)

    create_audit_log(
        db,
        user_id=current_user.id,
        action="UPDATE_STUDENT",
        table_name="students",
        record_id=student.id,
        new_values=json.dumps({"name": student.name, "roll_number": student.roll_number, "formatted_roll_number": formatted_roll}),
    )

    att_pct, fee_st = _compute_student_stats(db, student.id)
    class_obj = student.student_class
    class_name = f"{class_obj.name}-{class_obj.section}" if class_obj and class_obj.section else (class_obj.name if class_obj else "Unassigned")
    year_name = student.academic_year.year_name if student.academic_year else None

    return StudentDetail(
        id=student.id,
        name=student.name,
        roll_number=student.roll_number,
        formatted_roll_number=formatted_roll,
        class_id=student.class_id,
        academic_year_id=student.academic_year_id,
        academic_year_name=year_name,
        class_name=class_name,
        section=class_obj.section if class_obj else None,
        date_of_birth=student.date_of_birth,
        gender=student.gender,
        parent_name=student.parent_name,
        contact_number=student.contact_number,
        email=student.email,
        address=student.address,
        city=student.city,
        admission_date=student.admission_date,
        is_active=student.is_active,
        concession_type=student.concession_type or "None",
        discount_percentage=student.discount_percentage or 0.0,
        discount_amount=student.discount_amount or 0.0,
        notes=student.notes,
        attendance_percentage=att_pct,
        fee_status=fee_st,
        created_at=student.created_at,
        updated_at=student.updated_at,
    )


@router.delete("/{student_id}")
def delete_student(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("students", "delete")),
):
    """Deactivate a student while preserving enrollment history and related records."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID {student_id} not found",
        )

    student.is_active = False
    db.commit()

    create_audit_log(
        db,
        user_id=current_user.id,
        action="DEACTIVATE_STUDENT",
        table_name="students",
        record_id=student_id,
    )

    return {"success": True, "message": "Student moved to inactive students"}


@router.post("/{student_id}/restore")
def restore_student(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("students", "update")),
):
    """Restore a deactivated student back to active status."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID {student_id} not found",
        )

    student.is_active = True
    db.commit()

    create_audit_log(
        db,
        user_id=current_user.id,
        action="RESTORE_STUDENT",
        table_name="students",
        record_id=student_id,
    )

    return {"success": True, "message": "Student restored successfully"}


class StudentPromoteRequest(BaseModel):
    target_class_id: Optional[int] = None
    target_academic_year_id: Optional[int] = None
    action: Optional[str] = "promote"  # "promote", "repeat", "graduate"
    notes: Optional[str] = None


@router.post("/{student_id}/promote", response_model=StudentDetail)
def promote_student(
    student_id: str,
    payload: StudentPromoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("students", "update")),
):
    """Promote or transfer an individual student to another class, repeat, or graduate."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID {student_id} not found",
        )

    old_class = student.student_class
    old_class_name = (
        f"{old_class.name}-{old_class.section}"
        if old_class and old_class.section
        else (old_class.name if old_class else "Unknown")
    )
    old_roll = student.roll_number

    act = (payload.action or "promote").lower()

    if act == "graduate":
        student.is_active = False
        grad_note = f"Graduated on {date.today().isoformat()}"
        if payload.notes:
            grad_note += f": {payload.notes.strip()}"
        student.notes = f"{student.notes}\n{grad_note}".strip() if student.notes else grad_note
    elif act == "repeat":
        if payload.target_academic_year_id:
            student.academic_year_id = payload.target_academic_year_id
        repeat_note = f"Repeated in {old_class_name} on {date.today().isoformat()}"
        if payload.notes:
            repeat_note += f": {payload.notes.strip()}"
        student.notes = f"{student.notes}\n{repeat_note}".strip() if student.notes else repeat_note
    else:  # promote
        if not payload.target_class_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target class is required for promoting a student.",
            )
        target_class = db.query(Class).filter(Class.id == payload.target_class_id).first()
        if not target_class:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Target class with ID {payload.target_class_id} not found.",
            )

        target_year_id = payload.target_academic_year_id or student.academic_year_id
        if not target_year_id:
            current_ay = db.query(AcademicYear).filter(AcademicYear.is_current.is_(True)).first()
            target_year_id = current_ay.id if current_ay else 1

        # Check capacity
        active_student_count = db.query(Student).filter(
            Student.class_id == target_class.id,
            Student.academic_year_id == target_year_id,
            Student.is_active.is_(True),
            Student.id != student.id,
        ).count()
        if active_student_count >= target_class.total_strength:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{target_class.name} {target_class.section or ''} has reached its capacity of {target_class.total_strength} students.",
            )

        new_roll = allocate_roll_number(db, target_class.id, target_year_id)
        student.class_id = target_class.id
        student.academic_year_id = target_year_id
        student.roll_number = new_roll
        new_class_name = f"{target_class.name}-{target_class.section}" if target_class.section else target_class.name
        promote_note = f"Promoted from {old_class_name} (Roll #{old_roll}) to {new_class_name} (Roll #{new_roll}) on {date.today().isoformat()}"
        if payload.notes:
            promote_note += f": {payload.notes.strip()}"
        student.notes = f"{student.notes}\n{promote_note}".strip() if student.notes else promote_note

    db.commit()
    db.refresh(student)

    formatted_roll = _format_roll_number(student)
    create_audit_log(
        db,
        user_id=current_user.id,
        action="PROMOTE_STUDENT",
        table_name="students",
        record_id=student.id,
        new_values=json.dumps({
            "action": act,
            "target_class_id": student.class_id,
            "roll_number": student.roll_number,
            "formatted_roll": formatted_roll,
            "academic_year_id": student.academic_year_id,
        }),
    )

    att_pct, fee_st = _compute_student_stats(db, student.id)
    class_obj = student.student_class
    c_label = f"{class_obj.name}-{class_obj.section}" if class_obj and class_obj.section else (class_obj.name if class_obj else "Unassigned")
    y_label = student.academic_year.year_name if student.academic_year else None

    return StudentDetail(
        id=student.id,
        name=student.name,
        roll_number=student.roll_number,
        formatted_roll_number=formatted_roll,
        class_id=student.class_id,
        academic_year_id=student.academic_year_id,
        academic_year_name=y_label,
        class_name=c_label,
        section=class_obj.section if class_obj else None,
        date_of_birth=student.date_of_birth,
        gender=student.gender,
        parent_name=student.parent_name,
        contact_number=student.contact_number,
        email=student.email,
        address=student.address,
        city=student.city,
        admission_date=student.admission_date,
        is_active=student.is_active,
        concession_type=student.concession_type or "None",
        discount_percentage=student.discount_percentage or 0.0,
        discount_amount=student.discount_amount or 0.0,
        notes=student.notes,
        attendance_percentage=att_pct,
        fee_status=fee_st,
        created_at=student.created_at,
        updated_at=student.updated_at,
    )


@router.get("/{student_id}/attendance-summary", response_model=AttendanceSummaryResponse)
def get_student_attendance_summary(
    student_id: str,
    month: Optional[str] = Query(None, description="Optional month in YYYY-MM format"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("attendance", "read")),
):
    """Get attendance statistics for a student."""
    query = db.query(Attendance).filter(Attendance.student_id == student_id)
    if month and len(month) == 7:
        try:
            year, m = map(int, month.split("-"))
            query = query.filter(
                func.strftime("%Y", Attendance.attendance_date) == str(year),
                func.strftime("%m", Attendance.attendance_date) == f"{m:02d}",
            )
        except Exception:
            pass

    records = query.all()
    total_days = len(records)
    present = sum(1 for r in records if r.status in ["present", "half-day"])
    absent = sum(1 for r in records if r.status == "absent")
    leave = sum(1 for r in records if r.status == "leave")
    pct = round((present / total_days) * 100, 1) if total_days > 0 else 0.0

    return AttendanceSummaryResponse(
        total_days=total_days,
        present=present,
        absent=absent,
        leave=leave,
        percentage=pct,
    )


@router.get("/{student_id}/fee-status", response_model=FeeStatusResponse)
def get_student_fee_status(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("fees", "read")),
):
    """Get fee summary and pending balance for a student."""
    fees = db.query(Fee).filter(Fee.student_id == student_id).all()
    pending_months = []
    total_due = 0.0
    last_paid_date = None
    overall_status = "paid"

    for f in fees:
        if f.status in ["pending", "overdue", "partial"]:
            remaining = max(0.0, float(f.amount or 0.0) - float(f.paid_amount or 0.0))
            total_due += remaining
            pending_months.append(f.month)
            if f.status == "overdue":
                overall_status = "overdue"
            elif overall_status != "overdue":
                overall_status = "pending"
        elif f.status == "paid" and f.paid_date:
            paid_str = str(f.paid_date)
            if last_paid_date is None or paid_str > last_paid_date:
                last_paid_date = paid_str

    if not fees:
        overall_status = "no_records"

    return FeeStatusResponse(
        total_due=round(total_due, 2),
        pending_months=pending_months,
        last_paid_date=last_paid_date,
        status=overall_status,
    )


@router.get("/export/csv")
def export_students_csv(
    class_id: Optional[int] = Query(None, description="Optional class ID filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "principal", "accountant")),
):
    """Export complete student directory to a standard CSV file."""
    import csv
    import io
    from fastapi.responses import Response

    query = db.query(Student).filter(Student.is_active == True)
    if class_id:
        query = query.filter(Student.class_id == class_id)
    students = query.order_by(Student.class_id, Student.roll_number, Student.name).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Sr.#", "Admission No", "Roll No", "Student Name", "Gender",
        "Class", "Section", "Father Name", "Contact Phone", "Fee Category", "Admission Date"
    ])

    for idx, st in enumerate(students, start=1):
        class_name = st.student_class.name if st.student_class else "N/A"
        section = st.student_class.section if st.student_class else "N/A"
        roll_display = str(st.roll_number) if st.roll_number is not None else str(idx)

        writer.writerow([
            idx,
            st.id or "N/A",
            roll_display,
            st.name,
            st.gender or "N/A",
            class_name,
            section,
            st.father_name or st.parent_name or "N/A",
            st.contact_number or "N/A",
            st.concession_type or "Regular",
            str(st.admission_date) if st.admission_date else "N/A",
        ])

    csv_data = output.getvalue().encode("utf-8-sig")
    filename = f"Students_Roster_{datetime.now().strftime('%Y%m%d')}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export/excel")
def export_students_excel(
    class_id: Optional[int] = Query(None, description="Optional class ID filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "principal", "accountant")),
):
    """Export complete student directory to a beautifully formatted Excel workbook."""
    import tempfile
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

    query = db.query(Student).filter(Student.is_active == True)
    if class_id:
        query = query.filter(Student.class_id == class_id)
    students = query.order_by(Student.class_id, Student.roll_number, Student.name).all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Student Directory"

    # Title block
    ws.merge_cells("A1:K1")
    title_cell = ws["A1"]
    title_cell.value = "Little Scholar School System - Official Student Directory"
    title_cell.font = Font(name="Calibri", size=14, bold=True, color="1E3A8A")
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 28

    # Subtitle with date
    ws.merge_cells("A2:K2")
    sub_cell = ws["A2"]
    sub_cell.value = f"Exported on {datetime.now().strftime('%B %d, %Y %I:%M %p')} | Total Enrolled Records: {len(students)}"
    sub_cell.font = Font(name="Calibri", size=10, italic=True, color="475569")
    sub_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[2].height = 20

    # Headers
    headers = [
        "Sr.#", "Admission No", "Roll No", "Student Name", "Gender",
        "Class", "Section", "Father Name", "Contact Phone", "Fee Category", "Admission Date"
    ]
    ws.append([])
    ws.append(headers)
    ws.row_dimensions[4].height = 24

    header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    thin_border = Border(
        left=Side(style="thin", color="CBD5E1"),
        right=Side(style="thin", color="CBD5E1"),
        top=Side(style="thin", color="CBD5E1"),
        bottom=Side(style="thin", color="CBD5E1"),
    )

    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=4, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = thin_border

    # Data Rows
    row_idx = 5
    for idx, st in enumerate(students, start=1):
        class_name = st.student_class.name if st.student_class else "N/A"
        section = st.student_class.section if st.student_class else "N/A"
        roll_display = str(st.roll_number) if st.roll_number is not None else str(idx)

        row_data = [
            idx,
            st.id or "N/A",
            roll_display,
            st.name,
            st.gender or "N/A",
            class_name,
            section,
            st.father_name or st.parent_name or "N/A",
            st.contact_number or "N/A",
            st.concession_type or "Regular",
            str(st.admission_date) if st.admission_date else "N/A",
        ]
        ws.append(row_data)

        fill_color = "F8FAFC" if idx % 2 == 0 else "FFFFFF"
        row_fill = PatternFill(start_color=fill_color, end_color=fill_color, fill_type="solid")

        for col_idx in range(1, len(headers) + 1):
            c = ws.cell(row=row_idx, column=col_idx)
            c.fill = row_fill
            c.border = thin_border
            c.font = Font(name="Calibri", size=10)
            if col_idx in [1, 2, 3, 5, 7, 11]:
                c.alignment = Alignment(horizontal="center", vertical="center")
            else:
                c.alignment = Alignment(horizontal="left", vertical="center")
        ws.row_dimensions[row_idx].height = 20
        row_idx += 1

    from openpyxl.utils import get_column_letter
    for col_idx in range(1, len(headers) + 1):
        col_letter = get_column_letter(col_idx)
        max_len = max((len(str(ws.cell(row=r, column=col_idx).value or '')) for r in range(4, row_idx)), default=10)
        ws.column_dimensions[col_letter].width = max(max_len + 4, 14)

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx")
    temp_file.close()
    wb.save(temp_file.name)

    filename = f"Students_Roster_{datetime.now().strftime('%Y%m%d')}.xlsx"
    return FileResponse(
        path=temp_file.name,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )

from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.database import get_db
from backend.app.models import (
    Class,
    Student,
    User,
    ClassTeacherAssignment,
    Teacher,
    FeeCharge,
    AcademicYear,
)
from backend.app.schemas import ClassOut, ClassCreate, ClassUpdate, MessageResponse
from backend.app.middleware.rbac import require_roles, require_permission

router = APIRouter(prefix="/classes", tags=["Classes"])


def _get_class_details(db: Session, c: Class) -> tuple[int, Optional[int], Optional[str], float]:
    student_count = db.query(Student).filter(Student.class_id == c.id, Student.is_active == True).count()

    # Look up assigned class teacher
    assign = (
        db.query(ClassTeacherAssignment, Teacher)
        .join(Teacher, ClassTeacherAssignment.teacher_id == Teacher.id)
        .filter(ClassTeacherAssignment.class_id == c.id, ClassTeacherAssignment.is_current == True)
        .first()
    )
    class_teacher_id = assign[0].teacher_id if assign else None
    teacher_name = assign[1].full_name if assign else None

    # Look up monthly tuition fee
    fee_charge = (
        db.query(FeeCharge)
        .filter(FeeCharge.class_id == c.id, FeeCharge.is_active == True)
        .order_by(FeeCharge.id.desc())
        .first()
    )
    monthly_fee = fee_charge.amount if fee_charge else 3500.0

    return student_count, class_teacher_id, teacher_name, monthly_fee


@router.get("", response_model=List[ClassOut])
def list_classes(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("classes", "read")),
):
    """Retrieve all classes with active student count, assigned teacher, and monthly fee."""
    classes = db.query(Class).filter(Class.is_active.is_(True)).all()
    results = []
    for c in classes:
        student_count, class_teacher_id, teacher_name, monthly_fee = _get_class_details(db, c)
        section_display = f"-{c.section}" if c.section else ""
        display_name = f"{c.name} {section_display}".strip()
        results.append(
            ClassOut(
                id=c.id,
                name=c.name,
                section=c.section,
                capacity=c.total_strength,
                total_strength=c.total_strength,
                academic_year=(db.query(AcademicYear).filter(AcademicYear.is_current.is_(True)).first().year_name if db.query(AcademicYear).filter(AcademicYear.is_current.is_(True)).first() else "2024-2025"),
                class_teacher_id=class_teacher_id,
                teacher_name=teacher_name,
                monthly_fee=monthly_fee,
                display_name=display_name,
                student_count=student_count,
                created_at=c.created_at,
                updated_at=c.updated_at,
            )
        )
    return results


@router.post("", response_model=ClassOut, status_code=status.HTTP_201_CREATED)
def create_class(
    class_in: ClassCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "principal")),
):
    """Create a class or allocate the next available section."""
    class_name = class_in.name.strip()
    existing_sections = {
        (section or "").strip().upper()
        for section, in db.query(Class.section).filter(Class.name == class_name, Class.is_active.is_(True)).all()
    }
    next_section = next(
        chr(ord("A") + index)
        for index in range(26)
        if chr(ord("A") + index) not in existing_sections
    )
    target_section = class_in.section.strip().upper() if class_in.section else next_section
    capacity = class_in.total_strength or class_in.capacity or 40

    if capacity < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum students must be at least 1",
        )
    if capacity > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Class capacity cannot exceed maximum 100 students",
        )

    new_class = Class(
        name=class_name,
        section=target_section,
        total_strength=capacity,
    )
    db.add(new_class)
    db.commit()
    db.refresh(new_class)

    # Assign Teacher if provided
    current_ay = db.query(AcademicYear).filter(AcademicYear.is_current.is_(True)).first()
    ay_id = current_ay.id if current_ay else 1

    teacher_name = None
    if class_in.class_teacher_id:
        teacher = db.query(Teacher).filter(Teacher.id == class_in.class_teacher_id).first()
        if teacher:
            # Check if teacher is already assigned to an active class in this session
            existing_assignment = (
                db.query(ClassTeacherAssignment, Class)
                .join(Class, Class.id == ClassTeacherAssignment.class_id)
                .filter(
                    ClassTeacherAssignment.teacher_id == teacher.id,
                    ClassTeacherAssignment.academic_year_id == ay_id,
                    ClassTeacherAssignment.is_current == True,
                    Class.is_active == True,
                )
                .first()
            )
            if existing_assignment:
                assigned_class_name = f"{existing_assignment[1].name} ({existing_assignment[1].section or 'A'})"
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Teacher '{teacher.full_name}' is already assigned as Class Teacher to {assigned_class_name}. A teacher cannot be assigned to multiple classes.",
                )

            teacher_name = teacher.full_name
            db.add(
                ClassTeacherAssignment(
                    class_id=new_class.id,
                    teacher_id=teacher.id,
                    academic_year_id=ay_id,
                    assignment_date=date.today(),
                    is_current=True,
                )
            )

    # Assign Tuition Fee Charge if provided
    monthly_fee = class_in.monthly_fee if class_in.monthly_fee is not None else 3500.0
    if monthly_fee > 0:
        db.add(
            FeeCharge(
                class_id=new_class.id,
                charge_name="Monthly Tuition Fee",
                amount=monthly_fee,
                charge_type="tuition",
                applicable_from_month=1,
                applicable_to_month=12,
                is_mandatory=True,
                is_active=True,
                academic_year_id=ay_id,
            )
        )

    db.commit()

    section_display = f"-{new_class.section}" if new_class.section else ""
    return ClassOut(
        id=new_class.id,
        name=new_class.name,
        section=new_class.section,
        capacity=new_class.total_strength,
        total_strength=new_class.total_strength,
        academic_year=(db.query(AcademicYear).filter(AcademicYear.is_current.is_(True)).first().year_name if db.query(AcademicYear).filter(AcademicYear.is_current.is_(True)).first() else "2024-2025"),
        class_teacher_id=class_in.class_teacher_id,
        teacher_name=teacher_name,
        monthly_fee=monthly_fee,
        display_name=f"{new_class.name} {section_display}".strip(),
        student_count=0,
        created_at=new_class.created_at,
        updated_at=new_class.updated_at,
    )


@router.put("/{class_id}", response_model=ClassOut)
def update_class(
    class_id: int,
    class_in: ClassUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "principal")),
):
    """Update a class, section, teacher, fee, or maximum capacity."""
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    if not class_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

    if class_in.name is not None:
        class_obj.name = class_in.name.strip()
    if class_in.section is not None:
        class_obj.section = class_in.section.strip().upper()
    if class_in.capacity is not None:
        if class_in.capacity < 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Capacity must be at least 1")
        if class_in.capacity > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Class capacity cannot exceed maximum 100 students",
            )
        active_student_count = db.query(Student).filter(
            Student.class_id == class_obj.id,
            Student.is_active.is_(True),
        ).count()
        if class_in.capacity < active_student_count:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Capacity cannot be lower than the {active_student_count} active students in this class",
            )
        class_obj.total_strength = class_in.capacity

    # Update Teacher assignment if provided
    current_ay = db.query(AcademicYear).filter(AcademicYear.is_current.is_(True)).first()
    ay_id = current_ay.id if current_ay else 1

    if class_in.class_teacher_id is not None:
        # deactivate previous
        db.query(ClassTeacherAssignment).filter(
            ClassTeacherAssignment.class_id == class_obj.id,
            ClassTeacherAssignment.is_current == True,
        ).update({"is_current": False})

        if class_in.class_teacher_id > 0:
            teacher = db.query(Teacher).filter(Teacher.id == class_in.class_teacher_id).first()
            if teacher:
                # Check if teacher is already assigned to another active class in this session
                existing_assignment = (
                    db.query(ClassTeacherAssignment, Class)
                    .join(Class, Class.id == ClassTeacherAssignment.class_id)
                    .filter(
                        ClassTeacherAssignment.teacher_id == teacher.id,
                        ClassTeacherAssignment.class_id != class_obj.id,
                        ClassTeacherAssignment.academic_year_id == ay_id,
                        ClassTeacherAssignment.is_current == True,
                        Class.is_active == True,
                    )
                    .first()
                )
                if existing_assignment:
                    assigned_class_name = f"{existing_assignment[1].name} ({existing_assignment[1].section or 'A'})"
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Teacher '{teacher.full_name}' is already assigned as Class Teacher to {assigned_class_name}. A teacher cannot be assigned to multiple classes.",
                    )

                db.add(
                    ClassTeacherAssignment(
                        class_id=class_obj.id,
                        teacher_id=teacher.id,
                        academic_year_id=ay_id,
                        assignment_date=date.today(),
                        is_current=True,
                    )
                )

    # Update Monthly Tuition Fee if provided
    if class_in.monthly_fee is not None:
        existing_charge = (
            db.query(FeeCharge)
            .filter(FeeCharge.class_id == class_obj.id, FeeCharge.is_active == True)
            .first()
        )
        if existing_charge:
            existing_charge.amount = class_in.monthly_fee
        else:
            db.add(
                FeeCharge(
                    class_id=class_obj.id,
                    charge_name="Monthly Tuition Fee",
                    amount=class_in.monthly_fee,
                    charge_type="tuition",
                    applicable_from_month=1,
                    applicable_to_month=12,
                    is_mandatory=True,
                    is_active=True,
                    academic_year_id=ay_id,
                )
            )

    db.commit()
    db.refresh(class_obj)

    student_count, teacher_id, teacher_name, monthly_fee = _get_class_details(db, class_obj)
    section_display = f"-{class_obj.section}" if class_obj.section else ""
    return ClassOut(
        id=class_obj.id,
        name=class_obj.name,
        section=class_obj.section,
        capacity=class_obj.total_strength,
        total_strength=class_obj.total_strength,
        academic_year=(db.query(AcademicYear).filter(AcademicYear.is_current.is_(True)).first().year_name if db.query(AcademicYear).filter(AcademicYear.is_current.is_(True)).first() else "2024-2025"),
        class_teacher_id=teacher_id,
        teacher_name=teacher_name,
        monthly_fee=monthly_fee,
        display_name=f"{class_obj.name} {section_display}".strip(),
        student_count=student_count,
        created_at=class_obj.created_at,
        updated_at=class_obj.updated_at,
    )


@router.get("/{class_id}", response_model=ClassOut)
def get_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("classes", "read")),
):
    """Get class details by ID."""
    c = db.query(Class).filter(Class.id == class_id).first()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

    student_count, class_teacher_id, teacher_name, monthly_fee = _get_class_details(db, c)
    section_display = f"-{c.section}" if c.section else ""
    return ClassOut(
        id=c.id,
        name=c.name,
        section=c.section,
        capacity=c.total_strength,
        total_strength=c.total_strength,
        academic_year=(db.query(AcademicYear).filter(AcademicYear.is_current.is_(True)).first().year_name if db.query(AcademicYear).filter(AcademicYear.is_current.is_(True)).first() else "2024-2025"),
        class_teacher_id=class_teacher_id,
        teacher_name=teacher_name,
        monthly_fee=monthly_fee,
        display_name=f"{c.name} {section_display}".strip(),
        student_count=student_count,
        created_at=c.created_at,
        updated_at=c.updated_at,
    )


@router.delete("/{class_id}", response_model=MessageResponse)
def delete_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    """Delete or deactivate a class section."""
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    if not class_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

    student_count = db.query(Student).filter(Student.class_id == class_id, Student.is_active == True).count()
    if student_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete class '{class_obj.name} (Sec {class_obj.section})' because {student_count} student(s) are currently enrolled in it. Please transfer or reassign all students before deleting this class.",
        )

    db.delete(class_obj)
    db.commit()
    return MessageResponse(message=f"Class '{class_obj.name} (Sec {class_obj.section})' deleted successfully.")

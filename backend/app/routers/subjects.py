from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database import get_db
from backend.app.middleware.rbac import require_permission, require_roles
from backend.app.models import Subject, Class, User, Timetable, ExamRecord, Teacher
from backend.app.schemas import (
    SubjectCreate,
    SubjectUpdate,
    SubjectOut,
    MessageResponse,
)

router = APIRouter(tags=["Subjects & Courses"])


def _to_subject_out(sub: Subject, class_obj: Optional[Class] = None, teacher_obj: Optional[Teacher] = None) -> SubjectOut:
    class_name = ""
    section = "A"
    if class_obj:
        section = class_obj.section or "A"
        section_display = f"-{class_obj.section}" if class_obj.section else ""
        class_name = f"{class_obj.name} {section_display}".strip()
    return SubjectOut(
        id=sub.id,
        name=sub.name,
        course_name=sub.name,
        class_id=sub.class_id,
        class_name=class_name,
        section=section,
        course_code=f"{sub.name[:3].upper()}-{sub.class_id:02d}",
        weekly_periods=5,
        max_marks=sub.max_marks or 100,
        enrollment_limit=sub.enrollment_limit or 100,
        teacher_id=sub.teacher_id,
        teacher_name=teacher_obj.full_name if teacher_obj else ("Unassigned" if not sub.teacher_id else "Faculty Member"),
        room="Classroom",
        created_at=sub.created_at,
        updated_at=sub.updated_at,
    )


# -------------------------------------------------------------
# GET /subjects (and /courses alias for frontend courses.js)
# -------------------------------------------------------------
@router.get("/subjects", response_model=List[SubjectOut])
@router.get("/courses", response_model=List[dict])
def list_subjects(
    class_id: Optional[int] = Query(None),
    class_name: Optional[str] = Query(None, alias="class"),
    section: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("classes", "read")),
):
    query = (
        db.query(Subject, Class, Teacher)
        .join(Class, Subject.class_id == Class.id)
        .outerjoin(Teacher, Subject.teacher_id == Teacher.id)
    )

    if class_id is not None:
        query = query.filter(Subject.class_id == class_id)
    if class_name:
        query = query.filter(func.lower(Class.name) == class_name.strip().lower())
    if section:
        query = query.filter(func.upper(Class.section) == section.strip().upper())

    results = []
    for sub, c, t in query.order_by(Class.name, Subject.name).all():
        results.append({
            "id": sub.id,
            "course_name": sub.name,
            "name": sub.name,
            "class_id": c.id,
            "class_name": c.name,
            "section": c.section or "A",
            "course_code": f"{sub.name[:3].upper()}-{c.id:02d}",
            "weekly_periods": 5,
            "max_marks": sub.max_marks or 100,
            "enrollment_limit": sub.enrollment_limit or 100,
            "teacher_id": sub.teacher_id,
            "teacher_name": t.full_name if t else "Unassigned",
            "room": "Classroom",
            "created_at": sub.created_at,
            "updated_at": sub.updated_at,
        })
    return results


@router.get("/subjects/class/{class_id}", response_model=List[SubjectOut])
def list_subjects_for_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("classes", "read")),
):
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")

    subjects = (
        db.query(Subject)
        .filter(Subject.class_id == class_id)
        .order_by(Subject.name)
        .all()
    )
    return [_to_subject_out(sub, class_obj) for sub in subjects]


@router.post("/subjects", response_model=SubjectOut, status_code=status.HTTP_201_CREATED)
@router.post("/courses", status_code=status.HTTP_201_CREATED)
def create_subject(
    payload: SubjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "principal")),
):
    sub_name = (payload.name or payload.course_name or "").strip()
    if not sub_name:
        raise HTTPException(status_code=400, detail="Subject/Course name is required")

    class_obj = None
    if payload.class_id:
        class_obj = db.query(Class).filter(Class.id == payload.class_id, Class.is_active.is_(True)).first()
    elif payload.class_name:
        c_query = db.query(Class).filter(func.lower(Class.name) == payload.class_name.strip().lower(), Class.is_active.is_(True))
        if payload.section:
            c_query = c_query.filter(func.upper(Class.section) == payload.section.strip().upper())
        class_obj = c_query.first()

    if not class_obj:
        # Fallback to first active class if none found
        class_obj = db.query(Class).filter(Class.is_active.is_(True)).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Active class not found")

    limit = payload.enrollment_limit or 100
    if limit < 1:
        raise HTTPException(status_code=400, detail="Enrollment limit must be at least 1 student")
    if limit > 100:
        raise HTTPException(status_code=400, detail="Enrollment limit cannot exceed maximum 100 students")

    existing = (
        db.query(Subject)
        .filter(Subject.class_id == class_obj.id, func.lower(Subject.name) == sub_name.lower())
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Subject '{sub_name}' already exists for this class",
        )

    new_sub = Subject(
        class_id=class_obj.id,
        name=sub_name,
        max_marks=payload.max_marks or 100,
        enrollment_limit=limit,
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)

    return {
        "id": new_sub.id,
        "name": new_sub.name,
        "course_name": new_sub.name,
        "class_id": class_obj.id,
        "class_name": class_obj.name,
        "section": class_obj.section or "A",
        "course_code": payload.course_code or f"{new_sub.name[:3].upper()}-{class_obj.id:02d}",
        "weekly_periods": payload.weekly_periods or 5,
        "max_marks": new_sub.max_marks or 100,
        "enrollment_limit": new_sub.enrollment_limit or 100,
        "teacher_id": payload.teacher_id,
        "teacher_name": payload.teacher_name or "Faculty Member",
        "room": payload.room or "Room 101",
        "created_at": new_sub.created_at,
        "updated_at": new_sub.updated_at,
    }


@router.get("/subjects/{subject_id}", response_model=SubjectOut)
def get_subject_by_id(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("classes", "read")),
):
    row = db.query(Subject, Class).join(Class, Subject.class_id == Class.id).filter(Subject.id == subject_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Subject not found")
    sub, class_obj = row
    return _to_subject_out(sub, class_obj)


@router.put("/subjects/{subject_id}", response_model=SubjectOut)
@router.put("/courses/{subject_id}", response_model=SubjectOut)
def update_subject(
    subject_id: int,
    payload: SubjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "principal")),
):
    sub = db.query(Subject).filter(Subject.id == subject_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subject not found")

    target_class_id = payload.class_id if payload.class_id is not None else sub.class_id
    raw_name = payload.name or payload.course_name
    target_name = raw_name.strip() if raw_name is not None else sub.name

    if payload.class_id is not None:
        c = db.query(Class).filter(Class.id == payload.class_id, Class.is_active.is_(True)).first()
        if not c:
            raise HTTPException(status_code=404, detail="Target class not found")

    # Conflict check
    duplicate = (
        db.query(Subject)
        .filter(
            Subject.class_id == target_class_id,
            func.lower(Subject.name) == target_name.lower(),
            Subject.id != subject_id,
        )
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=409, detail=f"Subject '{target_name}' already exists in this class")

    sub.name = target_name
    sub.class_id = target_class_id
    if payload.max_marks is not None:
        if payload.max_marks < 1:
            raise HTTPException(status_code=400, detail="Maximum marks must be at least 1")
        sub.max_marks = payload.max_marks
    if payload.enrollment_limit is not None:
        if payload.enrollment_limit < 1 or payload.enrollment_limit > 100:
            raise HTTPException(status_code=400, detail="Enrollment limit must be between 1 and 100")
        sub.enrollment_limit = payload.enrollment_limit
    db.commit()
    db.refresh(sub)

    class_obj = db.query(Class).filter(Class.id == sub.class_id).first()
    return _to_subject_out(sub, class_obj)


@router.delete("/subjects/{subject_id}", response_model=MessageResponse)
@router.delete("/courses/{subject_id}")
def delete_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "principal")),
):
    sub = db.query(Subject).filter(Subject.id == subject_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Check dependencies in exam records and timetables
    records_count = db.query(ExamRecord).filter(ExamRecord.subject_id == subject_id).count()
    if records_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete subject '{sub.name}'. {records_count} exam record(s) are linked to it.",
        )

    db.delete(sub)
    db.commit()
    return MessageResponse(message=f"Subject '{sub.name}' deleted successfully")


@router.post("/courses/{course_id}/assign-teacher")
def assign_teacher_to_course(
    course_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "principal")),
):
    sub = db.query(Subject).filter(Subject.id == course_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Course/Subject not found")
    teacher_id = payload.get("teacher_id")
    old_teacher_id = sub.teacher_id

    teacher = None
    if teacher_id is not None:
        teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
        if not teacher:
            raise HTTPException(status_code=404, detail="Teacher not found")
        sub.teacher_id = teacher.id
    else:
        sub.teacher_id = None

    db.commit()
    db.refresh(sub)

    # Sync total periods per week for the assigned teacher (5 periods per course)
    if teacher:
        assigned_count = db.query(Subject).filter(Subject.teacher_id == teacher.id).count()
        teacher.total_periods_per_week = assigned_count * 5
        db.commit()

    # Sync previous teacher if different
    if old_teacher_id and old_teacher_id != teacher_id:
        old_t = db.query(Teacher).filter(Teacher.id == old_teacher_id).first()
        if old_t:
            old_count = db.query(Subject).filter(Subject.teacher_id == old_t.id).count()
            old_t.total_periods_per_week = old_count * 5
            db.commit()

    return {
        "success": True,
        "course_id": course_id,
        "teacher_id": sub.teacher_id,
        "teacher_name": teacher.full_name if teacher else "Unassigned",
    }

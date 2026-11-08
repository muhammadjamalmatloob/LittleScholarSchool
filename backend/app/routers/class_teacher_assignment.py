from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.middleware.rbac import require_permission, require_roles
from backend.app.models import (
    AcademicYear,
    Class,
    ClassTeacherAssignment,
    Teacher,
    Timetable,
    User,
)
from backend.app.schemas import ClassTeacherAssignmentCreate, ClassTeacherAssignmentOut, TeacherOut

router = APIRouter(tags=["Class-Teacher Assignments"])


def _get_assignment(db: Session, assignment_id: int):
    return (
        db.query(ClassTeacherAssignment)
        .filter(ClassTeacherAssignment.id == assignment_id)
        .first()
    )


def _validate_references(db: Session, payload: ClassTeacherAssignmentCreate):
    class_obj = db.query(Class).filter(Class.id == payload.class_id, Class.is_active.is_(True)).first()
    teacher = db.query(Teacher).filter(Teacher.id == payload.teacher_id, Teacher.is_active.is_(True)).first()
    academic_year = db.query(AcademicYear).filter(
        AcademicYear.id == payload.academic_year_id,
        AcademicYear.is_active.is_(True),
    ).first()
    if class_obj is None:
        raise HTTPException(status_code=404, detail="Active class not found")
    if teacher is None:
        raise HTTPException(status_code=404, detail="Active teacher not found")
    if academic_year is None:
        raise HTTPException(status_code=404, detail="Active academic year not found")
    return class_obj, teacher, academic_year


def _to_response(assignment, class_obj, teacher):
    return ClassTeacherAssignmentOut(
        id=assignment.id,
        class_id=assignment.class_id,
        teacher_id=assignment.teacher_id,
        academic_year_id=assignment.academic_year_id,
        assignment_date=assignment.assignment_date,
        is_current=assignment.is_current,
        teacher=TeacherOut.model_validate(teacher),
        class_name=f"{class_obj.name}-{class_obj.section}" if class_obj.section else class_obj.name,
        created_at=assignment.created_at,
        updated_at=assignment.updated_at,
    )


@router.get("/class-teacher-assignments", response_model=List[ClassTeacherAssignmentOut])
def list_assignments(
    class_id: Optional[int] = Query(None),
    academic_year_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("classes", "read")),
):
    query = db.query(ClassTeacherAssignment, Class, Teacher).join(
        Class, Class.id == ClassTeacherAssignment.class_id
    ).join(Teacher, Teacher.id == ClassTeacherAssignment.teacher_id).filter(
        ClassTeacherAssignment.is_current.is_(True)
    )
    if class_id is not None:
        query = query.filter(ClassTeacherAssignment.class_id == class_id)
    if academic_year_id is not None:
        query = query.filter(ClassTeacherAssignment.academic_year_id == academic_year_id)
    return [_to_response(assignment, class_obj, teacher) for assignment, class_obj, teacher in query.all()]


@router.post(
    "/class-teacher-assignments",
    response_model=ClassTeacherAssignmentOut,
    status_code=status.HTTP_201_CREATED,
)
def create_assignment(
    payload: ClassTeacherAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    class_obj, teacher, _ = _validate_references(db, payload)
    # Check if teacher is already assigned to another active class in this academic year
    other_assignment = (
        db.query(ClassTeacherAssignment, Class)
        .join(Class, Class.id == ClassTeacherAssignment.class_id)
        .filter(
            ClassTeacherAssignment.teacher_id == payload.teacher_id,
            ClassTeacherAssignment.class_id != payload.class_id,
            ClassTeacherAssignment.academic_year_id == payload.academic_year_id,
            ClassTeacherAssignment.is_current == True,
            Class.is_active == True,
        )
        .first()
    )
    if other_assignment:
        assigned_name = f"{other_assignment[1].name} ({other_assignment[1].section or 'A'})"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{teacher.full_name} is already assigned as Class Teacher to {assigned_name}. A teacher cannot be assigned to multiple classes.",
        )

    assignment = db.query(ClassTeacherAssignment).filter(
        ClassTeacherAssignment.class_id == payload.class_id,
        ClassTeacherAssignment.academic_year_id == payload.academic_year_id,
    ).first()
    if assignment is None:
        assignment = ClassTeacherAssignment(
            class_id=payload.class_id,
            teacher_id=payload.teacher_id,
            academic_year_id=payload.academic_year_id,
            assignment_date=payload.assignment_date,
            is_current=True,
        )
        db.add(assignment)
    else:
        assignment.teacher_id = payload.teacher_id
        assignment.assignment_date = payload.assignment_date
        assignment.is_current = True
    db.query(Timetable).filter(
        Timetable.class_id == payload.class_id,
        Timetable.academic_year_id == payload.academic_year_id,
    ).update({"teacher_id": payload.teacher_id}, synchronize_session=False)
    db.commit()
    db.refresh(assignment)
    return _to_response(assignment, class_obj, teacher)


@router.put("/class-teacher-assignments/{assignment_id}", response_model=ClassTeacherAssignmentOut)
def update_assignment(
    assignment_id: int,
    payload: ClassTeacherAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    assignment = _get_assignment(db, assignment_id)
    if assignment is None:
        raise HTTPException(status_code=404, detail="Assignment not found")
    class_obj, teacher, _ = _validate_references(db, payload)
    duplicate = db.query(ClassTeacherAssignment).filter(
        ClassTeacherAssignment.class_id == payload.class_id,
        ClassTeacherAssignment.academic_year_id == payload.academic_year_id,
        ClassTeacherAssignment.id != assignment_id,
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="An assignment already exists for this class and academic year")
    assignment.class_id = payload.class_id
    assignment.teacher_id = payload.teacher_id
    assignment.academic_year_id = payload.academic_year_id
    assignment.assignment_date = payload.assignment_date
    assignment.is_current = True
    db.query(Timetable).filter(
        Timetable.class_id == payload.class_id,
        Timetable.academic_year_id == payload.academic_year_id,
    ).update({"teacher_id": payload.teacher_id}, synchronize_session=False)
    db.commit()
    db.refresh(assignment)
    return _to_response(assignment, class_obj, teacher)


@router.get("/classes/{class_id}/current-teacher")
def get_current_teacher(
    class_id: int,
    academic_year_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("classes", "read")),
):
    academic_year = (
        db.query(AcademicYear).filter(AcademicYear.id == academic_year_id).first()
        if academic_year_id is not None
        else db.query(AcademicYear).filter(AcademicYear.is_current.is_(True)).first()
    )
    if academic_year is None:
        raise HTTPException(status_code=404, detail="Academic year not found")
    result = db.query(ClassTeacherAssignment, Teacher).join(
        Teacher, Teacher.id == ClassTeacherAssignment.teacher_id
    ).filter(
        ClassTeacherAssignment.class_id == class_id,
        ClassTeacherAssignment.academic_year_id == academic_year.id,
        ClassTeacherAssignment.is_current.is_(True),
    ).first()
    if result is None:
        raise HTTPException(status_code=404, detail="No current teacher is assigned to this class")
    assignment, teacher = result
    return {
        "academic_year": academic_year,
        "assignment_id": assignment.id,
        "assignment_date": assignment.assignment_date,
        "teacher": TeacherOut.model_validate(teacher),
    }

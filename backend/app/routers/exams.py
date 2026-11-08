from datetime import date
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from backend.app.database import get_db
from backend.app.middleware.rbac import require_permission, require_roles
from backend.app.models import (
    AcademicYear,
    Class,
    ExamRecord,
    ExamSchedule,
    ExamType,
    Student,
    Subject,
    User,
    Attendance,
)
from backend.app.schemas import (
    ClassExamBroadsheetItem,
    ClassExamBroadsheetResponse,
    ExamRecordBulkCreate,
    ExamRecordCreate,
    ExamRecordOut,
    ExamRecordUpdate,
    ExamTypeCreate,
    ExamTypeOut,
    MessageResponse,
)

router = APIRouter(tags=["Exams & Marksheets"])


def _calculate_percentage(gained: float, total: int) -> float:
    if total <= 0:
        return 0.0
    return round((gained / total) * 100, 1)


def _calculate_grade(percentage: float) -> str:
    if percentage >= 80.0:
        return "A"
    elif percentage >= 60.0:
        return "B"
    elif percentage >= 40.0:
        return "C"
    else:
        return "F"


# Exam names in the database may exist in short ("1st Term") or long
# ("1st Term Examination") form.  Matching them exactly is what caused the
# marksheet to look empty for terms that had marks saved under the other name.
_EXAM_ALIASES = {
    "1st": ("1st", "first"),
    "2nd": ("2nd", "second"),
    "3rd": ("3rd", "third"),
    "final": ("final",),
    "midterm": ("midterm", "mid term", "mid-term", "mid"),
    "board": ("board",),
    "annual": ("annual",),
}


def _exam_term_key(name: str) -> str:
    s = (name or "").strip().lower()
    for canonical, needles in _EXAM_ALIASES.items():
        if any(needle in s for needle in needles):
            return canonical
    return s.replace(" examination", "").strip()


def _exam_aliases(name: str) -> List[str]:
    """Return every accepted spelling for an exam/term name."""
    s = (name or "").strip().lower()
    aliases = {s, s.replace(" examination", "").strip()}
    if s:
        aliases.add(f"{s} examination")
    key = _exam_term_key(s)
    for canonical, needles in _EXAM_ALIASES.items():
        if key == canonical:
            aliases.update(needles)
            aliases.add(canonical)
    aliases.discard("")
    return sorted(aliases)


def _filter_exam_type(column, exam_name: str):
    """SQLAlchemy filter matching any stored spelling of an exam name."""
    return func.lower(column).in_(_exam_aliases(exam_name))


def _current_academic_year(db: Session) -> AcademicYear:
    ay = (
        db.query(AcademicYear)
        .filter(AcademicYear.is_current.is_(True), AcademicYear.is_active.is_(True))
        .first()
    )
    if not ay:
        ay = db.query(AcademicYear).order_by(AcademicYear.id.desc()).first()
    if not ay:
        raise HTTPException(
            status_code=500, detail="No active academic year found in the system"
        )
    return ay


def _to_record_out(
    r: ExamRecord,
    student: Student,
    class_obj: Class,
    subject: Subject,
) -> ExamRecordOut:
    session = student.academic_year.year_name.split("-")[0] if student.academic_year else "2024"
    c_name = class_obj.name.replace("Class ", "").replace("Grade ", "").strip()
    sec = (class_obj.section or "A").upper()
    roll_num = student.roll_number or 1
    formatted_roll = f"{session}-{c_name}-{sec}-{roll_num:02d}"

    return ExamRecordOut(
        id=r.id,
        student_id=student.id,
        student_name=student.name,
        roll_number=student.roll_number,
        formatted_roll_number=formatted_roll,
        class_id=class_obj.id,
        class_name=f"{class_obj.name} - {class_obj.section}" if class_obj.section else class_obj.name,
        subject_id=subject.id,
        subject_name=subject.name,
        exam_type=r.exam_type,
        total_marks=r.total_marks,
        gained_marks=r.gained_marks or 0.0,
        percentage=r.percentage or 0.0,
        grade=r.grade or "F",
        exam_date=r.exam_date,
        remarks=r.remarks,
        academic_year_id=r.academic_year_id,
        created_at=r.created_at,
    )


# =========================================================================
# EXAM TYPES
# =========================================================================
@router.get("/exams/exam-types", response_model=List[ExamTypeOut])
@router.get("/exam-types", response_model=List[ExamTypeOut])
def list_exam_types(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("classes", "read")),
):
    """Retrieve all active exam terms / types."""
    types = db.query(ExamType).filter(ExamType.is_active.is_(True)).order_by(ExamType.id).all()
    if not types:
        for term_name, marks in [("1st Term", 50), ("Final Term", 100)]:
            db.add(ExamType(name=term_name, default_total_marks=marks, is_active=True))
        db.commit()
        types = db.query(ExamType).filter(ExamType.is_active.is_(True)).order_by(ExamType.id).all()
    return types


@router.post("/exams/exam-types", response_model=ExamTypeOut, status_code=status.HTTP_201_CREATED)
@router.post("/exam-types", response_model=ExamTypeOut, status_code=status.HTTP_201_CREATED)
def create_exam_type(
    payload: ExamTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    """Create a new exam term / type."""
    name_clean = payload.name.strip()
    existing = db.query(ExamType).filter(func.lower(ExamType.name) == name_clean.lower()).first()
    if existing:
        if not existing.is_active:
            existing.is_active = True
            existing.default_total_marks = payload.default_total_marks
            db.commit()
            db.refresh(existing)
            return existing
        raise HTTPException(status_code=409, detail=f"Exam type '{name_clean}' already exists")

    new_type = ExamType(name=name_clean, default_total_marks=payload.default_total_marks)
    db.add(new_type)
    db.commit()
    db.refresh(new_type)
    return new_type


@router.delete("/exams/exam-types")
@router.delete("/exam-types")
def delete_exam_type(
    name: str = Query(..., min_length=1),
    force: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    """Delete an exam term/type. With force=True its marks and schedules are removed too."""
    clean_name = name.strip()
    exam_type = (
        db.query(ExamType)
        .filter(
            or_(
                func.lower(ExamType.name) == clean_name.lower(),
                _filter_exam_type(ExamType.name, clean_name),
            )
        )
        .first()
    )

    target_name = exam_type.name if exam_type else clean_name

    record_count = (
        db.query(ExamRecord)
        .filter(_filter_exam_type(ExamRecord.exam_type, target_name))
        .count()
    )
    schedule_count = (
        db.query(ExamSchedule)
        .filter(_filter_exam_type(ExamSchedule.exam_name, target_name))
        .count()
    )

    if (record_count or schedule_count) and not force:
        raise HTTPException(
            status_code=400,
            detail=(
                f"'{target_name}' still has {record_count} marks record(s) and "
                f"{schedule_count} schedule(s). Confirm deletion to remove them."
            ),
        )

    deleted_records = 0
    deleted_schedules = 0
    if force:
        deleted_records = (
            db.query(ExamRecord)
            .filter(_filter_exam_type(ExamRecord.exam_type, target_name))
            .delete(synchronize_session=False)
        )
        deleted_schedules = (
            db.query(ExamSchedule)
            .filter(_filter_exam_type(ExamSchedule.exam_name, target_name))
            .delete(synchronize_session=False)
        )

    if exam_type:
        db.delete(exam_type)
    db.commit()

    return {
        "success": True,
        "message": f"Exam type '{target_name}' deleted successfully",
        "deleted_records": deleted_records,
        "deleted_schedules": deleted_schedules,
    }


# =========================================================================
# EXAM RECORDS (STUDENT MARKS)
# =========================================================================
@router.get("/exam-records", response_model=List[ExamRecordOut])
def list_exam_records(
    student_id: Optional[str] = Query(None),
    class_id: Optional[int] = Query(None),
    subject_id: Optional[int] = Query(None),
    exam_type: Optional[str] = Query(None),
    academic_year_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("classes", "read")),
):
    """Search and retrieve exam marks records."""
    query = (
        db.query(ExamRecord, Student, Class, Subject)
        .join(Student, ExamRecord.student_id == Student.id)
        .join(Class, ExamRecord.class_id == Class.id)
        .join(Subject, ExamRecord.subject_id == Subject.id)
    )

    if student_id:
        query = query.filter(ExamRecord.student_id == student_id)
    if class_id:
        query = query.filter(ExamRecord.class_id == class_id)
    if subject_id:
        query = query.filter(ExamRecord.subject_id == subject_id)
    if exam_type:
        query = query.filter(func.lower(ExamRecord.exam_type) == exam_type.strip().lower())
    if academic_year_id:
        query = query.filter(ExamRecord.academic_year_id == academic_year_id)

    records = query.order_by(ExamRecord.exam_date.desc(), Student.roll_number.asc()).all()
    return [_to_record_out(r, s, c, sub) for r, s, c, sub in records]


@router.post("/exam-records", response_model=ExamRecordOut, status_code=status.HTTP_201_CREATED)
def create_exam_record(
    payload: ExamRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    """Enter marks for a single student."""
    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    class_obj = db.query(Class).filter(Class.id == payload.class_id).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")

    subject = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    ay_id = payload.academic_year_id or student.academic_year_id or _current_academic_year(db).id

    total = payload.total_marks
    if not total:
        etype = db.query(ExamType).filter(func.lower(ExamType.name) == payload.exam_type.strip().lower()).first()
        total = etype.default_total_marks if etype else 100

    if payload.gained_marks > total:
        raise HTTPException(
            status_code=400,
            detail=f"Gained marks ({payload.gained_marks}) cannot exceed total marks ({total})",
        )

    percentage = _calculate_percentage(payload.gained_marks, total)
    grade = _calculate_grade(percentage)

    # Check existing
    existing = (
        db.query(ExamRecord)
        .filter(
            ExamRecord.student_id == payload.student_id,
            ExamRecord.exam_type == payload.exam_type.strip(),
            ExamRecord.subject_id == payload.subject_id,
            ExamRecord.academic_year_id == ay_id,
        )
        .first()
    )

    if existing:
        existing.gained_marks = payload.gained_marks
        existing.total_marks = total
        existing.percentage = percentage
        existing.grade = grade
        existing.exam_date = payload.exam_date or existing.exam_date
        existing.remarks = payload.remarks
        db.commit()
        db.refresh(existing)
        return _to_record_out(existing, student, class_obj, subject)

    new_record = ExamRecord(
        student_id=payload.student_id,
        class_id=payload.class_id,
        subject_id=payload.subject_id,
        exam_type=payload.exam_type.strip(),
        total_marks=total,
        gained_marks=payload.gained_marks,
        percentage=percentage,
        grade=grade,
        exam_date=payload.exam_date or date.today(),
        remarks=payload.remarks,
        academic_year_id=ay_id,
        created_by=current_user.id,
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    return _to_record_out(new_record, student, class_obj, subject)


@router.post("/exam-records/bulk", response_model=Dict[str, Any])
def bulk_create_exam_records(
    payload: ExamRecordBulkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    """Bulk enter or update exam scores for an entire class roster."""
    class_obj = db.query(Class).filter(Class.id == payload.class_id).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")

    subject = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    ay_id = payload.academic_year_id or _current_academic_year(db).id

    total = payload.total_marks
    if not total:
        etype = db.query(ExamType).filter(func.lower(ExamType.name) == payload.exam_type.strip().lower()).first()
        total = etype.default_total_marks if etype else 100

    exam_date = payload.exam_date or date.today()
    saved = 0
    updated = 0

    for item in payload.records:
        percentage = _calculate_percentage(item.gained_marks, total)
        grade = _calculate_grade(percentage)

        record = (
            db.query(ExamRecord)
            .filter(
                ExamRecord.student_id == item.student_id,
                ExamRecord.exam_type == payload.exam_type.strip(),
                ExamRecord.subject_id == payload.subject_id,
                ExamRecord.academic_year_id == ay_id,
            )
            .first()
        )

        if record:
            record.gained_marks = item.gained_marks
            record.total_marks = total
            record.percentage = percentage
            record.grade = grade
            record.exam_date = exam_date
            if item.remarks:
                record.remarks = item.remarks
            updated += 1
        else:
            db.add(
                ExamRecord(
                    student_id=item.student_id,
                    class_id=payload.class_id,
                    subject_id=payload.subject_id,
                    exam_type=payload.exam_type.strip(),
                    total_marks=total,
                    gained_marks=item.gained_marks,
                    percentage=percentage,
                    grade=grade,
                    exam_date=exam_date,
                    remarks=item.remarks,
                    academic_year_id=ay_id,
                    created_by=current_user.id,
                )
            )
            saved += 1

    db.commit()
    return {
        "success": True,
        "saved": saved,
        "updated": updated,
        "total": len(payload.records),
        "total_marks": total,
    }


@router.put("/exam-records/{record_id}", response_model=ExamRecordOut)
def update_exam_record(
    record_id: int,
    payload: ExamRecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    """Update single student marks and recalculate grade."""
    row = (
        db.query(ExamRecord, Student, Class, Subject)
        .join(Student, ExamRecord.student_id == Student.id)
        .join(Class, ExamRecord.class_id == Class.id)
        .join(Subject, ExamRecord.subject_id == Subject.id)
        .filter(ExamRecord.id == record_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Exam record not found")

    record, student, class_obj, subject = row

    if payload.total_marks is not None:
        record.total_marks = payload.total_marks
    if payload.gained_marks is not None:
        if payload.gained_marks > record.total_marks:
            raise HTTPException(
                status_code=400,
                detail=f"Gained marks cannot exceed total marks ({record.total_marks})",
            )
        record.gained_marks = payload.gained_marks

    record.percentage = _calculate_percentage(record.gained_marks, record.total_marks)
    record.grade = _calculate_grade(record.percentage)

    if payload.exam_date is not None:
        record.exam_date = payload.exam_date
    if payload.remarks is not None:
        record.remarks = payload.remarks

    db.commit()
    db.refresh(record)
    return _to_record_out(record, student, class_obj, subject)


@router.delete("/exam-records/{record_id}", response_model=MessageResponse)
def delete_exam_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    """Remove an exam marks entry."""
    record = db.query(ExamRecord).filter(ExamRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Exam record not found")

    db.delete(record)
    db.commit()
    return MessageResponse(message="Exam record deleted successfully")


# =========================================================================
# CLASS BROADSHEET & RESULTS REPORT
# =========================================================================
@router.get("/exam-records/class/{class_id}/{exam_type}", response_model=ClassExamBroadsheetResponse)
def get_class_broadsheet(
    class_id: int,
    exam_type: str,
    academic_year_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("classes", "read")),
):
    """Generate consolidated master broadsheet with subject-wise marks and class stats."""
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")

    ay = _current_academic_year(db) if academic_year_id is None else db.query(AcademicYear).filter(AcademicYear.id == academic_year_id).first()
    ay_id = ay.id if ay else 1

    # Get class subjects
    subjects = db.query(Subject).filter(Subject.class_id == class_id).order_by(Subject.name).all()
    subject_names = [s.name for s in subjects]
    subject_map = {s.id: s.name for s in subjects}

    # Get all active students in class
    students = (
        db.query(Student)
        .filter(Student.class_id == class_id, Student.is_active.is_(True))
        .order_by(Student.roll_number.asc())
        .all()
    )

    # Get all exam records for this class, exam type, and year
    records = (
        db.query(ExamRecord)
        .filter(
            ExamRecord.class_id == class_id,
            _filter_exam_type(ExamRecord.exam_type, exam_type),
            ExamRecord.academic_year_id == ay_id,
        )
        .all()
    )

    # Map records by (student_id, subject_id)
    records_by_student: Dict[str, Dict[int, ExamRecord]] = {}
    for r in records:
        if r.student_id not in records_by_student:
            records_by_student[r.student_id] = {}
        records_by_student[r.student_id][r.subject_id] = r

    broadsheet_students: List[ClassExamBroadsheetItem] = []
    class_percentages: List[float] = []
    grade_distribution = {"A": 0, "B": 0, "C": 0, "F": 0}

    for s in students:
        s_records = records_by_student.get(s.id, {})
        marks_by_subject: Dict[str, Any] = {}
        total_gained = 0.0
        total_possible = 0.0

        for sub in subjects:
            rec = s_records.get(sub.id)
            if rec:
                gained = rec.gained_marks or 0.0
                possible = sub.max_marks or rec.total_marks or 100
                marks_by_subject[sub.name] = {
                    "gained": gained,
                    "total": possible,
                    "percentage": rec.percentage or 0.0,
                    "grade": rec.grade or "F",
                }
                total_gained += gained
                total_possible += possible
            else:
                marks_by_subject[sub.name] = {
                    "gained": None,
                    "total": sub.max_marks or 100,
                    "percentage": None,
                    "grade": "N/A",
                }

        s_pct = round((total_gained / total_possible) * 100, 1) if total_possible > 0 else 0.0
        s_grade = _calculate_grade(s_pct) if total_possible > 0 else "N/A"

        if total_possible > 0:
            class_percentages.append(s_pct)
            if s_grade in grade_distribution:
                grade_distribution[s_grade] += 1

        session = s.academic_year.year_name.split("-")[0] if s.academic_year else "2024"
        c_short = class_obj.name.replace("Class ", "").replace("Grade ", "").strip()
        sec = (class_obj.section or "A").upper()
        formatted_roll = f"{session}-{c_short}-{sec}-{s.roll_number or 1:02d}"

        broadsheet_students.append(
            ClassExamBroadsheetItem(
                student_id=s.id,
                student_name=s.name,
                roll_number=s.roll_number,
                formatted_roll_number=formatted_roll,
                marks_by_subject=marks_by_subject,
                total_gained=total_gained,
                total_possible=total_possible,
                percentage=s_pct,
                overall_grade=s_grade,
            )
        )

    # Calculate statistics
    avg_pct = round(sum(class_percentages) / len(class_percentages), 1) if class_percentages else 0.0
    highest = max(class_percentages, default=0.0)
    lowest = min(class_percentages, default=0.0)
    passing_count = sum(1 for p in class_percentages if p >= 40.0)
    pass_pct = round((passing_count / len(class_percentages)) * 100, 1) if class_percentages else 0.0

    stats = {
        "class_average": avg_pct,
        "highest_score": highest,
        "lowest_score": lowest,
        "pass_percentage": pass_pct,
        "total_evaluated": len(class_percentages),
        "grade_distribution": grade_distribution,
    }

    class_title = f"{class_obj.name} - Section {class_obj.section}" if class_obj.section else class_obj.name
    return ClassExamBroadsheetResponse(
        class_id=class_obj.id,
        class_name=class_title,
        exam_type=exam_type,
        subjects=subject_names,
        students=broadsheet_students,
        statistics=stats,
    )


# =========================================================================
# MARKSHEET / TRANSCRIPT & COMPATIBILITY ENDPOINTS (FOR FRONTEND)
# =========================================================================
@router.get("/exams/marksheet")
def get_student_marksheet(
    student_id: str,
    term_id: str = Query("1st_term"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("classes", "read")),
):
    """Generate detailed individual student marksheet."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        student = db.query(Student).filter(Student.roll_number == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    class_obj = db.query(Class).filter(Class.id == student.class_id).first()
    ay = _current_academic_year(db)

    # Normalize term search
    term_search = (term_id or "1st_term").replace("_", " ").lower()
    etype = (
        db.query(ExamType)
        .filter(func.lower(ExamType.name).like(f"%{term_search[:3]}%"))
        .first()
    )
    exam_term_name = etype.name if etype else ("1st Term" if "1st" in term_search else "Final Term" if "final" in term_search else "2nd Term")

    # Fetch all subjects for this student's class
    class_subjects = (
        db.query(Subject)
        .filter(Subject.class_id == student.class_id)
        .order_by(Subject.id)
        .all()
    )
    # Do not fall back to arbitrary subjects from other classes. A marksheet
    # must reflect exactly the courses assigned to the student's class.

    # Fetch existing exam records for this student and selected term
    records = (
        db.query(ExamRecord)
        .filter(
            ExamRecord.student_id == student.id,
            func.lower(ExamRecord.exam_type).like(f"%{term_search[:3]}%"),
            ExamRecord.academic_year_id == ay.id,
        )
        .all()
    )
    rec_by_sub_id = {r.subject_id: r for r in records}
    rec_by_sub_name = {}
    for r in records:
        if r.subject:
            rec_by_sub_name[r.subject.name.lower().strip()] = r

    subjects_data = []
    total_gained = 0.0
    total_possible = 0.0
    total_pass = 0.0
    marked_count = 0
    seen_subject_ids = set()

    for sub in class_subjects:
        seen_subject_ids.add(sub.id)
        rec = rec_by_sub_id.get(sub.id) or rec_by_sub_name.get(sub.name.lower().strip())
        tot = int(sub.max_marks) if sub.max_marks else (int(rec.total_marks) if (rec and rec.total_marks) else 100)
        pass_m = round(tot * 0.33)

        if rec and rec.gained_marks is not None:
            g = float(rec.gained_marks)
            pct = rec.percentage or _calculate_percentage(g, tot)
            grd = rec.grade or _calculate_grade(pct)
            rmk = rec.remarks or ("Outstanding grasp of concepts" if pct >= 80 else "Good continuous progress" if pct >= 60 else "Needs Improvement")
            marked_count += 1
            has_score = True
        else:
            g = 0.0
            pct = 0.0
            grd = "-"
            rmk = "Assessment pending"
            has_score = False

        total_gained += g
        total_possible += tot
        total_pass += pass_m

        subjects_data.append({
            "subject": sub.name,
            "code": sub.code or f"SUB-{sub.id:02d}",
            "max": tot,
            "total_marks": tot,
            "pass": pass_m,
            "pass_marks": pass_m,
            "obtained": g if has_score else "-",
            "obtained_marks": g if has_score else 0,
            "percentage": pct if has_score else 0,
            "grade": grd,
            "remarks": rmk,
            "status": "PASS" if (has_score and g >= pass_m) else ("FAIL" if has_score else "PENDING"),
        })

    # Include any extra exam records that might belong to subjects not explicitly linked to class_id
    for r in records:
        if r.subject_id not in seen_subject_ids and r.subject:
            tot = int(r.subject.max_marks or r.total_marks or 100)
            pass_m = round(tot * 0.33)
            g = float(r.gained_marks or 0.0)
            pct = r.percentage or _calculate_percentage(g, tot)
            grd = r.grade or _calculate_grade(pct)
            rmk = r.remarks or ("Good continuous progress" if pct >= 60 else "Needs Improvement")
            total_gained += g
            total_possible += tot
            total_pass += pass_m
            marked_count += 1
            subjects_data.append({
                "subject": r.subject.name,
                "code": r.subject.code or f"SUB-{r.subject_id:02d}",
                "max": tot,
                "total_marks": tot,
                "pass": pass_m,
                "pass_marks": pass_m,
                "obtained": g,
                "obtained_marks": g,
                "percentage": pct,
                "grade": grd,
                "remarks": rmk,
                "status": "PASS" if g >= pass_m else "FAIL",
            })

    overall_pct = round((total_gained / total_possible) * 100, 1) if total_possible > 0 else 0.0
    overall_grade = _calculate_grade(overall_pct) if (total_possible > 0 and marked_count > 0) else ("Pending" if marked_count == 0 else _calculate_grade(overall_pct))

    # Calculate Class Position / Rank
    class_students = db.query(Student.id).filter(Student.class_id == student.class_id).all()
    class_student_ids = [s[0] for s in class_students]
    class_scores = (
        db.query(ExamRecord.student_id, func.sum(ExamRecord.gained_marks).label("total_score"))
        .filter(
            ExamRecord.student_id.in_(class_student_ids),
            func.lower(ExamRecord.exam_type).like(f"%{term_search[:3]}%"),
            ExamRecord.academic_year_id == ay.id,
        )
        .group_by(ExamRecord.student_id)
        .order_by(desc("total_score"))
        .all()
    )
    rank_suffix = {1: "1st Position", 2: "2nd Position", 3: "3rd Position"}
    student_rank = "1st Position"
    for idx, (st_id, _) in enumerate(class_scores, start=1):
        if st_id == student.id:
            student_rank = rank_suffix.get(idx, f"{idx}th Position")
            break

    # Attendance
    total_att = db.query(Attendance).filter(Attendance.student_id == student.id).count()
    present_att = (
        db.query(Attendance)
        .filter(Attendance.student_id == student.id, Attendance.status.in_(["present", "half-day"]))
        .count()
    )
    working_days = total_att if total_att > 0 else 65
    present_days = present_att if total_att > 0 else 60
    att_pct = round((present_days / working_days) * 100, 1)

    session = ay.year_name if ay else "2024-2025"
    c_name = class_obj.name.replace("Class ", "").replace("Grade ", "").strip() if class_obj else "1"
    sec = (class_obj.section or "A").upper() if class_obj else "A"
    formatted_roll = student.formatted_roll_number or f"{session.split('-')[0]}-{c_name}-{sec}-{student.roll_number or 1:02d}"

    remarks_text = (
        "Demonstrates exceptional academic diligence, analytical grasp, and exemplary classroom conduct. Strongly recommended for academic honors."
        if overall_pct >= 85
        else "Consistent learner with commendable conceptual clarity across curriculum. Encouraged to sustain active classroom participation."
        if overall_pct >= 70
        else "Steady academic engagement observed. Additional focus recommended in foundational numerical and written problem-solving."
        if overall_pct >= 50
        else "Needs focused teacher guidance, regular homework revision, and consistent attendance."
    )

    return {
        "student_id": student.id,
        "student_name": student.name,
        "roll_number": student.roll_number,
        "formatted_roll_number": formatted_roll,
        "class_name": class_obj.name if class_obj else "Class 1",
        "section": class_obj.section or "A" if class_obj else "A",
        "term_id": term_id,
        "term_name": exam_term_name,
        "academic_session": session,
        "subjects": subjects_data,
        "total_max": total_possible,
        "total_marks": total_possible,
        "total_pass": total_pass,
        "pass_marks": total_pass,
        "total_obtained": total_gained,
        "obtained_marks": total_gained,
        "percentage": overall_pct,
        "grade": overall_grade,
        "class_rank": student_rank,
        "attendance": {
            "present_days": present_days,
            "total_days": working_days,
            "percentage": att_pct,
        },
        "attendance_rate": att_pct,
        "teacher_remarks": remarks_text,
        "teacher_appraisal": remarks_text,
    }


@router.get("/exams/marks")
def get_subject_marks_dict(
    subject: Optional[str] = Query(None),
    term_id: Optional[str] = Query(None),
    class_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("classes", "read")),
):
    """Compatibility endpoint matching exams.js getSubjectMarks."""
    query = (
        db.query(ExamRecord, Student, Subject)
        .join(Student, ExamRecord.student_id == Student.id)
        .join(Subject, ExamRecord.subject_id == Subject.id)
    )
    if subject:
        query = query.filter(func.lower(Subject.name) == subject.strip().lower())
    if class_id:
        query = query.filter(ExamRecord.class_id == class_id)
    if term_id:
        term_clean = term_id.replace("_", " ").lower()
        query = query.filter(func.lower(ExamRecord.exam_type).like(f"%{term_clean[:3]}%"))

    result_dict = {}
    for rec, s, sub in query.all():
        key = f"{s.id}_{sub.name}"
        result_dict[key] = rec.gained_marks
    return result_dict


@router.post("/exams/marks")
def save_subject_marks_dict(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    """Compatibility endpoint matching exams.js saveSubjectMarks."""
    marks = payload.get("marks", {})
    term_id = payload.get("term_id") or "1st_term"
    term_clean = str(term_id).replace("_", " ").lower()

    etype = (
        db.query(ExamType)
        .filter(func.lower(ExamType.name).like(f"%{term_clean[:3]}%"))
        .first()
    )
    exam_term_name = etype.name if etype else ("1st Term" if "1st" in term_clean else "Final Term" if "final" in term_clean else "2nd Term")

    ay = _current_academic_year(db)
    saved_count = 0
    top_subject_name = payload.get("subject")

    for key, val in marks.items():
        if val is None or val == "":
            continue

        student = None
        subject_name = top_subject_name

        if key.startswith("STUD_"):
            parts = key.split("_", 2)
            cand_id = f"{parts[0]}_{parts[1]}"
            cand_sub = parts[2] if len(parts) > 2 else ""
        elif "_" in key:
            cand_id, _, cand_sub = key.partition("_")
        else:
            cand_id = key
            cand_sub = ""

        student = db.query(Student).filter((Student.id == cand_id) | (Student.roll_number == cand_id)).first()
        if not student:
            student = db.query(Student).filter(Student.id == key).first()

        if not student:
            continue

        if not subject_name or subject_name == "":
            subject_name = cand_sub

        if not subject_name:
            continue

        subject = (
            db.query(Subject)
            .filter(
                Subject.class_id == student.class_id,
                func.lower(Subject.name) == subject_name.strip().lower(),
            )
            .first()
        )
        if not subject:
            subject = (
                db.query(Subject)
                .filter(
                    Subject.class_id == student.class_id,
                    func.lower(Subject.name).like(f"%{subject_name.strip().lower()}%"),
                )
                .first()
            )
        if not subject:
            subject = db.query(Subject).filter(func.lower(Subject.name) == subject_name.strip().lower()).first()

        if not subject:
            continue

        obtained = float(val) if isinstance(val, (int, float)) else float(val.get("obtained", 0) if isinstance(val, dict) else 0)
        total = int(val.get("total", 100)) if isinstance(val, dict) else 100
        pct = _calculate_percentage(obtained, total)
        grade = _calculate_grade(pct)

        rec = (
            db.query(ExamRecord)
            .filter(
                ExamRecord.student_id == student.id,
                ExamRecord.subject_id == subject.id,
                ExamRecord.academic_year_id == ay.id,
                func.lower(ExamRecord.exam_type).like(f"%{term_clean[:3]}%"),
            )
            .first()
        )
        if rec:
            rec.gained_marks = obtained
            rec.total_marks = total
            rec.percentage = pct
            rec.grade = grade
            rec.exam_type = exam_term_name
            rec.remarks = ("Outstanding" if pct >= 85 else "Good continuous progress" if pct >= 60 else "Needs Improvement")
        else:
            rec = ExamRecord(
                student_id=student.id,
                class_id=student.class_id,
                subject_id=subject.id,
                exam_type=exam_term_name,
                total_marks=total,
                gained_marks=obtained,
                percentage=pct,
                grade=grade,
                remarks=("Outstanding" if pct >= 85 else "Good continuous progress" if pct >= 60 else "Needs Improvement"),
                exam_date=date.today(),
                academic_year_id=ay.id,
                created_by=current_user.id,
            )
            db.add(rec)
        saved_count += 1

    db.commit()
    return {"success": True, "count": saved_count}

# =========================================================================
# COMPATIBILITY WRAPPERS FOR EXAMS.JS

# =========================================================================
# DYNAMIC EXAM SCHEDULE & RESULTS ENDPOINTS
# =========================================================================

@router.get("/exams/schedules")
def get_exam_schedules(
    class_id: Optional[int] = Query(None),
    exam_name: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("classes", "read")),
):
    """Retrieve scheduled exams and subjects for a class."""
    q = db.query(ExamSchedule)
    if class_id:
        q = q.filter(ExamSchedule.class_id == class_id)
    if exam_name:
        q = q.filter(func.lower(ExamSchedule.exam_name) == exam_name.strip().lower())
    schedules = q.order_by(ExamSchedule.exam_date, ExamSchedule.start_time).all()

    # If empty and class_id requested, provide seeded initial schedule for 1st Term so it's not blank
    if not schedules and class_id:
        subs = db.query(Subject).filter(Subject.class_id == class_id).all()
        if not subs:
            subs = db.query(Subject).limit(5).all()
        dates = ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"]
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        ay = _current_academic_year(db)
        for idx, sub in enumerate(subs[:5]):
            d_str = dates[idx % len(dates)]
            new_s = ExamSchedule(
                class_id=class_id,
                exam_name="1st Term Examination",
                subject_name=sub.name,
                exam_date=date.fromisoformat(d_str),
                day=days[idx % len(days)],
                start_time="09:00 AM",
                end_time="12:00 PM",
                time_slot="09:00 AM - 12:00 PM",
                total_marks=100,
                academic_year_id=ay.id if ay else None,
            )
            db.add(new_s)
        db.commit()
        schedules = db.query(ExamSchedule).filter(ExamSchedule.class_id == class_id).all()

    return [
        {
            "id": s.id,
            "class_id": s.class_id,
            "exam_name": s.exam_name,
            "subject_name": s.subject_name,
            "date": s.exam_date.isoformat(),
            "day": s.day,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "time_slot": s.time_slot or f"{s.start_time} - {s.end_time}",
            "total_marks": s.total_marks,
        }
        for s in schedules
    ]


@router.post("/exams/schedules")
def save_exam_schedule(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    """Save an exam schedule with duplicate subject and time overlap constraint validation."""
    class_id = payload.get("class_id")
    exam_name = payload.get("exam_name", "").strip()
    subjects = payload.get("subjects", [])

    if not class_id or not exam_name:
        raise HTTPException(status_code=400, detail="Class and Exam Name are required.")
    if not subjects:
        raise HTTPException(status_code=400, detail="At least one subject must be added to the schedule.")

    # Constraint 1: No two subjects with same name
    seen_names = set()
    for sub in subjects:
        name_lower = sub.get("subject_name", "").strip().lower()
        if not name_lower:
            raise HTTPException(status_code=400, detail="Subject name cannot be empty.")
        if name_lower in seen_names:
            raise HTTPException(status_code=400, detail=f"Duplicate subject '{sub.get('subject_name')}'. Each subject must be unique.")
        seen_names.add(name_lower)

    # Helper to parse time strings like '09:00 AM', '12:00 PM' to minutes from midnight
    def parse_to_minutes(t_str):
        if not t_str: return 0
        try:
            t_clean = t_str.strip().upper()
            parts = t_clean.split()
            hm = parts[0].split(":")
            h = int(hm[0])
            m = int(hm[1]) if len(hm) > 1 else 0
            if len(parts) > 1:
                if parts[1] == "PM" and h < 12: h += 12
                elif parts[1] == "AM" and h == 12: h = 0
            return h * 60 + m
        except Exception:
            return 0

    # Constraint 2: No two subjects of a class should have exact same time or overlap in time on the same date
    by_date = {}
    for sub in subjects:
        d = sub.get("date")
        if not d:
            raise HTTPException(status_code=400, detail=f"Date is required for subject '{sub.get('subject_name')}'.")
        s_time = parse_to_minutes(sub.get("start_time", "09:00 AM"))
        e_time = parse_to_minutes(sub.get("end_time", "12:00 PM"))
        if e_time <= s_time:
            e_time = s_time + 180

        if d not in by_date:
            by_date[d] = []
        for other in by_date[d]:
            if not (e_time <= other["start"] or s_time >= other["end"]):
                raise HTTPException(
                    status_code=400,
                    detail=f"Time conflict on {d}: '{sub.get('subject_name')}' ({sub.get('start_time')}-{sub.get('end_time')}) overlaps with '{other['name']}' ({other['start_str']}-{other['end_str']})."
                )
        by_date[d].append({
            "name": sub.get("subject_name"),
            "start": s_time,
            "end": e_time,
            "start_str": sub.get("start_time"),
            "end_str": sub.get("end_time")
        })

    ay = _current_academic_year(db)

    # Remove existing schedule for this class and exam_name to allow updating
    db.query(ExamSchedule).filter(
        ExamSchedule.class_id == class_id,
        func.lower(ExamSchedule.exam_name) == exam_name.lower()
    ).delete()

    existing_subs = {s.name.lower(): s for s in db.query(Subject).filter(Subject.class_id == class_id).all()}

    for sub in subjects:
        s_name = sub.get("subject_name", "").strip()
        d_val = date.fromisoformat(sub.get("date"))
        day_val = sub.get("day") or d_val.strftime("%A")
        start_t = sub.get("start_time", "09:00 AM")
        end_t = sub.get("end_time", "12:00 PM")
        t_slot = f"{start_t} - {end_t}"
        tot_m = int(sub.get("total_marks", 100))

        if s_name.lower() not in existing_subs:
            new_subj = Subject(
                name=s_name,
                class_id=class_id,
            )
            db.add(new_subj)
            db.flush()
            existing_subs[s_name.lower()] = new_subj

        item = ExamSchedule(
            class_id=class_id,
            exam_name=exam_name,
            subject_name=s_name,
            exam_date=d_val,
            day=day_val,
            start_time=start_t,
            end_time=end_t,
            time_slot=t_slot,
            total_marks=tot_m,
            academic_year_id=ay.id if ay else None,
        )
        db.add(item)

    et = db.query(ExamType).filter(func.lower(ExamType.name) == exam_name.lower()).first()
    if not et:
        db.add(ExamType(name=exam_name, default_total_marks=100))

    db.commit()
    return {"success": True, "message": f"Exam schedule '{exam_name}' successfully saved."}


@router.delete("/exams/schedules")
def delete_exam_schedule(
    class_id: int = Query(...),
    exam_name: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    """Delete scheduled exam for a class."""
    db.query(ExamSchedule).filter(
        ExamSchedule.class_id == class_id,
        func.lower(ExamSchedule.exam_name) == exam_name.strip().lower()
    ).delete()
    db.commit()
    return {"success": True}


@router.get("/exams/class-exams")
def get_class_exams(
    class_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("classes", "read")),
):
    """Get list of available exam/term names for a class."""
    exam_types = db.query(ExamType.name).filter(ExamType.is_active.is_(True)).all()
    et_names = [e[0] for e in exam_types if e[0]]
    rec_names = db.query(ExamRecord.exam_type).filter(ExamRecord.class_id == class_id).distinct().all()
    existing_terms = [r[0] for r in rec_names if r[0]]
    sched_names = db.query(ExamSchedule.exam_name).filter(ExamSchedule.class_id == class_id).distinct().all()
    s_terms = [s[0] for s in sched_names if s[0]]

    all_found = et_names + s_terms + existing_terms
    if not all_found:
        all_found = ["1st Term", "Final Term"]

    # Collapse spellings such as "1st Term" / "1st Term Examination" so the
    # selector shows one term instead of two entries pointing at the same data.
    combined = []
    seen_keys = set()
    for name in all_found:
        if not name or not name.strip():
            continue
        clean = name.strip()
        key = _exam_term_key(clean)
        if key in seen_keys:
            continue
        seen_keys.add(key)
        combined.append(clean)
    return combined


@router.get("/exams/class-results")
def get_class_results(
    class_id: int = Query(...),
    exam_name: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("classes", "read")),
):
    """Get student roster, exam subjects, and marks ledger for a class and exam."""
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    ay = _current_academic_year(db)
    students = (
        db.query(Student)
        .filter(Student.class_id == class_id, Student.is_active.is_(True))
        .order_by(Student.roll_number)
        .all()
    )
    class_subs = db.query(Subject).filter(Subject.class_id == class_id).order_by(Subject.name).all()
    subjects = [
        {
            "id": s.id,
            "name": s.name,
            "max_marks": s.max_marks or 100,
            "total_marks": s.max_marks or 100,
        }
        for s in class_subs
    ]

    records = (
        db.query(ExamRecord, Subject)
        .join(Subject, ExamRecord.subject_id == Subject.id)
        .filter(
            ExamRecord.class_id == class_id,
            _filter_exam_type(ExamRecord.exam_type, exam_name),
            ExamRecord.academic_year_id == ay.id,
        )
        .all()
    )
    marks_dict = {}
    for rec, sub in records:
        marks_dict[f"{rec.student_id}_{sub.name}"] = rec.gained_marks

    return {
        "class_name": class_obj.name if class_obj else f"Class {class_id}",
        "section": class_obj.section if class_obj else "A",
        "exam_name": exam_name,
        "students": [
            {
                "id": st.id,
                "name": st.name,
                "roll_number": st.roll_number,
                "formatted_roll_number": getattr(st, "formatted_roll_number", None) or str(st.roll_number),
                "parent_name": getattr(st, "parent_name", None) or getattr(st, "father_name", None) or "N/A",
            }
            for st in students
        ],
        "subjects": subjects,
        "marks": marks_dict,
    }


@router.post("/exams/class-results")
def save_class_results(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    """Save/update marks for students and subjects in an exam."""
    class_id = payload.get("class_id")
    exam_name = payload.get("exam_name", "").strip()
    marks = payload.get("marks", {})
    ay = _current_academic_year(db)
    saved_count = 0

    class_students = (
        db.query(Student).filter(Student.class_id == class_id).all()
        if class_id
        else db.query(Student).all()
    )
    students_by_id = {str(st.id): st for st in class_students}

    for key, val in marks.items():
        if val is None or val == "":
            continue
        key_str = str(key)
        student = None
        sub_name = ""

        if "::" in key_str:
            cand_id, _, sub_name = key_str.partition("::")
            student = students_by_id.get(cand_id)
        else:
            # Prefer the longest matching student id so ids such as
            # "STUD_0001" are not split at their internal underscore.
            for st in sorted(class_students, key=lambda x: len(str(x.id)), reverse=True):
                prefix = f"{st.id}_"
                if key_str.startswith(prefix):
                    student = st
                    sub_name = key_str[len(prefix):]
                    break
            if not student and "_" in key_str:
                cand_id, _, sub_name = key_str.rpartition("_")
                student = students_by_id.get(cand_id)
                if not student and str(cand_id).isdigit():
                    student = next(
                        (st for st in class_students if st.roll_number == int(cand_id)),
                        None,
                    )
        if not student:
            continue

        subject = (
            db.query(Subject)
            .filter(Subject.class_id == student.class_id, func.lower(Subject.name) == sub_name.strip().lower())
            .first()
        )
        if not subject:
            # Never create ad-hoc subjects here: a marksheet must only use
            # courses that are actually assigned to the class.
            continue

        obtained_raw = val.get("obtained", 0) if isinstance(val, dict) else val
        try:
            obtained_num = float(obtained_raw)
        except (TypeError, ValueError):
            continue
        if not obtained_num.is_integer():
            raise HTTPException(
                status_code=400,
                detail=f"Marks for '{sub_name}' must be a whole number (no decimals).",
            )
        obtained = int(obtained_num)
        # Check if total marks is configured in ExamSchedule
        sched_sub = (
            db.query(ExamSchedule.total_marks)
            .filter(
                ExamSchedule.class_id == student.class_id,
                _filter_exam_type(ExamSchedule.exam_name, exam_name),
                func.lower(ExamSchedule.subject_name) == sub_name.strip().lower()
            )
            .first()
        )
        total = subject.max_marks or (sched_sub[0] if (sched_sub and sched_sub[0]) else 100)
        if obtained < 0 or obtained > total:
            raise HTTPException(
                status_code=400,
                detail=f"Marks for '{sub_name}' must be between 0 and {total}.",
            )
        pct = _calculate_percentage(obtained, total)
        grade = _calculate_grade(pct)

        existing_records = (
            db.query(ExamRecord)
            .filter(
                ExamRecord.student_id == student.id,
                ExamRecord.subject_id == subject.id,
                _filter_exam_type(ExamRecord.exam_type, exam_name),
                ExamRecord.academic_year_id == ay.id,
            )
            .order_by(ExamRecord.id)
            .all()
        )
        rec = existing_records[0] if existing_records else None
        for duplicate in existing_records[1:]:
            db.delete(duplicate)

        if rec:
            rec.gained_marks = obtained
            rec.total_marks = total
            rec.percentage = pct
            rec.grade = grade
        else:
            rec = ExamRecord(
                student_id=student.id,
                class_id=student.class_id,
                subject_id=subject.id,
                exam_type=exam_name,
                total_marks=total,
                gained_marks=obtained,
                percentage=pct,
                grade=grade,
                exam_date=date.today(),
                academic_year_id=ay.id,
                created_by=current_user.id,
            )
            db.add(rec)
        saved_count += 1

    db.commit()
    return {"success": True, "saved_count": saved_count}



@router.get("/exams/class-merit-list")
def get_class_merit_list(
    class_id: int = Query(...),
    exam_name: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    """Return consolidated class merit list with 1st, 2nd, 3rd positions calculated."""
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    ay = _current_academic_year(db)
    students = (
        db.query(Student)
        .filter(Student.class_id == class_id, Student.is_active.is_(True))
        .order_by(Student.roll_number)
        .all()
    )
    # Use exactly the courses assigned to this class. Never seed defaults:
    # doing so used to hide the real class curriculum behind 6 generic names.
    subs = (
        db.query(Subject)
        .filter(Subject.class_id == class_id)
        .order_by(Subject.name)
        .all()
    )

    # Query all exam records for this class & exam
    records = (
        db.query(ExamRecord, Subject)
        .join(Subject, ExamRecord.subject_id == Subject.id)
        .filter(
            ExamRecord.class_id == class_id,
            _filter_exam_type(ExamRecord.exam_type, exam_name),
            ExamRecord.academic_year_id == ay.id,
        )
        .all()
    )
    marks_by_student = {}
    for rec, sub in records:
        if rec.student_id not in marks_by_student:
            marks_by_student[rec.student_id] = {}
        marks_by_student[rec.student_id][sub.name] = rec.gained_marks

    total_possible_marks = sum((s.max_marks or 100) for s in subs)
    student_totals = []

    for st in students:
        st_marks = marks_by_student.get(st.id, {})
        has_any_mark = False
        tot_obt = 0.0
        subject_breakdown = {}

        for s in subs:
            val = st_marks.get(s.name)
            if val is not None:
                has_any_mark = True
                tot_obt += float(val)
                subject_breakdown[s.name] = float(val)
            else:
                subject_breakdown[s.name] = "-"

        pct = round((tot_obt / total_possible_marks) * 100, 1) if total_possible_marks > 0 else 0.0
        grd = _calculate_grade(pct) if has_any_mark else "-"

        student_totals.append({
            "student_id": st.id,
            "name": st.name,
            "student_name": st.name,
            "roll_number": st.roll_number,
            "formatted_roll_number": getattr(st, "formatted_roll_number", None) or str(st.roll_number),
            "father_name": getattr(st, "parent_name", None) or getattr(st, "father_name", None) or "N/A",
            "subject_marks": subject_breakdown,
            "total_max": total_possible_marks,
            "total_obtained": tot_obt if has_any_mark else "-",
            "percentage": f"{pct}%" if has_any_mark else "-",
            "percentage_num": pct if has_any_mark else -1,
            "grade": grd,
            "has_marks": has_any_mark,
            "status": "PASS" if (has_any_mark and grd != "F") else ("FAIL" if has_any_mark else "-"),
        })

    # Sort students with marks descending by percentage/obtained marks for position rank
    students_with_marks = [s for s in student_totals if s["has_marks"]]
    students_without_marks = [s for s in student_totals if not s["has_marks"]]

    students_with_marks.sort(key=lambda x: (x["percentage_num"], x["total_obtained"]), reverse=True)

    ranked_list = []
    current_rank = 1
    for idx, s in enumerate(students_with_marks):
        if idx > 0:
            prev = students_with_marks[idx - 1]
            if s["percentage_num"] < prev["percentage_num"]:
                current_rank = idx + 1

        if current_rank == 1:
            badge = "1st Position"
            badge_type = "first"
        elif current_rank == 2:
            badge = "2nd Position"
            badge_type = "second"
        elif current_rank == 3:
            badge = "3rd Position"
            badge_type = "third"
        else:
            badge = f"Rank #{current_rank}"
            badge_type = "standard"

        s["rank"] = current_rank
        s["position_badge"] = badge
        s["badge_type"] = badge_type
        ranked_list.append(s)

    for s in students_without_marks:
        s["rank"] = "-"
        s["position_badge"] = "Not Graded"
        s["badge_type"] = "none"
        ranked_list.append(s)

    return {
        "class_name": class_obj.name if class_obj else f"Class {class_id}",
        "section": class_obj.section if class_obj else "A",
        "exam_name": exam_name,
        "subjects": [{"id": s.id, "name": s.name, "max_marks": s.max_marks or 100, "total_marks": s.max_marks or 100} for s in subs],
        "merit_list": ranked_list,
    }


@router.get("/exams/simplified-marksheet")
def get_simplified_marksheet(
    student_id: str = Query(...),
    exam_name: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("classes", "read")),
):
    """Return clean simplified student marksheet."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        student = db.query(Student).filter(Student.roll_number == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    class_obj = db.query(Class).filter(Class.id == student.class_id).first()
    ay = _current_academic_year(db)

    subs = db.query(Subject).filter(Subject.class_id == student.class_id).order_by(Subject.name).all()
    subject_names = [s.name for s in subs]
    subject_by_name = {s.name.lower().strip(): s for s in subs}

    records = (
        db.query(ExamRecord, Subject)
        .join(Subject, ExamRecord.subject_id == Subject.id)
        .filter(
            ExamRecord.student_id == student.id,
            _filter_exam_type(ExamRecord.exam_type, exam_name),
            ExamRecord.academic_year_id == ay.id,
        )
        .all()
    )
    rec_map = {sub.name.lower().strip(): rec for rec, sub in records}

    subjects_data = []
    total_max = 0
    total_obtained = 0.0
    marked_count = 0

    for idx, s_name in enumerate(subject_names, start=1):
        rec = rec_map.get(s_name.lower().strip())
        subj = subject_by_name.get(s_name.lower().strip())
        max_m = (subj.max_marks if subj and subj.max_marks else None) or (rec.total_marks if (rec and rec.total_marks) else 100)
        total_max += max_m
        if rec and rec.gained_marks is not None:
            obt = float(rec.gained_marks)
            total_obtained += obt
            marked_count += 1
            pct = rec.percentage or _calculate_percentage(obt, max_m)
            grd = rec.grade or _calculate_grade(pct)
            display_obt = obt
        else:
            display_obt = "-"
            pct = 0
            grd = "-"

        subjects_data.append({
            "sr": idx,
            "subject": s_name,
            "max_marks": max_m,
            "obtained_marks": display_obt,
            "percentage": f"{pct}%" if display_obt != "-" else "-",
            "grade": grd,
        })

    overall_pct = round((total_obtained / total_max) * 100, 1) if total_max > 0 else 0.0
    overall_grade = _calculate_grade(overall_pct) if (total_max > 0 and marked_count > 0) else "-"

    
    # Calculate rank and position badge
    position_badge = None
    rank_num = None
    if student.class_id:
        try:
            class_merit = get_class_merit_list(class_id=student.class_id, exam_name=exam_name, db=db, current_user=current_user)
            for st_item in class_merit.get("merit_list", []):
                if str(st_item.get("student_id")) == str(student.id):
                    r = st_item.get("rank")
                    if r in [1, 2, 3]:
                        rank_num = r
                        position_badge = st_item.get("position_badge")
                    break
        except Exception:
            pass
    return {
        "student_name": student.name,
        "roll_number": getattr(student, "formatted_roll_number", None) or str(student.roll_number),
        "class_name": class_obj.name if class_obj else "Class",
        "section": class_obj.section or "A" if class_obj else "A",
        "father_name": getattr(student, "parent_name", None) or getattr(student, "father_name", None) or "N/A",
        "exam_name": exam_name,
        "academic_session": ay.year_name if ay else "2024-2025",
        "subjects": subjects_data,
        "total_max": total_max,
        "total_obtained": total_obtained if marked_count > 0 else "-",
        "percentage": f"{overall_pct}%" if marked_count > 0 else "-",
        "rank": rank_num,
        "position_badge": position_badge,
        "grade": overall_grade,
    }



# =========================================================================
@router.get("/exams")
def list_exams_summary(
    class_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("classes", "read")),
):
    """Retrieve exams list summarized by active classes and exam terms."""
    classes = db.query(Class).filter(Class.is_active.is_(True))
    if class_id:
        classes = classes.filter(Class.id == class_id)
    exam_types = db.query(ExamType).filter(ExamType.is_active.is_(True)).all()

    items = []
    for c in classes.order_by(Class.name, Class.section).all():
        student_count = db.query(Student).filter(Student.class_id == c.id, Student.is_active.is_(True)).count()
        for et in exam_types:
            records_count = (
                db.query(ExamRecord.student_id)
                .filter(ExamRecord.class_id == c.id, func.lower(ExamRecord.exam_type) == et.name.lower())
                .distinct()
                .count()
            )
            items.append({
                "id": c.id * 100 + et.id,
                "name": f"{et.name} Examination",
                "exam_type": et.name,
                "class_id": c.id,
                "class_name": f"{c.name} - Sec {c.section}" if c.section else c.name,
                "exam_date": "2025-02-15" if "2nd" in et.name or "Mid" in et.name else "2025-03-25",
                "total_marks": et.default_total_marks,
                "passing_marks": int(et.default_total_marks * 0.4),
                "students_marked": records_count,
                "total_students": student_count,
            })
    return {"items": items, "total": len(items)}


@router.get("/exams/datesheets")
def get_datesheets(
    term_id: Optional[str] = Query(None),
    class_name: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("classes", "read")),
):
    classes = db.query(Class).filter(Class.is_active.is_(True))
    if class_name:
        classes = classes.filter(func.lower(Class.name) == class_name.strip().lower())

    results = []
    days = ["2025-02-15", "2025-02-17", "2025-02-19", "2025-02-21", "2025-02-23"]
    times = ["09:00 AM - 12:00 PM", "09:00 AM - 11:30 AM"]

    for c in classes.all():
        subjects = db.query(Subject).filter(Subject.class_id == c.id).limit(5).all()
        for idx, sub in enumerate(subjects):
            results.append({
                "id": c.id * 100 + sub.id,
                "term_id": term_id or "2nd_term",
                "class_id": c.id,
                "class_name": c.name,
                "section": c.section or "A",
                "subject": sub.name,
                "exam_date": days[idx % len(days)],
                "time": times[idx % len(times)],
                "room": f"Room {101 + idx}",
                "total_marks": 100 if "9" in c.name or "10" in c.name else 50,
                "isBoardCandidate": "9" in c.name or "10" in c.name,
            })
    return results


@router.post("/exams/datesheets")
def create_datesheet_entry(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    import time
    c_name = payload.get("class_name", "").strip()
    sec = payload.get("section", "A").strip()
    sub_name = payload.get("subject", "").strip()
    e_date = payload.get("date")
    term = payload.get("term_id", "1st_term")
    time_slot = payload.get("time", "09:00 AM - 11:30 AM")
    total_marks = payload.get("total_marks", 100)
    room = payload.get("room", "Room 101")

    return {
        "id": int(time.time() * 1000) % 100000000,
        "term_id": term,
        "class_name": c_name,
        "section": sec,
        "subject": sub_name,
        "exam_date": e_date,
        "date": e_date,
        "time": time_slot,
        "total_marks": total_marks,
        "room": room,
        "isBoardCandidate": "9" in c_name or "10" in c_name,
    }


@router.get("/exams/{exam_id}")
def get_exam_by_id(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("classes", "read")),
):
    class_id = exam_id // 100
    c = db.query(Class).filter(Class.id == class_id).first()
    return {
        "id": exam_id,
        "name": "Examination",
        "class_id": class_id if c else 1,
        "class_name": f"{c.name} - {c.section}" if c and c.section else "Class 1-A",
        "total_marks": 100,
        "passing_marks": 40,
    }


@router.post("/exams/{exam_id}/marks")
def submit_exam_marks_for_class(
    exam_id: int,
    payload: Any,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    ay = _current_academic_year(db)
    items = payload if isinstance(payload, list) else payload.get("marks", [payload]) if isinstance(payload, dict) else []
    saved = 0
    for m in items:
        student_id = m.get("student_id")
        subject_id = m.get("subject_id")
        marks = float(m.get("marks", m.get("gained_marks", 0)))
        total = int(m.get("total_marks", 100))
        if not student_id or not subject_id:
            continue
        pct = _calculate_percentage(marks, total)
        grade = _calculate_grade(pct)

        rec = (
            db.query(ExamRecord)
            .filter(
                ExamRecord.student_id == student_id,
                ExamRecord.subject_id == subject_id,
                ExamRecord.academic_year_id == ay.id,
            )
            .first()
        )
        if rec:
            rec.gained_marks = marks
            rec.total_marks = total
            rec.percentage = pct
            rec.grade = grade
        else:
            std = db.query(Student).filter(Student.id == student_id).first()
            if not std:
                continue
            db.add(
                ExamRecord(
                    student_id=student_id,
                    class_id=std.class_id,
                    subject_id=subject_id,
                    exam_type="2nd Term",
                    total_marks=total,
                    gained_marks=marks,
                    percentage=pct,
                    grade=grade,
                    exam_date=date.today(),
                    academic_year_id=ay.id,
                    created_by=current_user.id,
                )
            )
        saved += 1
    db.commit()
    return {"success": True, "count": saved}


@router.get("/exams/{exam_id}/results")
def get_exam_results(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("classes", "read")),
):
    class_id = exam_id // 100
    c = db.query(Class).filter(Class.id == class_id).first()
    records = db.query(ExamRecord).filter(ExamRecord.class_id == class_id).all()
    return {
        "exam": {
            "id": exam_id,
            "name": f"{c.name if c else 'Class'} Examination",
        },
        "results": [
            {
                "id": r.id,
                "student_id": r.student_id,
                "subject_id": r.subject_id,
                "marks": r.gained_marks,
                "total_marks": r.total_marks,
                "grade": r.grade,
            }
            for r in records
        ],
    }


@router.get("/exams/student/{student_id}/performance")
def get_student_performance(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("classes", "read")),
):
    records = (
        db.query(ExamRecord, Subject)
        .join(Subject, ExamRecord.subject_id == Subject.id)
        .filter(ExamRecord.student_id == student_id)
        .all()
    )
    return [
        {
            "id": rec.id,
            "student_id": rec.student_id,
            "subject": sub.name,
            "marks": rec.gained_marks,
            "total_marks": rec.total_marks,
            "percentage": rec.percentage,
            "grade": rec.grade,
            "exam_type": rec.exam_type,
        }
        for rec, sub in records
    ]


from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.models import (
    AcademicYear,
    Attendance,
    Class,
    ClassRollSequence,
    ExamRecord,
    Student,
)
from backend.app.crud import create_audit_log


def check_student_promotion_eligibility(
    db: Session,
    student_id: str,
    academic_year_id: int,
    min_attendance: float = 75.0,
    min_marks: float = 40.0,
) -> Tuple[bool, float, float, str]:
    """
    Check if a student meets promotion criteria:
    - Attendance >= min_attendance (if attendance records exist)
    - Exam average marks >= min_marks (if exam records exist)
    """
    # 1. Attendance check
    att_query = db.query(Attendance).filter(Attendance.student_id == student_id)
    total_att = att_query.count()
    if total_att > 0:
        present_count = att_query.filter(Attendance.status.in_(["present", "half-day"])).count()
        att_percentage = round((present_count / total_att) * 100, 1)
    else:
        # If no attendance records found for this year, don't penalize
        att_percentage = 100.0

    # 2. Exam records check
    exam_query = db.query(ExamRecord).filter(
        ExamRecord.student_id == student_id,
        ExamRecord.academic_year_id == academic_year_id,
    )
    exam_records = exam_query.all()
    if exam_records:
        percentages = [r.percentage or 0.0 for r in exam_records]
        exam_average = round(sum(percentages) / max(len(percentages), 1), 1)
        has_failing_grade = any((r.grade or "").strip().upper() == "F" for r in exam_records)
    else:
        # If no exam records, don't penalize
        exam_average = 100.0
        has_failing_grade = False

    reasons = []
    if att_percentage < min_attendance:
        reasons.append(f"Low attendance ({att_percentage}% < {min_attendance}%)")
    if exam_average < min_marks:
        reasons.append(f"Low exam score ({exam_average}% < {min_marks}%)")
    elif has_failing_grade:
        reasons.append("Failed in one or more subjects")

    is_eligible = len(reasons) == 0
    reason_str = ", ".join(reasons) if reasons else "Eligible for promotion"
    return is_eligible, att_percentage, exam_average, reason_str


def preview_promotion(
    db: Session,
    from_year_id: int,
    to_year_id: int,
    promotion_mapping: Dict[int, Optional[int]],
    min_attendance: float = 75.0,
    min_marks: float = 40.0,
    class_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Generate a preview of the promotion cycle without making database mutations.
    """
    from_year = db.query(AcademicYear).filter(AcademicYear.id == from_year_id).first()
    to_year = db.query(AcademicYear).filter(AcademicYear.id == to_year_id).first()
    if not from_year:
        raise ValueError(f"Origin academic year {from_year_id} not found")
    if not to_year:
        raise ValueError(f"Destination academic year {to_year_id} not found")

    classes_by_id = {c.id: c for c in db.query(Class).all()}

    query = db.query(Student).filter(
        Student.academic_year_id == from_year_id,
        Student.is_active.is_(True),
    )
    if class_id is not None:
        query = query.filter(Student.class_id == class_id)

    students = query.order_by(Student.class_id, Student.roll_number, Student.name).all()

    eligible_count = 0
    failed_count = 0
    graduated_count = 0
    student_previews = []

    for s in students:
        if s.class_id not in promotion_mapping:
            continue
        target_class_id = promotion_mapping.get(s.class_id)
        current_class = classes_by_id.get(s.class_id)
        c_label = f"{current_class.name}-{current_class.section}" if current_class and current_class.section else (current_class.name if current_class else "Unassigned")

        if target_class_id is None:
            # Student is graduating
            graduated_count += 1
            action = "graduate"
            new_c_label = "Graduated / Alumni"
            is_eligible = True
            att_pct = 100.0
            exam_avg = 100.0
            reason = "Reached terminal grade (graduated)"
        else:
            target_class = classes_by_id.get(target_class_id)
            new_c_label = f"{target_class.name}-{target_class.section}" if target_class and target_class.section else (target_class.name if target_class else f"Class {target_class_id}")
            is_eligible, att_pct, exam_avg, reason = check_student_promotion_eligibility(
                db, s.id, from_year_id, min_attendance=min_attendance, min_marks=min_marks
            )
            if is_eligible:
                eligible_count += 1
                action = "promote"
            else:
                failed_count += 1
                action = "repeat"
                new_c_label = f"{c_label} (Repeat)"

        year_str = from_year.year_name
        sess = year_str.split("-")[0] if "-" in year_str else year_str
        sec = (current_class.section if current_class and current_class.section else "A").upper()
        c_raw = (current_class.name if current_class else "10").replace("Grade ", "").replace("Class ", "").strip()
        formatted_roll = f"{sess}-{c_raw}-{sec}-{(s.roll_number or 1):02d}"

        student_previews.append(
            {
                "student_id": s.id,
                "name": s.name,
                "roll_number": s.roll_number,
                "formatted_roll_number": formatted_roll,
                "current_class_id": s.class_id,
                "current_class_name": c_label,
                "new_class_id": target_class_id if action == "promote" else (s.class_id if action == "repeat" else None),
                "new_class_name": new_c_label,
                "attendance_percentage": att_pct,
                "exam_average": exam_avg,
                "eligible": is_eligible,
                "action": action,
                "reason": reason,
            }
        )

    return {
        "from_academic_year_id": from_year.id,
        "from_academic_year_name": from_year.year_name,
        "to_academic_year_id": to_year.id,
        "to_academic_year_name": to_year.year_name,
        "total_students": len(students),
        "eligible_for_promotion": eligible_count,
        "failed_students": failed_count,
        "graduating": graduated_count,
        "promotion_mapping": promotion_mapping,
        "students": student_previews,
    }


def execute_promotion(
    db: Session,
    user_id: int,
    from_year_id: int,
    to_year_id: int,
    promotion_mapping: Dict[int, Optional[int]],
    min_attendance: float = 75.0,
    min_marks: float = 40.0,
    student_overrides: Optional[Dict[str, str]] = None,
    make_destination_current: bool = False,
    class_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Execute student promotion:
    1. Evaluates eligibility or applies admin overrides
    2. Advances students to new class & academic year (or graduates them)
    3. Resequences roll numbers alphabetically per class in the new academic year
    4. Logs audit entry
    """
    if student_overrides is None:
        student_overrides = {}

    from_year = db.query(AcademicYear).filter(AcademicYear.id == from_year_id).first()
    to_year = db.query(AcademicYear).filter(AcademicYear.id == to_year_id).first()
    if not from_year or not to_year:
        raise ValueError("Invalid academic year IDs provided")

    query = db.query(Student).filter(
        Student.academic_year_id == from_year_id,
        Student.is_active.is_(True),
    )
    if class_id is not None:
        query = query.filter(Student.class_id == class_id)

    students = query.all()

    promoted_students = []
    repeated_students = []
    graduated_students = []
    errors = []

    # Map of classes affected in destination year
    target_classes_to_resequence = set()

    for s in students:
        if s.class_id not in promotion_mapping:
            continue
        try:
            # Check override or determine action
            override_action = student_overrides.get(s.id)
            target_class_id = promotion_mapping.get(s.class_id)

            if override_action:
                action = override_action
            elif target_class_id is None:
                action = "graduate"
            else:
                is_eligible, _, _, _ = check_student_promotion_eligibility(
                    db, s.id, from_year_id, min_attendance, min_marks
                )
                action = "promote" if is_eligible else "repeat"

            if action == "graduate":
                s.is_active = False
                s.notes = (f"{s.notes or ''}\nGraduated at end of {from_year.year_name}").strip()
                graduated_students.append(s.id)
            elif action == "promote":
                if target_class_id is None:
                    s.is_active = False
                    graduated_students.append(s.id)
                else:
                    s.class_id = target_class_id
                    s.academic_year_id = to_year_id
                    s.roll_number = None  # Temporary until resequenced
                    promoted_students.append(s.id)
                    target_classes_to_resequence.add(target_class_id)
            elif action == "repeat":
                # Repeats in same class in the new year
                s.academic_year_id = to_year_id
                s.roll_number = None
                repeated_students.append(s.id)
                target_classes_to_resequence.add(s.class_id)

        except Exception as e:
            errors.append({"student_id": s.id, "error": str(e)})

    db.flush()

    # Resequence roll numbers for each affected class in to_year_id without unique collisions
    for class_id in target_classes_to_resequence:
        class_students = (
            db.query(Student)
            .filter(
                Student.class_id == class_id,
                Student.academic_year_id == to_year_id,
                Student.is_active.is_(True),
            )
            .order_by(Student.name.asc())
            .all()
        )
        # Pass 1: Assign distinct negative numbers to eliminate unique collisions
        for idx, cs in enumerate(class_students, start=1):
            cs.roll_number = -idx
        db.flush()

        # Pass 2: Assign final sequential roll numbers
        for idx, cs in enumerate(class_students, start=1):
            cs.roll_number = idx
        db.flush()

        # Update or create ClassRollSequence
        seq_record = (
            db.query(ClassRollSequence)
            .filter(
                ClassRollSequence.class_id == class_id,
                ClassRollSequence.academic_year_id == to_year_id,
            )
            .first()
        )
        next_val = len(class_students) + 1
        if seq_record is None:
            db.add(
                ClassRollSequence(
                    class_id=class_id,
                    academic_year_id=to_year_id,
                    next_roll_number=next_val,
                )
            )
        else:
            seq_record.next_roll_number = next_val

    if make_destination_current:
        db.query(AcademicYear).filter(AcademicYear.is_current.is_(True)).update(
            {"is_current": False}, synchronize_session=False
        )
        to_year.is_current = True

    # Audit log
    create_audit_log(
        db,
        user_id=user_id,
        action="STUDENT_PROMOTION",
        table_name="students",
        record_id=f"promo_{from_year_id}_to_{to_year_id}",
        new_values=(
            f'{{"promoted": {len(promoted_students)}, '
            f'"repeated": {len(repeated_students)}, '
            f'"graduated": {len(graduated_students)}}}'
        ),
    )

    db.commit()

    return {
        "success": True,
        "from_academic_year_name": from_year.year_name,
        "to_academic_year_name": to_year.year_name,
        "total_processed": len(students),
        "promoted": len(promoted_students),
        "failed": len(repeated_students),
        "graduated": len(graduated_students),
        "errors": errors,
    }

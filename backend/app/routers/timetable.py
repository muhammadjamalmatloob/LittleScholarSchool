from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_

from backend.app.database import get_db
from backend.app.middleware.rbac import require_roles
from backend.app.models import (
    AcademicYear,
    Class,
    ClassTeacherAssignment,
    Subject,
    Teacher,
    Timetable,
    User,
)
from backend.app.schemas import (
    TimetableCreate,
    TimetableOut,
    TimetableUpdate,
)

router = APIRouter(prefix="/timetable", tags=["Timetable & Scheduling"])

PERIOD_TIMES = {
    1: ("08:00 AM", "08:45 AM"),
    2: ("08:45 AM", "09:30 AM"),
    3: ("09:30 AM", "10:15 AM"),
    4: ("10:45 AM", "11:30 AM"),
    5: ("11:30 AM", "12:15 PM"),
    6: ("12:15 PM", "01:00 PM"),
}

FRIDAY_PERIOD_TIMES = {
    1: ("08:00 AM", "08:45 AM"),
    2: ("08:45 AM", "09:30 AM"),
    3: ("09:30 AM", "10:15 AM"),
    4: ("10:35 AM", "11:20 AM"),
    5: ("11:20 AM", "12:15 PM"),
}


def _get_current_academic_year(db: Session) -> AcademicYear:
    ay = (
        db.query(AcademicYear)
        .filter(AcademicYear.is_current.is_(True), AcademicYear.is_active.is_(True))
        .first()
    )
    if not ay:
        ay = db.query(AcademicYear).order_by(AcademicYear.id.desc()).first()
    if not ay:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active academic year found. Please configure an academic year first.",
        )
    return ay


def _format_timetable_out(t: Timetable) -> TimetableOut:
    return TimetableOut(
        id=t.id,
        class_id=t.class_id,
        subject_id=t.subject_id,
        teacher_id=t.teacher_id,
        day_of_week=t.day_of_week,
        period_number=t.period_number,
        start_time=t.start_time,
        end_time=t.end_time,
        room_number=t.room_number,
        academic_year_id=t.academic_year_id,
        class_name=t.class_obj.name if t.class_obj else None,
        section=t.class_obj.section if t.class_obj else None,
        subject_name=t.subject.name if t.subject else None,
        teacher_name=t.teacher.full_name if t.teacher else None,
    )


@router.get("/sections")
def get_section_timetables(
    academic_year_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "principal", "teacher", "accountant", "staff")),
):
    """
    Returns full section timetables aggregated by class and section,
    matching the exact structure consumed by the UI Timetable view.
    """
    ay = (
        db.query(AcademicYear).filter(AcademicYear.id == academic_year_id).first()
        if academic_year_id
        else _get_current_academic_year(db)
    )

    classes = db.query(Class).filter(Class.is_active.is_(True)).order_by(Class.id.asc()).all()
    teachers = db.query(Teacher).filter(Teacher.is_active.is_(True)).all()
    teacher_dict = {t.id: t.full_name for t in teachers}
    subjects = db.query(Subject).all()
    subject_dict = {s.id: s.name for s in subjects}

    # Query all timetable entries for this academic year
    entries = (
        db.query(Timetable)
        .filter(Timetable.academic_year_id == ay.id)
        .all()
    )

    # Group by class_id
    entries_by_class: Dict[int, List[Timetable]] = {}
    for e in entries:
        entries_by_class.setdefault(e.class_id, []).append(e)

    days_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    result = []

    for cls in classes:
        cls_entries = entries_by_class.get(cls.id, [])
        room = f"Room {100 + cls.id}" if cls.id < 10 else f"Hall {'A' if cls.id % 2 == 0 else 'B'}"

        # Find incharge teacher
        incharge_assignment = (
            db.query(ClassTeacherAssignment)
            .filter(
                ClassTeacherAssignment.class_id == cls.id,
                ClassTeacherAssignment.academic_year_id == ay.id,
                ClassTeacherAssignment.is_current.is_(True),
            )
            .first()
        )
        incharge_name = (
            teacher_dict.get(incharge_assignment.teacher_id, "Faculty Member")
            if incharge_assignment
            else (teachers[cls.id % len(teachers)].full_name if teachers else "Ms. Sana Tariq")
        )

        # Build matrix map: { period_num: { day: entry } }
        matrix_map: Dict[int, Dict[str, Timetable]] = {p: {} for p in range(1, 7)}
        for entry in cls_entries:
            if entry.period_number in matrix_map:
                matrix_map[entry.period_number][entry.day_of_week] = entry

        # First lecture details
        p1_monday = matrix_map[1].get("Monday")
        first_sub = (
            subject_dict.get(p1_monday.subject_id, "Mathematics")
            if p1_monday
            else "Mathematics"
        )
        first_teacher = (
            teacher_dict.get(p1_monday.teacher_id, incharge_name)
            if p1_monday
            else incharge_name
        )

        # Build daily schedule (Monday routine)
        daily_schedule = []
        for p in range(1, 7):
            t_start, t_end = PERIOD_TIMES.get(p, ("08:00 AM", "08:45 AM"))
            entry = matrix_map[p].get("Monday")
            sub_name = subject_dict.get(entry.subject_id, "General Studies") if entry else ("Mathematics" if p == 1 else "English")
            t_name = teacher_dict.get(entry.teacher_id, incharge_name) if entry else incharge_name
            r_num = entry.room_number if (entry and entry.room_number) else room

            daily_schedule.append({
                "id": entry.id if entry else None,
                "slot_id": entry.id if entry else None,
                "class_id": cls.id,
                "subject_id": entry.subject_id if entry else None,
                "teacher_id": entry.teacher_id if entry else None,
                "period_number": p,
                "day_of_week": "Monday",
                "period": f"Period {p}",
                "subject": sub_name,
                "teacher": t_name,
                "room": r_num,
                "start_time": entry.start_time if entry else t_start,
                "end_time": entry.end_time if entry else t_end,
                "isIncharge": (p == 1),
            })
            if p == 3:
                # Add break
                daily_schedule.append({
                    "period": "Break / Recess",
                    "subject": "Lunch & Refreshment",
                    "teacher": "Duty Staff",
                    "room": "Playground",
                    "isBreak": True,
                })

        # Build friday schedule
        friday_schedule = []
        for p in range(1, 6):
            t_start, t_end = FRIDAY_PERIOD_TIMES.get(p, ("08:00 AM", "08:45 AM"))
            entry = matrix_map[p].get("Friday")
            sub_name = subject_dict.get(entry.subject_id, "General Studies") if entry else ("Mathematics" if p == 1 else "English")
            t_name = teacher_dict.get(entry.teacher_id, incharge_name) if entry else incharge_name
            r_num = entry.room_number if (entry and entry.room_number) else room

            friday_schedule.append({
                "id": entry.id if entry else None,
                "slot_id": entry.id if entry else None,
                "class_id": cls.id,
                "subject_id": entry.subject_id if entry else None,
                "teacher_id": entry.teacher_id if entry else None,
                "period_number": p,
                "day_of_week": "Friday",
                "period": f"Period {p}",
                "subject": sub_name,
                "teacher": t_name,
                "room": r_num,
                "start_time": entry.start_time if entry else t_start,
                "end_time": entry.end_time if entry else t_end,
                "isIncharge": (p == 1),
            })
            if p == 3:
                friday_schedule.append({
                    "period": "Recess Break",
                    "subject": "Short Break",
                    "teacher": "Staff",
                    "room": "Campus Yard",
                    "isBreak": True,
                })

        # Build weekly matrix
        weekly_matrix = []
        for p in range(1, 7):
            t_start, t_end = PERIOD_TIMES.get(p, ("08:00 AM", "08:45 AM"))
            slots_by_day = {}
            for d in days_order:
                entry = matrix_map[p].get(d)
                s_name = subject_dict.get(entry.subject_id, "General Studies") if entry else ("Mathematics" if p == 1 else "English")
                tch_name = teacher_dict.get(entry.teacher_id, incharge_name) if entry else incharge_name
                rm_name = entry.room_number if (entry and entry.room_number) else room
                cur_start = entry.start_time if entry else (FRIDAY_PERIOD_TIMES.get(p, ("08:00 AM", "08:45 AM"))[0] if d == "Friday" else t_start)
                cur_end = entry.end_time if entry else (FRIDAY_PERIOD_TIMES.get(p, ("08:00 AM", "08:45 AM"))[1] if d == "Friday" else t_end)
                slots_by_day[d] = {
                    "id": entry.id if entry else None,
                    "slot_id": entry.id if entry else None,
                    "class_id": cls.id,
                    "subject_id": entry.subject_id if entry else None,
                    "teacher_id": entry.teacher_id if entry else None,
                    "period_number": p,
                    "day_of_week": d,
                    "subject": s_name,
                    "teacher": tch_name,
                    "room": rm_name,
                    "start_time": cur_start,
                    "end_time": cur_end,
                    "isIncharge": (p == 1),
                }

            weekly_matrix.append({
                "period": f"Period {p}",
                "time": f"{t_start} - {t_end}",
                "slots": slots_by_day,
            })
            if p == 3:
                break_slots = {
                    d: {
                        "subject": "Friday Short Recess" if d == "Friday" else "Lunch & Refreshment",
                        "teacher": "Duty Staff",
                        "room": "Campus Yard" if d == "Friday" else "Playground",
                        "isBreak": True,
                    }
                    for d in days_order
                }
                weekly_matrix.append({
                    "period": "Break / Recess",
                    "time": "10:15 AM - 10:45 AM",
                    "isBreak": True,
                    "slots": break_slots,
                })

        result.append({
            "id": cls.id,
            "class_name": cls.name,
            "section": cls.section or "A",
            "room": room,
            "first_lecture_teacher": first_teacher,
            "first_lecture_subject": first_sub,
            "daily_schedule": daily_schedule,
            "friday_schedule": friday_schedule,
            "weekly_matrix": weekly_matrix,
        })

    return result


@router.get("/class/{class_id}", response_model=List[TimetableOut])
def get_timetable_by_class(
    class_id: int,
    academic_year_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "principal", "teacher", "accountant", "staff")),
):
    ay = (
        db.query(AcademicYear).filter(AcademicYear.id == academic_year_id).first()
        if academic_year_id
        else _get_current_academic_year(db)
    )

    entries = (
        db.query(Timetable)
        .filter(
            Timetable.class_id == class_id,
            Timetable.academic_year_id == ay.id,
        )
        .order_by(Timetable.period_number.asc())
        .all()
    )
    return [_format_timetable_out(e) for e in entries]


@router.get("/teacher/{teacher_id}", response_model=List[TimetableOut])
def get_timetable_by_teacher(
    teacher_id: int,
    academic_year_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "principal", "teacher", "accountant", "staff")),
):
    ay = (
        db.query(AcademicYear).filter(AcademicYear.id == academic_year_id).first()
        if academic_year_id
        else _get_current_academic_year(db)
    )

    entries = (
        db.query(Timetable)
        .filter(
            Timetable.teacher_id == teacher_id,
            Timetable.academic_year_id == ay.id,
        )
        .order_by(Timetable.day_of_week.asc(), Timetable.period_number.asc())
        .all()
    )
    return [_format_timetable_out(e) for e in entries]


@router.post("", response_model=TimetableOut)
def create_or_upsert_timetable_entry(
    payload: TimetableCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "principal")),
):
    ay = (
        db.query(AcademicYear).filter(AcademicYear.id == payload.academic_year_id).first()
        if payload.academic_year_id
        else _get_current_academic_year(db)
    )

    # Validate class, subject, teacher
    class_obj = db.query(Class).filter(Class.id == payload.class_id).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail=f"Class with ID {payload.class_id} not found")

    subject = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail=f"Subject with ID {payload.subject_id} not found")

    teacher = db.query(Teacher).filter(Teacher.id == payload.teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail=f"Teacher with ID {payload.teacher_id} not found")

    # Check teacher conflict (cannot teach two different classes in the same period on the same day)
    teacher_conflict = (
        db.query(Timetable)
        .filter(
            Timetable.teacher_id == payload.teacher_id,
            Timetable.day_of_week == payload.day_of_week,
            Timetable.period_number == payload.period_number,
            Timetable.academic_year_id == ay.id,
            Timetable.class_id != payload.class_id,
        )
        .first()
    )
    if teacher_conflict:
        c_name = teacher_conflict.class_obj.name if teacher_conflict.class_obj else f"Class {teacher_conflict.class_id}"
        raise HTTPException(
            status_code=400,
            detail=f"{teacher.full_name} is already assigned to {c_name} on {payload.day_of_week} Period {payload.period_number}.",
        )

    # Check default times if not provided
    start_time = payload.start_time
    end_time = payload.end_time
    if not start_time or not end_time:
        times = (
            FRIDAY_PERIOD_TIMES.get(payload.period_number)
            if payload.day_of_week == "Friday"
            else PERIOD_TIMES.get(payload.period_number)
        )
        if times:
            start_time, end_time = times

    # Upsert by (class_id, day_of_week, period_number, academic_year_id)
    existing = (
        db.query(Timetable)
        .filter(
            Timetable.class_id == payload.class_id,
            Timetable.day_of_week == payload.day_of_week,
            Timetable.period_number == payload.period_number,
            Timetable.academic_year_id == ay.id,
        )
        .first()
    )

    if existing:
        existing.subject_id = payload.subject_id
        existing.teacher_id = payload.teacher_id
        existing.start_time = start_time
        existing.end_time = end_time
        if payload.room_number:
            existing.room_number = payload.room_number
        db.commit()
        db.refresh(existing)
        return _format_timetable_out(existing)

    new_entry = Timetable(
        class_id=payload.class_id,
        subject_id=payload.subject_id,
        teacher_id=payload.teacher_id,
        day_of_week=payload.day_of_week,
        period_number=payload.period_number,
        start_time=start_time,
        end_time=end_time,
        room_number=payload.room_number or f"Room {100 + payload.class_id}",
        academic_year_id=ay.id,
    )
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return _format_timetable_out(new_entry)


@router.put("/{timetable_id}", response_model=TimetableOut)
def update_timetable_entry(
    timetable_id: int,
    payload: TimetableUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "principal")),
):
    entry = db.query(Timetable).filter(Timetable.id == timetable_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail=f"Timetable slot with ID {timetable_id} not found")

    target_teacher_id = payload.teacher_id if payload.teacher_id is not None else entry.teacher_id
    target_day = payload.day_of_week if payload.day_of_week is not None else entry.day_of_week
    target_period = payload.period_number if payload.period_number is not None else entry.period_number

    # Teacher conflict check
    teacher_conflict = (
        db.query(Timetable)
        .filter(
            Timetable.id != timetable_id,
            Timetable.teacher_id == target_teacher_id,
            Timetable.day_of_week == target_day,
            Timetable.period_number == target_period,
            Timetable.academic_year_id == entry.academic_year_id,
            Timetable.class_id != entry.class_id,
        )
        .first()
    )
    if teacher_conflict:
        c_name = teacher_conflict.class_obj.name if teacher_conflict.class_obj else f"Class {teacher_conflict.class_id}"
        raise HTTPException(
            status_code=400,
            detail=f"Selected teacher is already scheduled for {c_name} on {target_day} Period {target_period}.",
        )

    if payload.subject_id is not None:
        entry.subject_id = payload.subject_id
    if payload.teacher_id is not None:
        entry.teacher_id = payload.teacher_id
    if payload.day_of_week is not None:
        entry.day_of_week = payload.day_of_week
    if payload.period_number is not None:
        entry.period_number = payload.period_number
    if payload.start_time is not None:
        entry.start_time = payload.start_time
    if payload.end_time is not None:
        entry.end_time = payload.end_time
    if payload.room_number is not None:
        entry.room_number = payload.room_number

    db.commit()
    db.refresh(entry)
    return _format_timetable_out(entry)


@router.delete("/{timetable_id}")
def delete_timetable_entry(
    timetable_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "principal")),
):
    entry = db.query(Timetable).filter(Timetable.id == timetable_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail=f"Timetable slot with ID {timetable_id} not found")

    db.delete(entry)
    db.commit()
    return {"success": True, "message": f"Timetable slot {timetable_id} deleted successfully."}

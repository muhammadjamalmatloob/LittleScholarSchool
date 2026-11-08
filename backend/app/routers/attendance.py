from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract

from backend.app.database import get_db
from backend.app.middleware.rbac import require_permission, require_roles
from backend.app.models import (
    AcademicYear,
    Attendance,
    Class,
    Student,
    User,
    AuditLog,
)
from backend.app.schemas import (
    AttendanceClassSummaryResponse,
    AttendanceMarkRequest,
    AttendanceOut,
    AttendanceRecordItem,
    AttendanceStudentSummaryResponse,
    AttendanceSummaryStudent,
    AttendanceUpdate,
    WeeklyTrendItem,
)

router = APIRouter(prefix="/attendance", tags=["Attendance Management"])


def _get_student_name(student: Optional[Student]) -> str:
    if not student:
        return "Unknown Student"
    return getattr(student, "full_name", None) or getattr(student, "name", "Unknown Student")


@router.post("/mark")
@router.post("/bulk-save")
def mark_attendance(
    payload: AttendanceMarkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "principal", "teacher", "staff")),
):
    target_date = payload.attendance_date or payload.date or date.today()
    class_obj = db.query(Class).filter(Class.id == payload.class_id).first()
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class with ID {payload.class_id} not found",
        )

    # For teachers, enforce current-day policy unless admin or principal
    user_role = current_user.role.lower().strip()
    if user_role not in ["admin", "principal"] and target_date != date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Teachers are only authorized to mark or modify attendance for the current calendar day.",
        )

    marked_count = 0
    valid_statuses = {"present", "absent", "leave", "half-day"}

    for rec in payload.records:
        norm_status = rec.status.lower().strip()
        if norm_status not in valid_statuses:
            norm_status = "present"

        # Check existing attendance record for this student on this date
        existing = (
            db.query(Attendance)
            .filter(
                Attendance.student_id == rec.student_id,
                Attendance.attendance_date == target_date,
            )
            .first()
        )

        if existing:
            existing.status = norm_status
            existing.remarks = rec.remarks or ""
            existing.marked_by = current_user.id
            existing.class_id = payload.class_id
            existing.updated_at = datetime.utcnow()
        else:
            new_record = Attendance(
                student_id=rec.student_id,
                class_id=payload.class_id,
                attendance_date=target_date,
                status=norm_status,
                remarks=rec.remarks or "",
                marked_by=current_user.id,
            )
            db.add(new_record)
        marked_count += 1

    db.commit()

    return {
        "marked": marked_count,
        "success": True,
        "class_id": payload.class_id,
        "date": target_date.isoformat(),
        "message": f"Successfully recorded attendance for {marked_count} students.",
    }


@router.get("/class/{class_id}/date/{attendance_date}", response_model=List[AttendanceOut])
def get_attendance_by_class_and_date(
    class_id: int,
    attendance_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "principal", "teacher", "staff")),
):
    records = (
        db.query(Attendance, Student, Class)
        .outerjoin(Student, Attendance.student_id == Student.id)
        .outerjoin(Class, Attendance.class_id == Class.id)
        .filter(
            Attendance.class_id == class_id,
            Attendance.attendance_date == attendance_date,
        )
        .all()
    )

    out = []
    for att, student, cls in records:
        out.append(
            AttendanceOut(
                id=att.id,
                student_id=att.student_id,
                class_id=att.class_id,
                attendance_date=att.attendance_date,
                status=att.status,
                remarks=att.remarks,
                marked_by=att.marked_by,
                student_name=_get_student_name(student),
                roll_number=student.roll_number if student else None,
                class_name=cls.name if cls else None,
                section=cls.section if cls else None,
            )
        )
    return out


@router.get("/student/{student_id}/summary", response_model=AttendanceStudentSummaryResponse)
def get_student_attendance_summary(
    student_id: str,
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "principal", "teacher", "staff", "accountant")),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )

    query = db.query(Attendance).filter(Attendance.student_id == student_id)
    if month:
        query = query.filter(extract("month", Attendance.attendance_date) == month)
    if year:
        query = query.filter(extract("year", Attendance.attendance_date) == year)

    records = query.all()
    total_days = len(records)
    present = sum(1 for r in records if r.status == "present")
    absent = sum(1 for r in records if r.status == "absent")
    leave = sum(1 for r in records if r.status == "leave")
    half_day = sum(1 for r in records if r.status == "half-day")

    percentage = round(((present + 0.5 * half_day) / total_days * 100), 1) if total_days > 0 else 100.0
    if percentage >= 85.0:
        att_status = "good"
    elif percentage >= 75.0:
        att_status = "average"
    else:
        att_status = "warning"

    return AttendanceStudentSummaryResponse(
        student_id=student.id,
        name=_get_student_name(student),
        roll_number=student.roll_number,
        total_days=total_days,
        present=present,
        absent=absent,
        leave=leave,
        half_day=half_day,
        percentage=percentage,
        status=att_status,
    )


@router.get("/class/{class_id}/summary", response_model=AttendanceClassSummaryResponse)
def get_class_attendance_summary(
    class_id: int,
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "principal", "teacher", "staff")),
):
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class with ID {class_id} not found",
        )

    students = (
        db.query(Student)
        .filter(Student.class_id == class_id, Student.is_active.is_(True))
        .order_by(Student.roll_number.asc())
        .all()
    )

    # Distinct dates on which attendance was recorded for this class
    date_query = (
        db.query(Attendance.attendance_date)
        .filter(Attendance.class_id == class_id)
        .distinct()
    )
    if month:
        date_query = date_query.filter(extract("month", Attendance.attendance_date) == month)
    if year:
        date_query = date_query.filter(extract("year", Attendance.attendance_date) == year)

    distinct_dates = [d[0] for d in date_query.all()]
    total_working_days = len(distinct_dates)

    student_summaries = []
    for s in students:
        s_query = db.query(Attendance).filter(
            Attendance.student_id == s.id,
            Attendance.class_id == class_id,
        )
        if month:
            s_query = s_query.filter(extract("month", Attendance.attendance_date) == month)
        if year:
            s_query = s_query.filter(extract("year", Attendance.attendance_date) == year)

        s_records = s_query.all()
        p = sum(1 for r in s_records if r.status == "present")
        a = sum(1 for r in s_records if r.status == "absent")
        l = sum(1 for r in s_records if r.status == "leave")
        h = sum(1 for r in s_records if r.status == "half-day")
        s_total = len(s_records)

        pct = round(((p + 0.5 * h) / s_total * 100), 1) if s_total > 0 else 100.0
        stat = "good" if pct >= 85.0 else ("average" if pct >= 75.0 else "warning")

        formatted_roll = f"R-{s.roll_number:02d}" if s.roll_number else None
        student_summaries.append(
            AttendanceSummaryStudent(
                student_id=s.id,
                name=_get_student_name(s),
                roll_number=s.roll_number,
                formatted_roll_number=formatted_roll,
                present=p,
                absent=a,
                leave=l,
                half_day=h,
                total=s_total,
                percentage=pct,
                status=stat,
            )
        )

    return AttendanceClassSummaryResponse(
        total_days=total_working_days,
        class_id=class_obj.id,
        class_name=class_obj.name,
        section=class_obj.section,
        month=month,
        year=year,
        students=student_summaries,
    )


@router.get("/student/{student_id}/report", response_model=List[AttendanceOut])
def get_student_attendance_report(
    student_id: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "principal", "teacher", "staff")),
):
    query = (
        db.query(Attendance, Student, Class)
        .outerjoin(Student, Attendance.student_id == Student.id)
        .outerjoin(Class, Attendance.class_id == Class.id)
        .filter(Attendance.student_id == student_id)
    )

    if start_date:
        query = query.filter(Attendance.attendance_date >= start_date)
    if end_date:
        query = query.filter(Attendance.attendance_date <= end_date)
    if month:
        query = query.filter(extract("month", Attendance.attendance_date) == month)
    if year:
        query = query.filter(extract("year", Attendance.attendance_date) == year)

    records = query.order_by(Attendance.attendance_date.desc()).all()

    out = []
    for att, student, cls in records:
        out.append(
            AttendanceOut(
                id=att.id,
                student_id=att.student_id,
                class_id=att.class_id,
                attendance_date=att.attendance_date,
                status=att.status,
                remarks=att.remarks,
                marked_by=att.marked_by,
                student_name=_get_student_name(student),
                roll_number=student.roll_number if student else None,
                class_name=cls.name if cls else None,
                section=cls.section if cls else None,
            )
        )
    return out


@router.put("/{attendance_id}")
def update_attendance_record(
    attendance_id: int,
    payload: AttendanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "principal", "teacher")),
):
    record = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attendance record with ID {attendance_id} not found",
        )

    # Teachers can only update if record is for today
    user_role = current_user.role.lower().strip()
    if user_role not in ["admin", "principal"] and record.attendance_date != date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Past attendance records can only be updated by Admin or Principal.",
        )

    if payload.status is not None:
        norm = payload.status.lower().strip()
        if norm in {"present", "absent", "leave", "half-day"}:
            record.status = norm
    if payload.remarks is not None:
        record.remarks = payload.remarks

    record.updated_at = datetime.utcnow()
    db.commit()

    return {"success": True, "message": "Attendance record updated successfully."}


@router.delete("/{attendance_id}")
def delete_attendance_record(
    attendance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "principal")),
):
    record = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attendance record with ID {attendance_id} not found",
        )

    db.delete(record)
    db.commit()
    return {"success": True, "message": f"Attendance record {attendance_id} deleted."}


@router.get("/weekly-trend", response_model=List[WeeklyTrendItem])
def get_weekly_attendance_trend(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "principal", "teacher", "accountant", "staff")),
):
    """
    Returns the 7-day attendance trend for the school dashboard and overview widgets.
    """
    total_active_students = db.query(Student).filter(Student.is_active.is_(True)).count()
    if total_active_students == 0:
        total_active_students = 10

    today = date.today()
    trend = []

    # Calculate past 7 days ending today
    day_labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    for i in range(6, -1, -1):
        day_date = today - timedelta(days=i)
        is_today = (i == 0)
        day_name = "Today" if is_today else day_labels[day_date.weekday()]
        date_str = day_date.strftime("%b %d")

        records = db.query(Attendance).filter(Attendance.attendance_date == day_date).all()
        if records:
            day_total = len(records)
            day_present = sum(1 for r in records if r.status == "present")
            half_day = sum(1 for r in records if r.status == "half-day")
            effective_present = day_present + int(0.5 * half_day)
            day_pct = round((effective_present / day_total * 100), 1) if day_total > 0 else 0.0
            trend.append(
                WeeklyTrendItem(
                    day=day_name,
                    date=date_str,
                    attendance=day_pct,
                    present=effective_present,
                    total=day_total,
                )
            )
        else:
            trend.append(
                WeeklyTrendItem(
                    day=day_name,
                    date=date_str,
                    attendance=0.0,
                    present=0,
                    total=total_active_students,
                )
            )

    # If the past 7 calendar days have no attendance records logged, find the 7 most recent recorded dates
    has_activity = any(t.attendance > 0 or t.present > 0 for t in trend)
    if not has_activity:
        recent_dates = (
            db.query(Attendance.attendance_date)
            .distinct()
            .order_by(Attendance.attendance_date.desc())
            .limit(7)
            .all()
        )
        if recent_dates:
            recent_dates = sorted([d[0] for d in recent_dates])
            trend = []
            for d in recent_dates:
                records = db.query(Attendance).filter(Attendance.attendance_date == d).all()
                day_total = len(records)
                day_present = sum(1 for r in records if r.status == "present")
                half_day = sum(1 for r in records if r.status == "half-day")
                effective_present = day_present + int(0.5 * half_day)
                day_pct = round((effective_present / day_total * 100), 1) if day_total > 0 else 0.0
                day_name = "Today" if d == today else day_labels[d.weekday()]
                trend.append(
                    WeeklyTrendItem(
                        day=day_name,
                        date=d.strftime("%b %d"),
                        attendance=day_pct,
                        present=effective_present,
                        total=day_total,
                    )
                )

    return trend

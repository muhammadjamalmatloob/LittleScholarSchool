from datetime import date, datetime
from io import BytesIO
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.middleware.rbac import require_permission
from backend.app.utils.licensing import get_active_license
from backend.app.models import (
    AcademicYear,
    Attendance,
    Class,
    ClassTeacherAssignment,
    ExamRecord,
    ExamType,
    Fee,
    FeeCharge,
    Student,
    Subject,
    Teacher,
    User,
)

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])


def _format_roll(student: Student) -> str:
    year_str = student.academic_year.year_name if student.academic_year else "2024-2025"
    sess = year_str.split("-")[0] if "-" in year_str else year_str
    sec = (student.student_class.section if student.student_class and student.student_class.section else "A").upper()
    c_raw = (student.student_class.name if student.student_class else "10").replace("Grade ", "").replace("Class ", "").strip()
    seq = student.roll_number if student.roll_number is not None else 1
    return f"{sess}-{c_raw}-{sec}-{seq:02d}"


def _get_current_year(db: Session, academic_year_id: Optional[int] = None) -> AcademicYear:
    if academic_year_id is not None:
        year = db.query(AcademicYear).filter(AcademicYear.id == academic_year_id).first()
        if year:
            return year
    current = db.query(AcademicYear).filter(AcademicYear.is_current.is_(True), AcademicYear.is_active.is_(True)).first()
    if not current:
        current = db.query(AcademicYear).order_by(AcademicYear.id.desc()).first()
    return current


@router.get("/dashboard/summary")
def get_dashboard_summary(
    academic_year_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("reports", "read")),
) -> Dict[str, Any]:
    today = date.today()
    year = _get_current_year(db, academic_year_id)
    year_id = year.id if year else None
    year_name = year.year_name if year else f"{today.year}-{today.year + 1}"

    student_query = db.query(Student).filter(Student.is_active.is_(True))
    if academic_year_id is not None:
        student_query = student_query.filter(Student.academic_year_id == academic_year_id)
    total_students = student_query.count()

    total_teachers = db.query(Teacher).filter(Teacher.is_active.is_(True)).count()
    total_classes = db.query(Class).filter(Class.is_active.is_(True)).count()

    lic = get_active_license()
    allowed_modules = lic.get("modules", {})
    has_attendance = allowed_modules.get("attendance", True)
    has_fees = allowed_modules.get("fees", True)

    attendance_data = None
    if has_attendance:
        today = date.today()
        att_today_query = db.query(Attendance).filter(Attendance.attendance_date == today)
        att_count = att_today_query.count()

        if att_count >= 50:
            present_count = att_today_query.filter(Attendance.status.in_(["present", "half-day"])).count()
            absent_count = att_today_query.filter(Attendance.status == "absent").count()
            total_marked = att_count
            eff_total = max(total_students, total_marked) if total_students > 0 else total_marked
            pct = round((present_count / max(eff_total, 1)) * 100, 1)
            ref_date = today.isoformat()
        else:
            # Find latest date that has representative class attendance (>= 20 records)
            date_counts = (
                db.query(Attendance.attendance_date, func.count(Attendance.id).label("cnt"))
                .group_by(Attendance.attendance_date)
                .having(func.count(Attendance.id) >= 20)
                .order_by(Attendance.attendance_date.desc())
                .first()
            )
            if date_counts:
                best_date = date_counts[0]
                ref_date = best_date.isoformat()
                latest_query = db.query(Attendance).filter(Attendance.attendance_date == best_date)
                present_count = latest_query.filter(Attendance.status.in_(["present", "half-day"])).count()
                absent_count = latest_query.filter(Attendance.status == "absent").count()
                total_marked = latest_query.count()
                eff_total = max(total_students, total_marked) if total_students > 0 else total_marked
                pct = round((present_count / max(eff_total, 1)) * 100, 1)
            else:
                total_all = db.query(Attendance).count()
                present_all = db.query(Attendance).filter(Attendance.status.in_(["present", "half-day"])).count()
                if total_all > 0:
                    pct = round((present_all / total_all) * 100, 1)
                    present_count = int(round((pct / 100) * total_students)) if total_students > 0 else present_all
                    absent_count = max(total_students - present_count, 0)
                    total_marked = total_students
                else:
                    pct = 0.0
                    present_count = 0
                    absent_count = 0
                    total_marked = 0
                ref_date = today.isoformat()

        attendance_data = {
            "present": present_count,
            "absent": absent_count,
            "total": total_marked or total_students,
            "percentage": pct,
            "date": ref_date,
        }

    # Pending & collected fees
    pending_fees = None
    collected_fees = None
    if has_fees:
        pending_records = db.query(Fee).filter(Fee.status.in_(["pending", "partial", "overdue"])).all()
        pending_fees = round(sum(max(f.amount - (f.paid_amount or 0), 0) for f in pending_records), 2)

        paid_records = db.query(Fee).filter((Fee.paid_amount > 0)).all()
        collected_fees = round(sum(f.paid_amount or 0 for f in paid_records), 2)

    return {
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_classes": total_classes,
        "current_academic_year": year_name,
        "attendance_today": attendance_data,
        "pending_fees": pending_fees,
        "collected_fees": collected_fees,
    }


@router.get("/dashboard/priority-actions")
def get_priority_actions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("reports", "read")),
) -> List[Dict[str, Any]]:
    actions = []
    today = date.today()
    lic = get_active_license()
    allowed_modules = lic.get("modules", {})
    has_attendance = allowed_modules.get("attendance", True)
    has_fees = allowed_modules.get("fees", True)

    # 1. Unmarked attendance check for active classes (if licensed)
    if has_attendance:
        marked_class_ids = {
            c_id for (c_id,) in db.query(Attendance.class_id).filter(Attendance.attendance_date == today).distinct().all()
        }
        unmarked_classes = db.query(Class).filter(Class.is_active.is_(True), ~Class.id.in_(marked_class_ids)).limit(3).all()

        for c in unmarked_classes:
            sec = f"-{c.section}" if c.section else ""
            class_name = f"{c.name}{sec}"
            assignment = (
                db.query(ClassTeacherAssignment, Teacher)
                .join(Teacher, Teacher.id == ClassTeacherAssignment.teacher_id)
                .filter(ClassTeacherAssignment.class_id == c.id, ClassTeacherAssignment.is_current.is_(True))
                .first()
            )
            teacher_label = f"Class Incharge {assignment[1].full_name}" if assignment else "Class Incharge"
            actions.append(
                {
                    "id": f"roll-call-{c.id}",
                    "type": "attendance",
                    "title": f"{class_name} Attendance Pending",
                    "desc": f"{teacher_label} has not submitted today's roll-call register ({c.total_strength or 50} students).",
                    "actionText": "Mark Roll Call",
                    "linkTo": "/attendance",
                    "severity": "warning",
                }
            )

    # 2. Overdue fee alerts (if licensed)
    if has_fees:
        overdue_fees = (
            db.query(Fee, Student, FeeCharge)
            .join(Student, Student.id == Fee.student_id)
            .join(FeeCharge, FeeCharge.id == Fee.fee_charge_id)
            .filter(Fee.status == "overdue")
            .order_by(Fee.due_date.asc())
            .limit(3)
            .all()
        )
        for fee, student, charge in overdue_fees:
            balance = max(fee.amount - (fee.paid_amount or 0), 0)
            formatted_roll = _format_roll(student)
            actions.append(
                {
                    "id": f"fee-overdue-{fee.id}",
                    "type": "fee",
                    "title": f"Rs. {int(balance):,} {charge.charge_name} Overdue",
                    "desc": f"{student.name} ({formatted_roll}) — voucher past {fee.due_date.strftime('%b %d') if fee.due_date else 'due date'}.",
                    "actionText": "View Voucher",
                    "linkTo": "/fees",
                    "severity": "danger",
                }
            )

    return actions


@router.get("/dashboard/fee-trend")
def get_fee_collection_trend(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("reports", "read")),
) -> List[Dict[str, Any]]:
    """
    Returns the real 6-month fee collection and pending receivables trend
    aggregated directly from live SQLite fee records.
    """
    today = date.today()
    month_names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    # Past 6 calendar months timeline ending with current month
    periods = []
    for i in range(5, -1, -1):
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12
            y -= 1
        periods.append((y, m))

    trend = []
    for y, m in periods:
        fees = db.query(Fee).filter(Fee.year == y, Fee.month == m).all()
        coll = round(sum(f.paid_amount or 0 for f in fees), 2)
        pend = round(sum(max((f.amount or 0) - (f.paid_amount or 0), 0) for f in fees), 2)
        total = coll + pend
        rate = f"{(coll / total * 100):.1f}%" if total > 0 else "0.0%"
        trend.append({
            "month": month_names[m],
            "year": y,
            "label": f"{month_names[m]} {str(y)[-2:]}",
            "collected": coll,
            "pending": pend,
            "total": total,
            "recoveryRate": rate,
        })

    # If the standard 6 calendar months have no vouchers, find any 6 most recent active billing periods
    has_activity = any(t["total"] > 0 for t in trend)
    if not has_activity:
        db_periods = (
            db.query(Fee.year, Fee.month)
            .distinct()
            .filter(Fee.year.isnot(None), Fee.month.isnot(None))
            .order_by(Fee.year.desc(), Fee.month.desc())
            .limit(6)
            .all()
        )
        if db_periods:
            db_periods = sorted(db_periods, key=lambda p: (p[0] or 0, p[1] or 0))
            trend = []
            for y, m in db_periods:
                if not m or not (1 <= m <= 12):
                    continue
                fees = db.query(Fee).filter(Fee.year == y, Fee.month == m).all()
                coll = round(sum(f.paid_amount or 0 for f in fees), 2)
                pend = round(sum(max((f.amount or 0) - (f.paid_amount or 0), 0) for f in fees), 2)
                total = coll + pend
                rate = f"{(coll / total * 100):.1f}%" if total > 0 else "0.0%"
                trend.append({
                    "month": month_names[m],
                    "year": y,
                    "label": f"{month_names[m]} {str(y)[-2:]}",
                    "collected": coll,
                    "pending": pend,
                    "total": total,
                    "recoveryRate": rate,
                })

    return trend


@router.get("/attendance")
def get_attendance_report(
    class_id: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    academic_year_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("reports", "read")),
) -> Dict[str, Any]:
    query = db.query(Attendance)
    if class_id is not None:
        query = query.filter(Attendance.class_id == class_id)
    if month is not None:
        query = query.filter(func.strftime("%m", Attendance.attendance_date) == f"{month:02d}")
    if year is not None:
        query = query.filter(func.strftime("%Y", Attendance.attendance_date) == str(year))

    records = query.all()
    if not records:
        return {
            "class_average": 0.0,
            "highest_attendance": "N/A",
            "lowest_attendance": "N/A",
            "summary": [],
        }

    # Aggregate by student
    student_stats: Dict[str, Dict[str, Any]] = {}
    for r in records:
        sid = r.student_id
        if sid not in student_stats:
            student_stats[sid] = {"present": 0, "absent": 0, "leave": 0, "total": 0}
        student_stats[sid]["total"] += 1
        if r.status in ["present", "half-day"]:
            student_stats[sid]["present"] += 1
        elif r.status == "absent":
            student_stats[sid]["absent"] += 1
        else:
            student_stats[sid]["leave"] += 1

    summary = []
    percentages = []
    for sid, counts in student_stats.items():
        st = db.query(Student).filter(Student.id == sid).first()
        if not st:
            continue
        c_name = f"{st.student_class.name}-{st.student_class.section}" if st.student_class and st.student_class.section else (st.student_class.name if st.student_class else "Unassigned")
        pct = round((counts["present"] / max(counts["total"], 1)) * 100, 1)
        percentages.append((pct, st.name))
        summary.append(
            {
                "student_id": st.id,
                "name": st.name,
                "roll_number": _format_roll(st),
                "class_name": c_name,
                "present_days": counts["present"],
                "absent_days": counts["absent"],
                "leave_days": counts["leave"],
                "percentage": pct,
            }
        )

    class_avg = round(sum(p[0] for p in percentages) / max(len(percentages), 1), 1)
    percentages.sort(key=lambda x: x[0])
    lowest_str = f"{percentages[0][1]} ({percentages[0][0]}%)" if percentages else "N/A"
    highest_str = f"{percentages[-1][1]} ({percentages[-1][0]}%)" if percentages else "N/A"

    return {
        "class_average": class_avg,
        "highest_attendance": highest_str,
        "lowest_attendance": lowest_str,
        "summary": summary,
    }


@router.get("/fees")
def get_fee_report(
    class_id: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("reports", "read")),
) -> Dict[str, Any]:
    query = db.query(Fee, Student, FeeCharge, Class).join(Student, Student.id == Fee.student_id).join(FeeCharge, FeeCharge.id == Fee.fee_charge_id).join(Class, Class.id == Student.class_id)
    if class_id is not None:
        query = query.filter(Student.class_id == class_id)
    if month is not None:
        query = query.filter(Fee.month == month)
    if year is not None:
        query = query.filter(Fee.year == year)
    if status_filter is not None and status_filter.lower() != "all":
        query = query.filter(Fee.status == status_filter.lower())

    results = query.all()
    total_fees = sum(f.amount for f, s, c, cl in results)
    total_collected = sum(f.paid_amount or 0 for f, s, c, cl in results)
    pending = sum(max(f.amount - (f.paid_amount or 0), 0) for f, s, c, cl in results if f.status in ["pending", "partial"])
    overdue = sum(max(f.amount - (f.paid_amount or 0), 0) for f, s, c, cl in results if f.status == "overdue")
    collection_rate = f"{round((total_collected / max(total_fees, 1)) * 100, 1)}%"

    student_items = [
        {
            "fee_id": f.id,
            "student_id": s.id,
            "name": s.name,
            "roll_number": _format_roll(s),
            "class_name": f"{cl.name}-{cl.section}" if cl.section else cl.name,
            "charge_name": c.charge_name,
            "amount": f.amount,
            "paid_amount": f.paid_amount or 0,
            "balance": max(f.amount - (f.paid_amount or 0), 0),
            "status": f.status,
            "due_date": f.due_date.isoformat() if f.due_date else None,
        }
        for f, s, c, cl in results
    ]

    return {
        "total_fees": round(total_fees, 2),
        "total_collected": round(total_collected, 2),
        "pending": round(pending, 2),
        "overdue": round(overdue, 2),
        "collection_rate": collection_rate,
        "students": student_items,
    }


@router.get("/exam-performance")
def get_exam_performance_report(
    class_id: Optional[int] = Query(None),
    exam_type: Optional[str] = Query(None),
    academic_year_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("reports", "read")),
) -> Dict[str, Any]:
    query = db.query(ExamRecord)
    if class_id is not None:
        query = query.filter(ExamRecord.class_id == class_id)
    if exam_type is not None:
        query = query.filter(ExamRecord.exam_type == exam_type)
    if academic_year_id is not None:
        query = query.filter(ExamRecord.academic_year_id == academic_year_id)

    records = query.all()
    if not records:
        return {
            "average_marks": 0.0,
            "pass_percentage": 0.0,
            "highest_mark": 0,
            "lowest_mark": 0,
            "grade_distribution": {"A+": 0, "A": 0, "B": 0, "C": 0, "F": 0},
        }

    percentages = [r.percentage or 0 for r in records]
    gained_marks = [r.gained_marks or 0 for r in records]

    avg_marks = round(sum(gained_marks) / max(len(gained_marks), 1), 1)
    pass_count = sum(1 for p in percentages if p >= 40.0)
    pass_pct = round((pass_count / max(len(percentages), 1)) * 100, 1)

    grade_dist = {"A+": 0, "A": 0, "B": 0, "C": 0, "F": 0}
    for r in records:
        grade = (r.grade or "F").strip().upper()
        if grade in grade_dist:
            grade_dist[grade] += 1
        elif grade.startswith("A"):
            grade_dist["A"] += 1
        else:
            grade_dist["C"] += 1

    return {
        "average_marks": avg_marks,
        "pass_percentage": pass_pct,
        "highest_mark": round(max(gained_marks), 1) if gained_marks else 0,
        "lowest_mark": round(min(gained_marks), 1) if gained_marks else 0,
        "grade_distribution": grade_dist,
    }


@router.get("/student/{student_id}")
@router.get("/student-summary/{student_id}")
def get_student_report_summary(
    student_id: str,
    academic_year_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("reports", "read")),
) -> Dict[str, Any]:
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    year = _get_current_year(db, academic_year_id)

    # Attendance
    att_query = db.query(Attendance).filter(Attendance.student_id == student_id)
    total_days = att_query.count()
    present_days = att_query.filter(Attendance.status.in_(["present", "half-day"])).count()
    att_pct = round((present_days / max(total_days, 1)) * 100, 1) if total_days > 0 else 0.0

    # Fees
    fees = db.query(Fee).filter(Fee.student_id == student_id).all()
    total_due = sum(f.amount for f in fees)
    total_paid = sum(f.paid_amount or 0 for f in fees)
    balance = max(total_due - total_paid, 0)
    fee_status = "paid" if balance == 0 and total_due > 0 else ("overdue" if any(f.status == "overdue" for f in fees) else "pending")

    # Exams
    exams = (
        db.query(ExamRecord, Subject)
        .join(Subject, Subject.id == ExamRecord.subject_id)
        .filter(ExamRecord.student_id == student_id)
        .all()
    )
    exam_records = [
        {
            "subject": subj.name,
            "marks": r.gained_marks,
            "total_marks": r.total_marks,
            "grade": r.grade,
            "percentage": r.percentage,
            "exam_type": r.exam_type,
        }
        for r, subj in exams
    ]

    return {
        "student_id": student.id,
        "name": student.name,
        "roll_number": _format_roll(student),
        "class_name": f"{student.student_class.name}-{student.student_class.section}" if student.student_class and student.student_class.section else (student.student_class.name if student.student_class else "Unassigned"),
        "academic_year": year.year_name if year else "2024-2025",
        "attendance": {
            "percentage": att_pct,
            "present": present_days,
            "total_days": total_days,
        },
        "fees": {
            "total_due": round(total_due, 2),
            "total_paid": round(total_paid, 2),
            "balance": round(balance, 2),
            "status": fee_status,
        },
        "exams": exam_records,
    }


@router.get("/download/{report_type}")
def download_pdf_report(
    report_type: str,
    class_id: Optional[int] = Query(None),
    student_id: Optional[str] = Query(None),
    exam_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("reports", "read")),
):
    """Generate dynamic PDF summaries for students or classes using ReportLab."""
    buffer = BytesIO()
    doc = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    y = height - 60

    doc.setTitle(f"School Report - {report_type.capitalize()}")
    doc.setFont("Helvetica-Bold", 16)
    doc.drawCentredString(width / 2, y, "Little Scholar School System")
    y -= 25
    doc.setFont("Helvetica", 11)
    doc.drawCentredString(width / 2, y, f"Academic Official Report ({report_type.replace('-', ' ').title()})")
    y -= 40
    doc.line(54, y + 10, width - 54, y + 10)

    doc.setFont("Helvetica", 10)
    doc.drawString(54, y, f"Generated On: {date.today().strftime('%B %d, %Y')}")
    doc.drawRightString(width - 54, y, f"Requested By: {current_user.full_name}")
    y -= 30

    if student_id:
        st = db.query(Student).filter(Student.id == student_id).first()
        if st:
            doc.setFont("Helvetica-Bold", 11)
            doc.drawString(54, y, f"Student: {st.name} ({_format_roll(st)})")
            y -= 20
            doc.drawString(54, y, f"Class: {st.student_class.name if st.student_class else 'N/A'}")
            y -= 30

    doc.setFont("Helvetica-Bold", 11)
    doc.drawString(54, y, "Report Summary Details:")
    y -= 22

    doc.setFont("Helvetica", 10)
    doc.drawString(54, y, f"Report Type: {report_type.title()}")
    y -= 20
    doc.drawString(54, y, f"Filter Scope: Class ID {class_id if class_id else 'All Classes'}")
    y -= 30
    doc.drawString(54, y, "Official school seal and verification signature are required for legal validity.")
    y -= 60

    doc.line(54, y, 220, y)
    doc.drawString(54, y - 16, "Principal Signature & Stamp")

    doc.save()
    buffer.seek(0)
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{report_type}_report_{date.today().isoformat()}.pdf"'},
    )

import json
import csv
import io
from datetime import datetime, date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Response, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database import get_db
from backend.app.models import AcademicYear, Student, Class, User
from backend.app.schemas import CSVImportResponse, CSVImportRowError
from backend.app.middleware.rbac import require_permission
from backend.app.crud import create_audit_log
from backend.app.utils.roll_numbers import (
    allocate_roll_number,
    extract_roll_sequence,
    synchronize_roll_sequences,
)

router = APIRouter(prefix="/import", tags=["CSV Import"])


def _next_student_id(db: Session) -> str:
    ids = db.query(Student.id).filter(Student.id.like("STUD_%")).all()
    highest = max((int(value.split("_", 1)[1]) for (value,) in ids), default=0)
    return f"STUD_{highest + 1:04d}"


def _parse_flexible_date(date_str: str) -> Optional[date]:
    """Parse various common date string formats into a date object."""
    if not date_str or not date_str.strip():
        return None
    cleaned = date_str.strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue
    return None


def _get_selected_class(db: Session, class_id: int, section: str) -> Class:
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    if not class_obj or (class_obj.section or "").strip().upper() != section.strip().upper():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The selected class and section do not match an existing class section.",
        )
    return class_obj


@router.get("/students/template")
def download_student_import_template(
    class_id: int = Query(..., ge=1),
    section: str = Query(..., min_length=1),
    roll_mode: str = Query(..., pattern="^(new|existing)$"),
    db: Session = Depends(get_db),
):
    """Generate a template for the selected class section and roll-number mode."""
    class_obj = _get_selected_class(db, class_id, section)
    output = io.StringIO()
    writer = csv.writer(output)
    headers = [
        "Student Name",
        "Date of Birth",
        "Gender",
        "Parent Name",
        "Contact Number",
        "Email",
        "Address",
        "City",
        "Admission Date",
        "Notes",
        "Is Active",
    ]
    if roll_mode == "existing":
        headers.insert(1, "Roll Number")
    writer.writerow(headers)
    sample = [
        "Bilal Hassan",
        "2016-03-15",
        "M",
        "Hassan Raza",
        "03001112233",
        "bilal@example.com",
        "Street 5, Phase 2, DHA",
        "Lahore",
        "2025-08-15",
        "New admission",
        "Yes",
    ]
    if roll_mode == "existing":
        sample.insert(1, "25")
    writer.writerow(sample)
    second_sample = [
        "Ayesha Tariq",
        "2016-08-20",
        "F",
        "Tariq Mehmood",
        "03009998877",
        "ayesha@example.com",
        "House 44, Johar Town",
        "Lahore",
        "2025-08-15",
        "",
        "Yes",
    ]
    if roll_mode == "existing":
        second_sample.insert(1, "26")
    writer.writerow(second_sample)

    content = output.getvalue()
    return Response(
        content=content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="students_{class_obj.name}_{section}_{roll_mode}_template.csv"',
        },
    )


@router.post("/students", response_model=CSVImportResponse)
async def import_students_from_csv(
    file: UploadFile = File(...),
    class_id: int = Query(..., ge=1),
    section: str = Query(..., min_length=1),
    roll_mode: str = Query(..., pattern="^(new|existing)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("students", "create")),
):
    """Import students into the selected class section using the selected roll mode."""
    class_obj = _get_selected_class(db, class_id, section)
    if not file.filename.lower().endswith((".csv", ".txt")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a CSV (.csv) file",
        )

    # Enforce 5 MB maximum upload limit to protect against memory exhaustion DoS
    MAX_CSV_SIZE = 5 * 1024 * 1024  # 5 MB
    raw_bytes = await file.read(MAX_CSV_SIZE + 1)
    if len(raw_bytes) > MAX_CSV_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Uploaded CSV file exceeds the maximum allowed size limit of 5 MB.",
        )
    try:
        text = raw_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            text = raw_bytes.decode("latin-1")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to decode file. Please ensure it is saved in UTF-8 format.",
            )

    reader = csv.reader(io.StringIO(text))
    rows = list(reader)

    if not rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded CSV file is empty.",
        )

    # Normalize header mapping
    raw_header = [col.strip().lower().replace("_", " ") for col in rows[0]]
    field_map = {}
    for idx, col in enumerate(raw_header):
        if col in ["student name", "name", "full name"]:
            field_map["name"] = idx
        elif col in ["roll number", "roll no", "roll", "admission number"]:
            field_map["roll_number"] = idx
        elif col in ["date of birth", "dob", "birth date"]:
            field_map["dob"] = idx
        elif col in ["gender", "sex"]:
            field_map["gender"] = idx
        elif col in ["parent name", "father name", "guardian name", "parent"]:
            field_map["parent_name"] = idx
        elif col in ["contact number", "phone", "contact", "mobile", "phone number"]:
            field_map["contact"] = idx
        elif col in ["email", "email address"]:
            field_map["email"] = idx
        elif col in ["address", "home address"]:
            field_map["address"] = idx
        elif col in ["city"]:
            field_map["city"] = idx
        elif col in ["admission date", "date of admission"]:
            field_map["admission_date"] = idx
        elif col in ["notes", "remarks"]:
            field_map["notes"] = idx
        elif col in ["is active", "active", "status"]:
            field_map["is_active"] = idx

    if "name" not in field_map:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV header must contain a 'Student Name' column.",
        )
    if "roll_number" in field_map and roll_mode == "new":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This import is configured for new roll numbers; remove the Roll Number column.",
        )
    if roll_mode == "existing" and "roll_number" not in field_map:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This import is configured to use existing roll numbers; add a Roll Number column.",
        )
    if any(column in field_map for column in ("class", "section")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Class and Section are selected before import and must not be included in the CSV.",
        )

    errors: List[CSVImportRowError] = []
    students_to_insert = []
    existing_ids = db.query(Student.id).filter(Student.id.like("STUD_%")).all()
    next_student_number = max(
        (int(value.split("_", 1)[1]) for (value,) in existing_ids),
        default=0,
    ) + 1
    academic_year_id = (
        db.query(AcademicYear.id)
        .filter(AcademicYear.is_current.is_(True), AcademicYear.is_active.is_(True))
        .scalar()
    )
    if academic_year_id is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No current academic year is configured",
        )

    for row_idx, row in enumerate(rows[1:], start=2):
        if not row or not any(field.strip() for field in row):
            continue  # skip completely blank rows

        def get_val(key):
            idx = field_map.get(key)
            if idx is not None and idx < len(row):
                return row[idx].strip()
            return ""

        name = get_val("name")
        if not name:
            errors.append(CSVImportRowError(row=row_idx, error="Student Name is required"))
            continue

        dob = _parse_flexible_date(get_val("dob"))
        gender = get_val("gender")
        if gender:
            gender = gender.upper()[0] if gender.upper()[0] in ["M", "F", "O"] else None

        imported_roll = extract_roll_sequence(get_val("roll_number")) if roll_mode == "existing" else None
        if get_val("roll_number") and imported_roll is None:
            errors.append(CSVImportRowError(row=row_idx, error="Roll Number must be numeric or end with a numeric sequence"))
            continue
        if imported_roll is not None and db.query(Student).filter(
            Student.class_id == class_obj.id,
            Student.academic_year_id == academic_year_id,
            Student.roll_number == imported_roll,
        ).first():
            errors.append(CSVImportRowError(row=row_idx, error="Roll Number already exists in this class and academic session"))
            continue

        admission_date = _parse_flexible_date(get_val("admission_date")) or date.today()
        active_value = get_val("is_active").lower()
        is_active = active_value not in {"no", "false", "inactive", "0"}
        if is_active and (
            db.query(Student).filter(
                Student.class_id == class_obj.id,
                Student.academic_year_id == academic_year_id,
                Student.is_active.is_(True),
            ).count()
            + sum(1 for imported_student in students_to_insert if imported_student.is_active)
            >= class_obj.total_strength
        ):
            errors.append(
                CSVImportRowError(
                    row=row_idx,
                    error=f"{class_obj.name} {class_obj.section or ''} has reached its capacity of {class_obj.total_strength}",
                )
            )
            continue
        student = Student(
                id=f"STUD_{next_student_number:04d}",
                name=name,
                roll_number=imported_roll or allocate_roll_number(
                    db, class_id=class_obj.id, academic_year_id=academic_year_id
                ),
                class_id=class_obj.id,
                academic_year_id=academic_year_id,
                date_of_birth=dob,
                gender=gender,
                parent_name=get_val("parent_name") or None,
                contact_number=get_val("contact") or None,
                email=get_val("email") or None,
                address=get_val("address") or None,
                city=get_val("city") or None,
                admission_date=admission_date,
                is_active=is_active,
                notes=get_val("notes") or None,
        )
        db.add(student)
        students_to_insert.append(student)
        next_student_number += 1

    # Insert valid records
    if students_to_insert:
        db.flush()
        synchronize_roll_sequences(db)
        db.commit()

        create_audit_log(
            db,
            user_id=current_user.id,
            action="CSV_IMPORT_STUDENTS",
            table_name="students",
            new_values=json.dumps({"imported_count": len(students_to_insert), "filename": file.filename}),
        )

    return CSVImportResponse(
        total_rows=len(rows) - 1,
        imported=len(students_to_insert),
        skipped=len(errors),
        errors=errors,
    )

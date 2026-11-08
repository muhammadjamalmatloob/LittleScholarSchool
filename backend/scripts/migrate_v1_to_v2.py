"""Migrate the v1 SQLite database to the revised v2 schema.

The migration creates a timestamped backup and writes the migrated database to
a temporary file before replacing the original. It is intentionally explicit:
do not run it automatically every time the API starts.
"""

from __future__ import annotations

import shutil
import sqlite3
from datetime import date, datetime
from pathlib import Path

from sqlalchemy import create_engine

ROOT = Path(__file__).resolve().parents[2]
import sys

sys.path.insert(0, str(ROOT))

from backend.app.config import settings
from backend.app.database import Base
import backend.app.models  # noqa: F401


def database_path() -> Path:
    if not settings.DATABASE_URL.startswith("sqlite:///"):
        raise RuntimeError("The v1-to-v2 migration only supports SQLite databases.")
    return Path(settings.DATABASE_URL.removeprefix("sqlite:///")).resolve()


def value(row: sqlite3.Row, name: str, default=None):
    return row[name] if name in row.keys() else default


def month_and_year(raw_month, fallback_year: int) -> tuple[int | None, int | None]:
    if raw_month is None:
        return None, None
    text = str(raw_month).strip()
    try:
        month = int(text)
        return month if 1 <= month <= 12 else None, fallback_year
    except ValueError:
        pass
    try:
        parsed = datetime.strptime(text, "%B %Y")
        return parsed.month, parsed.year
    except ValueError:
        return None, None


def is_v2_database(connection: sqlite3.Connection) -> bool:
    tables = {
        row[0]
        for row in connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        )
    }
    if "academic_years" not in tables or "students" not in tables:
        return False
    class_columns = {
        row[1]
        for row in connection.execute("PRAGMA table_info(classes)")
    }
    student_columns = {
        row[1]
        for row in connection.execute("PRAGMA table_info(students)")
    }
    return (
        "total_strength" in class_columns
        and "academic_year_id" in student_columns
        and "father_name" in student_columns
    )


def migrate() -> None:
    source = database_path()
    if not source.exists():
        raise FileNotFoundError(f"Database not found: {source}")

    existing = sqlite3.connect(source)
    try:
        if is_v2_database(existing):
            existing.execute(
                """CREATE TABLE IF NOT EXISTS class_roll_sequences (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    class_id INTEGER NOT NULL,
                    academic_year_id INTEGER NOT NULL,
                    next_roll_number INTEGER NOT NULL DEFAULT 1,
                    UNIQUE(class_id, academic_year_id)
                )"""
            )
            existing.execute(
                """INSERT OR IGNORE INTO class_roll_sequences
                   (class_id, academic_year_id, next_roll_number)
                   SELECT class_id, academic_year_id, COALESCE(MAX(roll_number), 0) + 1
                   FROM students
                   WHERE roll_number IS NOT NULL
                   GROUP BY class_id, academic_year_id"""
            )
            existing.commit()
            print(f"Database is already using the v2 schema: {source}")
            return
    finally:
        existing.close()

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = source.with_name(f"{source.stem}_v1_backup_{timestamp}{source.suffix}")
    temporary = source.with_name(f"{source.stem}_v2_tmp{source.suffix}")
    shutil.copy2(source, backup)
    if temporary.exists():
        temporary.unlink()

    old = sqlite3.connect(source)
    old.row_factory = sqlite3.Row
    new_engine = create_engine(f"sqlite:///{temporary.as_posix()}")
    Base.metadata.create_all(bind=new_engine)
    new = sqlite3.connect(temporary)
    new.row_factory = sqlite3.Row
    new.execute("PRAGMA foreign_keys = ON")

    try:
        new.execute("BEGIN")
        users = old.execute("SELECT * FROM users").fetchall()
        new.executemany(
            """INSERT INTO users
               (id, email, password_hash, role, full_name, is_active, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            [
                (
                    row["id"],
                    row["email"],
                    row["password_hash"],
                    row["role"],
                    row["full_name"],
                    row["is_active"],
                    row["created_at"],
                    row["updated_at"],
                )
                for row in users
            ],
        )

        old_classes = old.execute("SELECT * FROM classes ORDER BY id").fetchall()
        year_names = {
            (value(row, "academic_year") or "2024-2025")
            for row in old_classes
        }
        year_ids: dict[str, int] = {}
        for year_name in sorted(year_names):
            start_year = int(year_name[:4])
            new.execute(
                """INSERT INTO academic_years
                   (year_name, start_date, end_date, is_current, is_active)
                   VALUES (?, ?, ?, ?, 1)""",
                (
                    year_name,
                    f"{start_year}-04-01",
                    f"{start_year + 1}-03-31",
                    int(year_name == "2024-2025"),
                ),
            )
            year_ids[year_name] = new.execute("SELECT last_insert_rowid()").fetchone()[0]
        if not year_ids:
            new.execute(
                """INSERT INTO academic_years
                   (year_name, start_date, end_date, is_current, is_active)
                   VALUES ('2024-2025', '2024-04-01', '2025-03-31', 1, 1)"""
            )
            year_ids["2024-2025"] = new.execute("SELECT last_insert_rowid()").fetchone()[0]

        teacher_ids: dict[int, int] = {}
        for row in old.execute("SELECT * FROM users WHERE role = 'teacher'").fetchall():
            new.execute(
                """INSERT INTO teachers (teacher_code, full_name, email, is_active)
                   VALUES (?, ?, ?, ?)""",
                (f"TCH_{row['id']:03d}", row["full_name"], row["email"], row["is_active"]),
            )
            teacher_ids[row["id"]] = new.execute("SELECT last_insert_rowid()").fetchone()[0]

        for row in old_classes:
            year_name = value(row, "academic_year") or "2024-2025"
            new.execute(
                """INSERT INTO classes
                   (id, name, section, total_strength, is_active, created_at, updated_at)
                   VALUES (?, ?, ?, ?, 1, ?, ?)""",
                (
                    row["id"],
                    row["name"],
                    row["section"],
                    value(row, "capacity", 50),
                    row["created_at"],
                    row["updated_at"],
                ),
            )
            old_teacher_id = value(row, "class_teacher_id")
            if old_teacher_id in teacher_ids:
                new.execute(
                    """INSERT OR IGNORE INTO class_teacher_assignments
                       (class_id, teacher_id, academic_year_id, assignment_date, is_current)
                       VALUES (?, ?, ?, ?, 1)""",
                    (
                        row["id"],
                        teacher_ids[old_teacher_id],
                        year_ids[year_name],
                        date.today().isoformat(),
                    ),
                )

        old_students = old.execute("SELECT * FROM students ORDER BY id").fetchall()
        student_ids: dict[int, str] = {}
        for number, row in enumerate(old_students, start=1):
            student_id = f"STUD_{number:04d}"
            student_ids[row["id"]] = student_id
            class_year = old.execute(
                "SELECT academic_year FROM classes WHERE id = ?",
                (row["class_id"],),
            ).fetchone()
            year_name = (class_year["academic_year"] if class_year else None) or "2024-2025"
            new.execute(
                """INSERT INTO students
                   (id, name, roll_number, class_id, academic_year_id, date_of_birth,
                    gender, parent_name, contact_number, email, address, city,
                    admission_date, is_active, notes, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    student_id,
                    row["name"],
                    int(row["roll_number"]) if str(row["roll_number"]).isdigit() else None,
                    row["class_id"],
                    year_ids[year_name],
                    row["date_of_birth"],
                    row["gender"],
                    row["parent_name"],
                    row["contact_number"],
                    row["email"],
                    row["address"],
                    row["city"],
                    row["admission_date"],
                    row["is_active"],
                    row["notes"],
                    row["created_at"],
                    row["updated_at"],
                ),
            )

        subjects: dict[tuple[int, str], int] = {}
        old_subjects = old.execute("SELECT * FROM subjects").fetchall()
        for class_row in old_classes:
            for subject in old_subjects:
                name = subject["name"]
                new.execute(
                    "INSERT OR IGNORE INTO subjects (class_id, name) VALUES (?, ?)",
                    (class_row["id"], name),
                )
                subject_id = new.execute(
                    "SELECT id FROM subjects WHERE class_id = ? AND name = ?",
                    (class_row["id"], name),
                ).fetchone()[0]
                subjects[(class_row["id"], name)] = subject_id

        old_subject_names = {
            row["id"]: row["name"] for row in old_subjects
        }
        for row in old.execute("SELECT * FROM attendance").fetchall():
            new.execute(
                """INSERT OR IGNORE INTO attendance
                   (id, student_id, class_id, attendance_date, status, remarks, marked_by,
                    created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    row["id"],
                    student_ids[row["student_id"]],
                    row["class_id"],
                    row["attendance_date"],
                    row["status"],
                    row["remarks"],
                    row["marked_by"],
                    row["created_at"],
                    row["updated_at"],
                ),
            )

        for row in old.execute("SELECT * FROM exams").fetchall():
            new.execute(
                """INSERT OR IGNORE INTO exam_types
                   (name, default_total_marks, is_active)
                   VALUES (?, ?, 1)""",
                (row["name"], row["total_marks"] or 100),
            )
        for row in old.execute("SELECT * FROM exam_marks").fetchall():
            student_row = old.execute(
                "SELECT class_id FROM students WHERE id = ?",
                (row["student_id"],),
            ).fetchone()
            if not student_row:
                continue
            exam_row = old.execute(
                "SELECT * FROM exams WHERE id = ?", (row["exam_id"],)
            ).fetchone()
            if not exam_row:
                continue
            subject_name = old_subject_names.get(row["subject_id"])
            if subject_name is None:
                subject_name = old_subjects[0]["name"] if old_subjects else "General"
                new.execute(
                    "INSERT OR IGNORE INTO subjects (class_id, name) VALUES (?, ?)",
                    (student_row["class_id"], subject_name),
                )
                subject_id = new.execute(
                    "SELECT id FROM subjects WHERE class_id = ? AND name = ?",
                    (student_row["class_id"], subject_name),
                ).fetchone()[0]
            else:
                subject_id = subjects[(student_row["class_id"], subject_name)]
            total_marks = exam_row["total_marks"] or 100
            gained_marks = row["marks_obtained"]
            percentage = (
                round((gained_marks / total_marks) * 100, 2)
                if gained_marks is not None and total_marks
                else None
            )
            grade = (
                "A" if percentage >= 80 else
                "B" if percentage >= 60 else
                "C" if percentage >= 40 else
                "F"
            ) if percentage is not None else None
            year_id = year_ids["2024-2025"]
            new.execute(
                """INSERT OR IGNORE INTO exam_records
                   (id, student_id, class_id, subject_id, exam_type, total_marks,
                    gained_marks, percentage, grade, exam_date, remarks,
                    academic_year_id, created_by, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    row["id"],
                    student_ids[row["student_id"]],
                    student_row["class_id"],
                    subject_id,
                    exam_row["name"],
                    total_marks,
                    gained_marks,
                    percentage,
                    grade,
                    exam_row["exam_date"],
                    row["remarks"],
                    year_id,
                    row["created_by"] or exam_row["created_by"],
                    row["created_at"],
                    row["updated_at"],
                ),
            )

        fee_charges: dict[tuple[int, str, int], int] = {}
        old_fees = old.execute("SELECT * FROM fees").fetchall()
        fallback_year = 2024
        for row in old_fees:
            student_id = student_ids[row["student_id"]]
            student_row = old.execute(
                "SELECT class_id FROM students WHERE id = ?", (row["student_id"],)
            ).fetchone()
            class_id = student_row["class_id"]
            year_name = "2024-2025"
            academic_year_id = year_ids[year_name]
            charge_key = (class_id, row["fee_type"], academic_year_id)
            if charge_key not in fee_charges:
                new.execute(
                    """INSERT INTO fee_charges
                       (class_id, charge_name, amount, charge_type, academic_year_id)
                       VALUES (?, ?, ?, 'monthly', ?)""",
                    (class_id, row["fee_type"], row["amount"], academic_year_id),
                )
                fee_charges[charge_key] = new.execute(
                    "SELECT last_insert_rowid()"
                ).fetchone()[0]
            month, year = month_and_year(row["month"], fallback_year)
            new.execute(
                """INSERT OR IGNORE INTO fees
                   (student_id, fee_charge_id, month, year, due_date, amount, status,
                    paid_amount, paid_date, payment_method, transaction_id, remarks,
                    created_by, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    student_id,
                    fee_charges[charge_key],
                    month,
                    year,
                    row["due_date"] or date.today().isoformat(),
                    row["amount"],
                    row["status"] or "pending",
                    row["amount"] if row["status"] == "paid" else 0,
                    row["paid_date"],
                    row["payment_method"],
                    row["transaction_id"],
                    row["remarks"],
                    row["created_by"],
                    row["created_at"],
                    row["updated_at"],
                ),
            )

        for row in old.execute("SELECT * FROM audit_logs").fetchall():
            new.execute(
                """INSERT OR IGNORE INTO audit_logs
                   (id, user_id, action, table_name, record_id, old_values, new_values, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    row["id"],
                    row["user_id"],
                    row["action"],
                    row["table_name"],
                    str(row["record_id"]) if row["record_id"] is not None else None,
                    row["old_values"],
                    row["new_values"],
                    row["created_at"],
                ),
            )

        new.execute(
            """INSERT OR IGNORE INTO class_roll_sequences
               (class_id, academic_year_id, next_roll_number)
               SELECT class_id, academic_year_id, COALESCE(MAX(roll_number), 0) + 1
               FROM students
               WHERE roll_number IS NOT NULL
               GROUP BY class_id, academic_year_id"""
        )
        new.commit()
        old.close()
        new.close()
        new_engine.dispose()
        shutil.move(temporary, source)
    except Exception:
        if new.in_transaction:
            new.rollback()
        new.close()
        old.close()
        new_engine.dispose()
        temporary.unlink(missing_ok=True)
        raise

    print(f"Migration complete: {source}")
    print(f"Backup created: {backup}")


if __name__ == "__main__":
    migrate()

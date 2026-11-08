from __future__ import annotations

from typing import Optional
from sqlalchemy import func
from sqlalchemy.orm import Session
import re

from backend.app.models import ClassRollSequence, Student


def allocate_roll_number(
    db: Session,
    class_id: int,
    academic_year_id: int,
) -> int:
    """Allocate the next roll number for one class and academic year."""
    sequence = (
        db.query(ClassRollSequence)
        .filter(
            ClassRollSequence.class_id == class_id,
            ClassRollSequence.academic_year_id == academic_year_id,
        )
        .with_for_update()
        .first()
    )
    if sequence is None:
        maximum = (
            db.query(func.max(Student.roll_number))
            .filter(
                Student.class_id == class_id,
                Student.academic_year_id == academic_year_id,
            )
            .scalar()
        )
        roll_number = (maximum or 0) + 1
        sequence = ClassRollSequence(
            class_id=class_id,
            academic_year_id=academic_year_id,
            next_roll_number=roll_number + 1,
        )
        db.add(sequence)
    else:
        roll_number = sequence.next_roll_number
        sequence.next_roll_number += 1
    db.flush()
    return roll_number


def synchronize_roll_sequences(db: Session) -> None:
    """Create or advance sequences to follow existing student roll numbers."""
    groups = (
        db.query(
            Student.class_id,
            Student.academic_year_id,
            func.max(Student.roll_number),
        )
        .filter(Student.roll_number.is_not(None))
        .group_by(Student.class_id, Student.academic_year_id)
        .all()
    )
    for class_id, academic_year_id, maximum in groups:
        sequence = (
            db.query(ClassRollSequence)
            .filter(
                ClassRollSequence.class_id == class_id,
                ClassRollSequence.academic_year_id == academic_year_id,
            )
            .first()
        )
        required_next = maximum + 1
        if sequence is None:
            db.add(
                ClassRollSequence(
                    class_id=class_id,
                    academic_year_id=academic_year_id,
                    next_roll_number=required_next,
                )
            )
        elif sequence.next_roll_number < required_next:
            sequence.next_roll_number = required_next


def extract_roll_sequence(value: str) -> Optional[int]:
    """Extract a numeric sequence from a plain or formatted school roll number."""
    cleaned = value.strip()
    if cleaned.isdigit():
        return int(cleaned)
    match = re.search(r"-(\d+)$", cleaned)
    return int(match.group(1)) if match else None

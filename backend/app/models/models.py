from datetime import date

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from backend.app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)
    full_name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    audit_logs = relationship("AuditLog", back_populates="user")


class AcademicYear(Base):
    __tablename__ = "academic_years"

    id = Column(Integer, primary_key=True, autoincrement=True)
    year_name = Column(String(20), unique=True, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_current = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    students = relationship("Student", back_populates="academic_year")


class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    teacher_code = Column(String(20), unique=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255))
    phone_number = Column(String(50))
    date_of_birth = Column(Date)
    gender = Column(String(20))
    qualification = Column(String(255))
    specialization = Column(String(255))
    date_of_joining = Column(Date)
    salary = Column(Float)
    total_periods_per_week = Column(Integer, default=30)
    is_active = Column(Boolean, default=True)
    bank_account = Column(String(100))
    bank_name = Column(String(100))
    address = Column(Text)
    city = Column(String(100))
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Class(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    section = Column(String(20))
    total_strength = Column(Integer, default=50)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    students = relationship("Student", back_populates="student_class")
    timetable_entries = relationship("Timetable", back_populates="class_obj")


class Student(Base):
    __tablename__ = "students"

    id = Column(String(20), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    roll_number = Column(Integer)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=False)
    date_of_birth = Column(Date)
    gender = Column(String(20))
    parent_name = Column(String(255))
    father_name = Column(String(255))
    mother_name = Column(String(255))
    contact_number = Column(String(50))
    email = Column(String(255))
    address = Column(Text)
    city = Column(String(100))
    admission_date = Column(Date, nullable=False, default=date.today)
    is_active = Column(Boolean, default=True)
    concession_type = Column(String(50), default="None")
    discount_percentage = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint(
            "roll_number",
            "class_id",
            "academic_year_id",
            name="uq_student_roll_class_year",
        ),
    )
    student_class = relationship("Class", back_populates="students")
    academic_year = relationship("AcademicYear", back_populates="students")
    fees = relationship("Fee", back_populates="student")
    attendances = relationship("Attendance", back_populates="student")
    exam_records = relationship("ExamRecord", back_populates="student")


class ClassRollSequence(Base):
    __tablename__ = "class_roll_sequences"

    id = Column(Integer, primary_key=True, autoincrement=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=False)
    next_roll_number = Column(Integer, nullable=False, default=1)
    __table_args__ = (
        UniqueConstraint(
            "class_id",
            "academic_year_id",
            name="uq_roll_sequence_class_year",
        ),
    )


class ClassTeacherAssignment(Base):
    __tablename__ = "class_teacher_assignments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=False)
    assignment_date = Column(Date, nullable=False)
    is_current = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    __table_args__ = (
        UniqueConstraint("class_id", "academic_year_id", name="uq_class_teacher_year"),
    )


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=True)
    name = Column(String(100), nullable=False)
    max_marks = Column(Integer, default=100, nullable=False)
    enrollment_limit = Column(Integer, default=100, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    __table_args__ = (
        UniqueConstraint("class_id", "name", name="uq_subject_class_name"),
    )


class FeeCharge(Base):
    __tablename__ = "fee_charges"

    id = Column(Integer, primary_key=True, autoincrement=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    charge_name = Column(String(255), nullable=False)
    amount = Column(Float, nullable=False)
    charge_type = Column(String(30), nullable=False)
    applicable_from_month = Column(Integer)
    applicable_to_month = Column(Integer)
    is_mandatory = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class StudentFeePlan(Base):
    __tablename__ = "student_fee_plans"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String(20), ForeignKey("students.id"), nullable=False)
    fee_charge_id = Column(Integer, ForeignKey("fee_charges.id"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=False)
    amount = Column(Float, nullable=False)
    is_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    __table_args__ = (
        UniqueConstraint(
            "student_id",
            "fee_charge_id",
            "academic_year_id",
            name="uq_student_fee_plan_charge_year",
        ),
    )


class Fee(Base):
    __tablename__ = "fees"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String(20), ForeignKey("students.id"), nullable=False)
    fee_charge_id = Column(Integer, ForeignKey("fee_charges.id"), nullable=False)
    month = Column(Integer)
    year = Column(Integer)
    due_date = Column(Date, nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String(50), default="pending")
    paid_amount = Column(Float, default=0)
    paid_date = Column(Date)
    payment_method = Column(String(50))
    transaction_id = Column(String(100))
    remarks = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    __table_args__ = (
        UniqueConstraint(
            "student_id",
            "fee_charge_id",
            "month",
            "year",
            name="uq_student_charge_month_year",
        ),
    )
    student = relationship("Student", back_populates="fees")


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String(20), ForeignKey("students.id"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    attendance_date = Column(Date, nullable=False)
    status = Column(String(50), nullable=False)
    remarks = Column(Text)
    marked_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    __table_args__ = (
        UniqueConstraint("student_id", "attendance_date", name="uq_student_attendance_date"),
    )
    student = relationship("Student", back_populates="attendances")
    class_obj = relationship("Class")
    user = relationship("User")


class ExamType(Base):
    __tablename__ = "exam_types"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    default_total_marks = Column(Integer, default=100, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class ExamRecord(Base):
    __tablename__ = "exam_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String(20), ForeignKey("students.id"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    exam_type = Column(String(100), nullable=False)
    total_marks = Column(Integer, nullable=False)
    gained_marks = Column(Float)
    percentage = Column(Float)
    grade = Column(String(5))
    exam_date = Column(Date)
    remarks = Column(Text)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    __table_args__ = (
        UniqueConstraint(
            "student_id",
            "exam_type",
            "subject_id",
            "academic_year_id",
            name="uq_student_exam_subject_year",
        ),
    )
    student = relationship("Student", back_populates="exam_records")


class ExamSchedule(Base):
    __tablename__ = "exam_schedules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    exam_name = Column(String(150), nullable=False)
    subject_name = Column(String(150), nullable=False)
    exam_date = Column(Date, nullable=False)
    day = Column(String(30), nullable=False)
    start_time = Column(String(30), default="09:00 AM")
    end_time = Column(String(30), default="12:00 PM")
    time_slot = Column(String(60), default="09:00 AM - 12:00 PM")
    total_marks = Column(Integer, default=100)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    class_obj = relationship("Class")


class Timetable(Base):
    __tablename__ = "timetable"

    id = Column(Integer, primary_key=True, autoincrement=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    day_of_week = Column(String(50), nullable=False)
    period_number = Column(Integer, nullable=False)
    start_time = Column(String(20))
    end_time = Column(String(20))
    room_number = Column(String(50))
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    __table_args__ = (
        UniqueConstraint(
            "class_id",
            "day_of_week",
            "period_number",
            "academic_year_id",
            name="uq_timetable_class_day_period_year",
        ),
    )
    class_obj = relationship("Class", back_populates="timetable_entries")
    subject = relationship("Subject")
    teacher = relationship("Teacher")
    academic_year = relationship("AcademicYear")


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    role = Column(String(50), nullable=False)
    resource = Column(String(50), nullable=False)
    action = Column(String(50), nullable=False)
    __table_args__ = (
        UniqueConstraint("role", "resource", "action", name="uq_role_resource_action"),
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(100), nullable=False)
    table_name = Column(String(100))
    record_id = Column(String(50))
    old_values = Column(Text)
    new_values = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    user = relationship("User", back_populates="audit_logs")

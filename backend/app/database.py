from datetime import date
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from backend.app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
    echo=False,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def sync_database_schema(target_engine=None) -> list[str]:
    """Safely synchronize the database schema with SQLAlchemy models without data loss:
    1. Creates any missing tables (Base.metadata.create_all).
    2. Detects missing columns in existing tables and adds them via ALTER TABLE ADD COLUMN.
    3. Populates appropriate scalar or constant default values.
    4. If the schema is already up to date, leaves all tables and rows completely untouched.
    Returns a list of descriptions of any changes made (empty list if already up to date).
    """
    from sqlalchemy import inspect, text

    eng = target_engine or engine
    inspector = inspect(eng)
    existing_tables = set(inspector.get_table_names())
    is_sqlite = eng.url.get_backend_name() == "sqlite"

    # First, create any tables that don't exist yet
    Base.metadata.create_all(bind=eng)

    changes_applied = []

    with eng.connect() as conn:
        for t_name, table in Base.metadata.tables.items():
            if t_name in existing_tables:
                existing_cols = {c["name"] for c in inspector.get_columns(t_name)}
                for col in table.columns:
                    if col.name not in existing_cols:
                        col_type = col.type.compile(eng.dialect)
                        default_clause = ""
                        scalar_val = None

                        # In SQLite ALTER TABLE ADD COLUMN, default must be a literal constant
                        if col.default is not None and getattr(col.default, "is_scalar", False):
                            scalar_val = col.default.arg
                            if isinstance(scalar_val, str):
                                default_clause = f" DEFAULT '{scalar_val}'"
                            elif isinstance(scalar_val, bool):
                                default_clause = " DEFAULT 1" if scalar_val else " DEFAULT 0"
                            elif scalar_val is not None:
                                default_clause = f" DEFAULT {scalar_val}"
                        elif not col.nullable and is_sqlite:
                            col_upper = str(col_type).upper()
                            if any(k in col_upper for k in ["INT", "FLOAT", "NUMERIC", "REAL"]):
                                default_clause = " DEFAULT 0"
                            elif "BOOL" in col_upper:
                                default_clause = " DEFAULT 0"
                            else:
                                default_clause = " DEFAULT ''"

                        alter_sql = f"ALTER TABLE {t_name} ADD COLUMN {col.name} {col_type}{default_clause}"
                        conn.execute(text(alter_sql))
                        change_desc = f"Added column '{col.name}' ({col_type}) to table '{t_name}'"
                        changes_applied.append(change_desc)

                        # Backfill existing rows if scalar default was defined
                        if scalar_val is not None:
                            conn.execute(
                                text(f"UPDATE {t_name} SET {col.name} = :val WHERE {col.name} IS NULL"),
                                {"val": scalar_val},
                            )
                        elif col.server_default is not None and any(
                            k in str(col_type).upper() for k in ["DATETIME", "TIMESTAMP"]
                        ):
                            conn.execute(
                                text(f"UPDATE {t_name} SET {col.name} = CURRENT_TIMESTAMP WHERE {col.name} IS NULL")
                            )

        conn.commit()

    return changes_applied


def init_database():
    """Create the v2 schema and seed safe development defaults with Pakistani names."""
    import backend.app.models as models
    from backend.app.utils.security import hash_password
    from backend.app.utils.roll_numbers import synchronize_roll_sequences

    sync_database_schema(engine)
    with SessionLocal() as db:
        if db.query(models.Permission).count() == 0:
            seed_permissions(db)
        ensure_phase_one_permissions(db)
        seed_default_users(db, hash_password)
        academic_year = get_or_create_current_year(db)
        if db.query(models.Class).count() == 0:
            seed_classes(db)
        if db.query(models.Subject).count() == 0:
            seed_subjects(db)
        if db.query(models.ExamType).count() == 0:
            db.add_all(
                [
                    models.ExamType(name="1st Term", default_total_marks=50),
                    models.ExamType(name="2nd Term", default_total_marks=50),
                    models.ExamType(name="Final Term", default_total_marks=100),
                    models.ExamType(name="Board Exam", default_total_marks=100),
                ]
            )
        synchronize_roll_sequences(db)
        db.commit()


def get_or_create_current_year(db: Session):
    import backend.app.models as models

    current = db.query(models.AcademicYear).filter(models.AcademicYear.is_current.is_(True)).first()
    if current:
        return current
    current = models.AcademicYear(
        year_name="2024-2025",
        start_date=date(2024, 4, 1),
        end_date=date(2025, 3, 31),
        is_current=True,
    )
    db.add(current)
    db.flush()
    return current


def seed_default_users(db: Session, hash_func):
    import backend.app.models as models
    from backend.app.utils.security import verify_password

    users = [
        ("admin@school.com", "admin123", "admin", "Muhammad Usman"),
        ("teacher@school.com", "teacher123", "teacher", "Ms. Sana Tariq"),
        ("accountant@school.com", "accountant123", "accountant", "Kamran Bashir"),
        ("principal@school.com", "principal123", "principal", "Dr. Nasir Mehmood"),
    ]
    for email, password, role, full_name in users:
        user = db.query(models.User).filter(models.User.email == email).first()
        if user is None:
            db.add(
                models.User(
                    email=email,
                    password_hash=hash_func(password),
                    role=role,
                    full_name=full_name,
                    is_active=True,
                )
            )
        # If the user already exists, strictly preserve their chosen password hash
        # and profile settings; never reset to seed defaults on restart.
        pass


def seed_teachers(db: Session):
    import backend.app.models as models

    pakistani_faculty = [
        {
            "teacher_code": "TCH_001",
            "full_name": "Ms. Sana Tariq",
            "email": "sana.tariq@littlescholar.edu.pk",
            "phone_number": "+92 300 1234567",
            "qualification": "M.Sc. Mathematics",
            "specialization": "Mathematics & Class Incharge",
            "salary": 65000.0,
            "total_periods_per_week": 30,
            "city": "Lahore",
            "notes": "Class 1-A Incharge & Senior Math Faculty",
        },
        {
            "teacher_code": "TCH_002",
            "full_name": "Mr. Tariq Mehmood",
            "email": "tariq.mehmood@littlescholar.edu.pk",
            "phone_number": "+92 301 2345678",
            "qualification": "M.A. English Literature",
            "specialization": "English Language & Literature",
            "salary": 60000.0,
            "total_periods_per_week": 28,
            "city": "Lahore",
            "notes": "Middle School English Incharge",
        },
        {
            "teacher_code": "TCH_003",
            "full_name": "Ms. Ayesha Siddiqa",
            "email": "ayesha.siddiqa@littlescholar.edu.pk",
            "phone_number": "+92 302 3456789",
            "qualification": "M.Phil Urdu Adab",
            "specialization": "Urdu Language & Nazm",
            "salary": 58000.0,
            "total_periods_per_week": 26,
            "city": "Lahore",
            "notes": "Head of Urdu Department",
        },
        {
            "teacher_code": "TCH_004",
            "full_name": "Mr. Muhammad Bilal",
            "email": "muhammad.bilal@littlescholar.edu.pk",
            "phone_number": "+92 303 4567890",
            "qualification": "M.Sc. Physics",
            "specialization": "General Science & Physics",
            "salary": 62000.0,
            "total_periods_per_week": 30,
            "city": "Lahore",
            "notes": "Science Lab Director",
        },
        {
            "teacher_code": "TCH_005",
            "full_name": "Ms. Fatima Zahra",
            "email": "fatima.zahra@littlescholar.edu.pk",
            "phone_number": "+92 304 5678901",
            "qualification": "M.Sc. Chemistry & Biology",
            "specialization": "Biology & Chemistry",
            "salary": 60000.0,
            "total_periods_per_week": 28,
            "city": "Lahore",
            "notes": "Matric Board Exam Mentor",
        },
        {
            "teacher_code": "TCH_006",
            "full_name": "Mr. Abdul Rehman",
            "email": "abdul.rehman@littlescholar.edu.pk",
            "phone_number": "+92 305 6789012",
            "qualification": "M.A. Islamic Studies",
            "specialization": "Islamiyat & Pakistan Studies",
            "salary": 55000.0,
            "total_periods_per_week": 26,
            "city": "Lahore",
            "notes": "Ethics & Tarbiyah Coordinator",
        },
        {
            "teacher_code": "TCH_007",
            "full_name": "Mr. Farhan Saeed",
            "email": "farhan.saeed@littlescholar.edu.pk",
            "phone_number": "+92 306 7890123",
            "qualification": "BS Computer Science",
            "specialization": "Computer Science & IT",
            "salary": 65000.0,
            "total_periods_per_week": 28,
            "city": "Lahore",
            "notes": "Computer Lab Administrator",
        },
        {
            "teacher_code": "TCH_008",
            "full_name": "Ms. Noreen Akhtar",
            "email": "noreen.akhtar@littlescholar.edu.pk",
            "phone_number": "+92 307 8901234",
            "qualification": "Montessori Diploma & B.Ed",
            "specialization": "Early Childhood Education",
            "salary": 55000.0,
            "total_periods_per_week": 30,
            "city": "Lahore",
            "notes": "Junior Wing Section Coordinator",
        },
    ]

    for item in pakistani_faculty:
        existing = db.query(models.Teacher).filter(models.Teacher.teacher_code == item["teacher_code"]).first()
        if existing is None:
            db.add(models.Teacher(**item, is_active=True))
        else:
            for k, v in item.items():
                setattr(existing, k, v)


def seed_classes(db: Session):
    import backend.app.models as models

    classes_list = [
        ("Playgroup", "A"),
        ("Nursery", "A"),
        ("Prep", "A"),
        ("Class 1", "A"),
        ("Class 1", "B"),
        ("Class 2", "A"),
        ("Class 3", "A"),
        ("Class 4", "A"),
        ("Class 5", "A"),
        ("Class 6", "A"),
        ("Class 7", "A"),
        ("Class 8", "A"),
        ("Class 9", "A"),
        ("Class 10", "A"),
        ("Class 10", "B"),
    ]
    for name, sec in classes_list:
        db.add(models.Class(name=name, section=sec, total_strength=40, is_active=True))
    db.flush()


def seed_subjects(db: Session):
    import backend.app.models as models

    class_ids = [row.id for row in db.query(models.Class.id).all()]
    for class_id in class_ids:
        db.add_all(
            [
                models.Subject(class_id=class_id, name="Mathematics"),
                models.Subject(class_id=class_id, name="English"),
                models.Subject(class_id=class_id, name="Urdu"),
                models.Subject(class_id=class_id, name="General Science"),
                models.Subject(class_id=class_id, name="Islamiyat"),
            ]
        )


def seed_students(db: Session, academic_year_id: int):
    import backend.app.models as models

    pakistani_students = [
        ("Muhammad Ali", 1, "Tariq Mehmood", "Class 1"),
        ("Fatima Zahra", 2, "Ahmed Bashir", "Class 1"),
        ("Ayesha Khan", 3, "Imran Khan", "Class 1"),
        ("Bilal Ahmed", 4, "Ahmed Raza", "Class 1"),
        ("Zainab Bibi", 5, "Malik Javed", "Class 1"),
        ("Hamza Tariq", 6, "Tariq Hussain", "Class 1"),
        ("Usman Malik", 7, "Malik Arshad", "Class 1"),
        ("Sana Javed", 8, "Javed Iqbal", "Class 1"),
        ("Mariam Noor", 9, "Noor Muhammad", "Class 1"),
        ("Hassan Raza", 10, "Raza Abbas", "Class 1"),
    ]

    first_class = db.query(models.Class).filter(models.Class.name == "Class 1").first()
    first_class_id = first_class.id if first_class else 1

    for idx, (name, roll, parent, _) in enumerate(pakistani_students, start=1):
        db.add(
            models.Student(
                id=f"STUD_{idx:04d}",
                name=name,
                roll_number=roll,
                class_id=first_class_id,
                academic_year_id=academic_year_id,
                parent_name=parent,
                admission_date=date(2024, 4, 15),
            )
        )


def seed_permissions(db: Session):
    resources = [
        "users",
        "students",
        "teachers",
        "classes",
        "academic-years",
        "fee-charges",
        "fees",
        "attendance",
        "exam-records",
        "timetable",
        "reports",
        "audit-logs",
    ]
    actions = ["create", "read", "update", "delete"]
    permissions = []
    for resource in resources:
        for action in actions:
            permissions.append({"role": "admin", "resource": resource, "action": action})
    permissions.extend(
        [
            {"role": "teacher", "resource": "students", "action": "read"},
            {"role": "teacher", "resource": "attendance", "action": "create"},
            {"role": "teacher", "resource": "attendance", "action": "read"},
            {"role": "teacher", "resource": "exam-records", "action": "create"},
            {"role": "teacher", "resource": "exam-records", "action": "read"},
            {"role": "teacher", "resource": "timetable", "action": "read"},
            {"role": "teacher", "resource": "teachers", "action": "read"},
            {"role": "staff", "resource": "attendance", "action": "create"},
            {"role": "staff", "resource": "students", "action": "read"},
            {"role": "accountant", "resource": "students", "action": "read"},
            {"role": "accountant", "resource": "fees", "action": "create"},
            {"role": "accountant", "resource": "fees", "action": "read"},
            {"role": "accountant", "resource": "fees", "action": "update"},
        ]
    )
    import backend.app.models as models

    db.bulk_insert_mappings(models.Permission, permissions)


def ensure_phase_one_permissions(db: Session):
    import backend.app.models as models

    permissions = [
        ("principal", "teachers", "read"),
        ("teacher", "teachers", "read"),
        ("principal", "academic-years", "read"),
        ("teacher", "academic-years", "read"),
        ("principal", "classes", "read"),
        ("teacher", "classes", "read"),
        ("principal", "students", "read"),
        ("principal", "students", "create"),
        ("principal", "students", "update"),
        ("principal", "attendance", "read"),
        ("principal", "exam-records", "read"),
        ("principal", "exam-records", "create"),
        ("principal", "exam-records", "update"),
        ("principal", "timetable", "read"),
        ("principal", "fees", "read"),
        ("principal", "fee-charges", "read"),
        ("accountant", "fee-charges", "read"),
        ("accountant", "fee-charges", "create"),
        ("accountant", "fee-charges", "update"),
        ("accountant", "fees", "delete"),
        ("accountant", "classes", "read"),
        ("accountant", "academic-years", "read"),
        ("principal", "reports", "read"),
        ("teacher", "reports", "read"),
        ("accountant", "reports", "read"),
    ]
    for role, resource, action in permissions:
        exists = (
            db.query(models.Permission)
            .filter_by(role=role, resource=resource, action=action)
            .first()
        )
        if exists is None:
            db.add(
                models.Permission(role=role, resource=resource, action=action)
            )


def seed_fee_charges(db: Session, academic_year_id: int):
    import backend.app.models as models

    classes = db.query(models.Class).all()
    for c in classes:
        name_lower = c.name.lower()
        if any(lvl in name_lower for lvl in ["playgroup", "nursery", "prep", "class 1", "class 2", "class 3", "class 4"]):
            tuition = 3500.0
        elif any(lvl in name_lower for lvl in ["class 5", "class 6", "class 7", "class 8"]):
            tuition = 4500.0
        else:
            tuition = 5500.0

        db.add(
            models.FeeCharge(
                class_id=c.id,
                charge_name="Monthly Tuition Fee",
                amount=tuition,
                charge_type="monthly",
                is_mandatory=True,
                is_active=True,
                academic_year_id=academic_year_id,
            )
        )

        if "9" in c.name or "10" in c.name:
            db.add(
                models.FeeCharge(
                    class_id=c.id,
                    charge_name="Science & Computer Lab Fee",
                    amount=1200.0,
                    charge_type="monthly",
                    is_mandatory=True,
                    is_active=True,
                    academic_year_id=academic_year_id,
                )
            )

        db.add(
            models.FeeCharge(
                class_id=c.id,
                charge_name="Annual Exam & Stationery Charges",
                amount=2000.0,
                charge_type="yearly",
                applicable_from_month=4,
                is_mandatory=True,
                is_active=True,
                academic_year_id=academic_year_id,
            )
        )


def seed_timetables(db: Session, academic_year_id: int):
    import backend.app.models as models

    classes = db.query(models.Class).all()
    teachers = db.query(models.Teacher).all()
    if not classes or not teachers:
        return

    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    period_times = {
        1: ("08:00 AM", "08:45 AM"),
        2: ("08:45 AM", "09:30 AM"),
        3: ("09:30 AM", "10:15 AM"),
        4: ("10:45 AM", "11:30 AM"),
        5: ("11:30 AM", "12:15 PM"),
        6: ("12:15 PM", "01:00 PM"),
    }
    friday_period_times = {
        1: ("08:00 AM", "08:45 AM"),
        2: ("08:45 AM", "09:30 AM"),
        3: ("09:30 AM", "10:15 AM"),
        4: ("10:35 AM", "11:20 AM"),
        5: ("11:20 AM", "12:15 PM"),
    }

    for c in classes:
        subjects = db.query(models.Subject).filter(models.Subject.class_id == c.id).all()
        if not subjects:
            continue

        for d_idx, day in enumerate(days):
            max_p = 5 if day == "Friday" else 6
            for p in range(1, max_p + 1):
                subj = subjects[(p - 1 + d_idx) % len(subjects)]
                teacher = teachers[(c.id + p - 1) % len(teachers)]
                times = friday_period_times.get(p) if day == "Friday" else period_times.get(p)
                st, et = times if times else ("08:00 AM", "08:45 AM")

                db.add(
                    models.Timetable(
                        class_id=c.id,
                        subject_id=subj.id,
                        teacher_id=teacher.id,
                        day_of_week=day,
                        period_number=p,
                        start_time=st,
                        end_time=et,
                        room_number=f"Room {100 + c.id}",
                        academic_year_id=academic_year_id,
                    )
                )
    db.flush()


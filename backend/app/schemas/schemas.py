from datetime import datetime, date
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# -------------------------------------------------------------
# Auth Schemas
# -------------------------------------------------------------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    old_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6)


# -------------------------------------------------------------
# User Schemas
# -------------------------------------------------------------
class UserBase(BaseModel):
    email: EmailStr
    role: str = Field(..., description="Role: admin, teacher, accountant, or principal")
    full_name: str
    is_active: bool = True


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None


class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: Optional[str] = None
    user: UserOut


# -------------------------------------------------------------
# Permission Schemas
# -------------------------------------------------------------
class PermissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: str
    resource: str
    action: str


class CurrentUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    role: str
    full_name: str
    is_active: bool
    permissions: List[PermissionOut] = []


class MessageResponse(BaseModel):
    message: str


# -------------------------------------------------------------
# Teacher Schemas
# -------------------------------------------------------------
class TeacherBase(BaseModel):
    full_name: str = Field(..., min_length=1)
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    qualification: str = Field(..., min_length=1)
    specialization: Optional[str] = None
    date_of_joining: Optional[date] = None
    salary: Optional[float] = Field(None, ge=0)
    total_periods_per_week: int = Field(30, ge=0)
    bank_account: Optional[str] = None
    bank_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    notes: Optional[str] = None


class TeacherCreate(TeacherBase):
    pass


class TeacherUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1)
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    qualification: Optional[str] = Field(None, min_length=1)
    specialization: Optional[str] = None
    date_of_joining: Optional[date] = None
    salary: Optional[float] = Field(None, ge=0)
    total_periods_per_week: Optional[int] = Field(None, ge=0)
    bank_account: Optional[str] = None
    bank_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class TeacherOut(TeacherBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    teacher_code: str
    qualification: Optional[str] = None
    total_periods_per_week: Optional[int] = None
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class TeacherListResponse(BaseModel):
    total: int
    items: List[TeacherOut]


# -------------------------------------------------------------
# Academic Year and Class-Teacher Assignment Schemas
# -------------------------------------------------------------
class AcademicYearBase(BaseModel):
    year_name: str = Field(..., min_length=1, max_length=20)
    start_date: date
    end_date: date


class AcademicYearCreate(AcademicYearBase):
    pass


class AcademicYearUpdate(BaseModel):
    year_name: Optional[str] = Field(None, min_length=1, max_length=20)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None


class AcademicYearOut(AcademicYearBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_current: bool
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ClassTeacherAssignmentCreate(BaseModel):
    class_id: int
    teacher_id: int
    academic_year_id: int
    assignment_date: date


class ClassTeacherAssignmentOut(ClassTeacherAssignmentCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_current: bool
    teacher: TeacherOut
    class_name: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# -------------------------------------------------------------
# Class Schemas
# -------------------------------------------------------------
class ClassBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    section: Optional[str] = Field(None, max_length=20)
    capacity: int = Field(default=40, ge=1, le=100)
    total_strength: Optional[int] = Field(default=40, ge=1, le=100)
    academic_year: Optional[str] = "2024-2025"
    class_teacher_id: Optional[int] = None
    teacher_name: Optional[str] = None
    monthly_fee: Optional[float] = 0.0


class ClassCreate(ClassBase):
    pass


class ClassUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    section: Optional[str] = Field(None, max_length=20)
    capacity: Optional[int] = Field(None, ge=1, le=100)
    total_strength: Optional[int] = Field(None, ge=1, le=100)
    academic_year: Optional[str] = None
    class_teacher_id: Optional[int] = None
    teacher_name: Optional[str] = None
    monthly_fee: Optional[float] = None


class ClassOut(ClassBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    display_name: Optional[str] = None
    student_count: Optional[int] = 0
    teacher_name: Optional[str] = None
    monthly_fee: Optional[float] = 0.0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# -------------------------------------------------------------
# Student Schemas
# -------------------------------------------------------------
class StudentBase(BaseModel):
    name: str = Field(..., min_length=1)
    class_id: int
    roll_number: Optional[int] = Field(None, ge=1)
    academic_year_id: Optional[int] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    parent_name: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    admission_date: Optional[date] = None
    is_active: bool = True
    concession_type: Optional[str] = "None"
    discount_percentage: Optional[float] = Field(default=0.0, ge=0, le=100)
    discount_amount: Optional[float] = Field(default=0.0, ge=0)
    notes: Optional[str] = None


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    class_id: Optional[int] = None
    academic_year_id: Optional[int] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    parent_name: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    admission_date: Optional[date] = None
    is_active: Optional[bool] = None
    concession_type: Optional[str] = None
    discount_percentage: Optional[float] = Field(None, ge=0, le=100)
    discount_amount: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None


class StudentListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    roll_number: Optional[int] = None
    formatted_roll_number: Optional[str] = None
    class_id: int
    academic_year_id: Optional[int] = None
    academic_year_name: Optional[str] = None
    class_name: str
    section: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    parent_name: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    admission_date: Optional[date] = None
    is_active: bool
    concession_type: Optional[str] = "None"
    discount_percentage: Optional[float] = 0.0
    discount_amount: Optional[float] = 0.0
    attendance_percentage: Optional[float] = None
    fee_status: Optional[str] = None


class StudentDetail(StudentListItem):
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class StudentListResponse(BaseModel):
    total: int
    items: List[StudentListItem]


class AttendanceSummaryResponse(BaseModel):
    total_days: int
    present: int
    absent: int
    leave: int = 0
    percentage: float


class FeeStatusResponse(BaseModel):
    total_due: float
    pending_months: List[str]
    last_paid_date: Optional[str] = None
    status: str


class FeeChargeCreate(BaseModel):
    class_id: int
    academic_year_id: int
    charge_name: str = Field(..., min_length=1)
    amount: float = Field(..., gt=0)
    charge_type: str = Field(..., pattern="^(monthly|yearly|quarterly|one-time)$")
    applicable_from_month: Optional[int] = Field(None, ge=1, le=12)
    applicable_to_month: Optional[int] = Field(None, ge=1, le=12)
    is_mandatory: bool = True


class FeeChargeUpdate(BaseModel):
    charge_name: Optional[str] = Field(None, min_length=1)
    amount: Optional[float] = Field(None, gt=0)
    charge_type: Optional[str] = Field(None, pattern="^(monthly|yearly|quarterly|one-time)$")
    applicable_from_month: Optional[int] = Field(None, ge=1, le=12)
    applicable_to_month: Optional[int] = Field(None, ge=1, le=12)
    is_mandatory: Optional[bool] = None
    is_active: Optional[bool] = None


class FeeChargeOut(FeeChargeCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class StudentFeePlanItem(BaseModel):
    fee_charge_id: int
    amount: float = Field(..., ge=0)
    is_enabled: bool = True


class StudentFeePlanOut(StudentFeePlanItem):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: str
    academic_year_id: int


class FeePaymentCreate(BaseModel):
    paid_amount: float = Field(..., gt=0)
    paid_date: Optional[date] = None
    payment_method: str = Field(..., pattern="^(cash|check|bank_transfer|online)$")
    transaction_id: Optional[str] = None
    remarks: Optional[str] = None


class FeeOut(BaseModel):
    id: int
    student_id: str
    student_name: str
    roll_number: Optional[int] = None
    formatted_roll_number: Optional[str] = None
    class_id: int
    class_name: str
    section: Optional[str] = None
    fee_charge_id: int
    charge_name: str
    amount: float
    paid_amount: float
    balance: float
    month: Optional[int] = None
    year: Optional[int] = None
    due_date: date
    status: str
    paid_date: Optional[date] = None
    payment_method: Optional[str] = None
    transaction_id: Optional[str] = None
    remarks: Optional[str] = None


class ChalanGenerationRequest(BaseModel):
    class_id: int
    academic_year_id: int
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2000, le=2100)
    due_date: Optional[date] = None


class ChalanGenerationResponse(BaseModel):
    created: int
    existing: int
    skipped: int
    total_students: int
    total_charges: int
    errors: List[str] = []


class ChalanItemUpdate(BaseModel):
    fee_id: Optional[int] = None
    fee_charge_id: Optional[int] = None
    charge_name: Optional[str] = None
    amount: float = Field(..., ge=0)
    remarks: Optional[str] = None


class ChalanUpdateRequest(BaseModel):
    student_id: str
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2000, le=2100)
    due_date: Optional[date] = None
    items: List[ChalanItemUpdate]


class ChalanActionResponse(BaseModel):
    success: bool
    message: str
    updated_items: Optional[int] = 0


class CSVImportRowError(BaseModel):
    row: int
    error: str


class CSVImportResponse(BaseModel):
    total_rows: int
    imported: int
    skipped: int
    errors: List[CSVImportRowError] = []


# -------------------------------------------------------------
# Subject Schemas
# -------------------------------------------------------------
class SubjectBase(BaseModel):
    name: Optional[str] = None
    course_name: Optional[str] = None
    class_id: Optional[int] = None
    class_name: Optional[str] = None
    section: Optional[str] = None
    course_code: Optional[str] = None
    weekly_periods: Optional[int] = 5
    room: Optional[str] = None
    teacher_id: Optional[int] = None
    teacher_name: Optional[str] = None
    max_marks: Optional[int] = Field(default=100, ge=1)
    enrollment_limit: Optional[int] = Field(default=100, ge=1, le=100)


class SubjectCreate(SubjectBase):
    pass


class SubjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    course_name: Optional[str] = None
    class_id: Optional[int] = None
    max_marks: Optional[int] = Field(None, ge=1)
    enrollment_limit: Optional[int] = Field(None, ge=1, le=100)


class SubjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    course_name: Optional[str] = None
    class_id: int
    class_name: Optional[str] = None
    section: Optional[str] = None
    course_code: Optional[str] = None
    weekly_periods: Optional[int] = 5
    room: Optional[str] = None
    teacher_id: Optional[int] = None
    teacher_name: Optional[str] = None
    max_marks: Optional[int] = 100
    enrollment_limit: Optional[int] = 100
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# -------------------------------------------------------------
# Exam Type Schemas
# -------------------------------------------------------------
class ExamTypeBase(BaseModel):
    name: str = Field(..., min_length=1)
    default_total_marks: int = Field(100, ge=1)


class ExamTypeCreate(ExamTypeBase):
    pass


class ExamTypeOut(ExamTypeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# -------------------------------------------------------------
# Exam Record Schemas
# -------------------------------------------------------------
class ExamRecordCreate(BaseModel):
    student_id: str
    class_id: int
    subject_id: int
    exam_type: str
    gained_marks: float = Field(..., ge=0)
    total_marks: Optional[int] = Field(None, ge=1)
    exam_date: Optional[date] = None
    remarks: Optional[str] = None
    academic_year_id: Optional[int] = None


class ExamRecordUpdate(BaseModel):
    gained_marks: Optional[float] = Field(None, ge=0)
    total_marks: Optional[int] = Field(None, ge=1)
    exam_date: Optional[date] = None
    remarks: Optional[str] = None


class ExamRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: str
    student_name: str
    roll_number: Optional[int] = None
    formatted_roll_number: Optional[str] = None
    class_id: int
    class_name: str
    subject_id: int
    subject_name: str
    exam_type: str
    total_marks: int
    gained_marks: float
    percentage: float
    grade: str
    exam_date: Optional[date] = None
    remarks: Optional[str] = None
    academic_year_id: int
    created_at: Optional[datetime] = None


class ExamRecordBulkItem(BaseModel):
    student_id: str
    gained_marks: float = Field(..., ge=0)
    remarks: Optional[str] = None


class ExamRecordBulkCreate(BaseModel):
    class_id: int
    subject_id: int
    exam_type: str
    academic_year_id: Optional[int] = None
    total_marks: Optional[int] = Field(None, ge=1)
    exam_date: Optional[date] = None
    records: List[ExamRecordBulkItem]


class ClassExamBroadsheetItem(BaseModel):
    student_id: str
    student_name: str
    roll_number: Optional[int] = None
    formatted_roll_number: Optional[str] = None
    marks_by_subject: Dict[str, Any]
    total_gained: float
    total_possible: float
    percentage: float
    overall_grade: str


class ClassExamBroadsheetResponse(BaseModel):
    class_id: int
    class_name: str
    exam_type: str
    subjects: List[str]
    students: List[ClassExamBroadsheetItem]
    statistics: Dict[str, Any]


# -------------------------------------------------------------
# Attendance Schemas
# -------------------------------------------------------------
class AttendanceRecordItem(BaseModel):
    student_id: str
    status: str = Field(..., description="Status: present, absent, leave, or half-day")
    remarks: Optional[str] = ""


class AttendanceMarkRequest(BaseModel):
    class_id: int
    attendance_date: Optional[date] = None
    date: Optional[date] = None
    records: List[AttendanceRecordItem]


class AttendanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: str
    class_id: int
    attendance_date: date
    status: str
    remarks: Optional[str] = None
    marked_by: Optional[int] = None
    student_name: Optional[str] = None
    roll_number: Optional[int] = None
    class_name: Optional[str] = None
    section: Optional[str] = None


class AttendanceUpdate(BaseModel):
    status: Optional[str] = None
    remarks: Optional[str] = None


class AttendanceSummaryStudent(BaseModel):
    student_id: str
    name: str
    roll_number: Optional[int] = None
    formatted_roll_number: Optional[str] = None
    present: int = 0
    absent: int = 0
    leave: int = 0
    half_day: int = 0
    total: int = 0
    percentage: float = 0.0
    status: Optional[str] = "good"


class AttendanceClassSummaryResponse(BaseModel):
    total_days: int
    class_id: int
    class_name: Optional[str] = None
    section: Optional[str] = None
    month: Optional[int] = None
    year: Optional[int] = None
    students: List[AttendanceSummaryStudent]


class AttendanceStudentSummaryResponse(BaseModel):
    student_id: str
    name: str
    roll_number: Optional[int] = None
    total_days: int
    present: int
    absent: int
    leave: int
    half_day: int = 0
    percentage: float
    status: str


class WeeklyTrendItem(BaseModel):
    day: str
    date: str
    attendance: float
    present: int
    total: int


# -------------------------------------------------------------
# Timetable Schemas
# -------------------------------------------------------------
class TimetableCreate(BaseModel):
    class_id: int
    subject_id: int
    teacher_id: int
    day_of_week: str
    period_number: int
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    room_number: Optional[str] = None
    academic_year_id: Optional[int] = None


class TimetableUpdate(BaseModel):
    subject_id: Optional[int] = None
    teacher_id: Optional[int] = None
    day_of_week: Optional[str] = None
    period_number: Optional[int] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    room_number: Optional[str] = None


class TimetableOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    class_id: int
    subject_id: int
    teacher_id: int
    day_of_week: str
    period_number: int
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    room_number: Optional[str] = None
    academic_year_id: int
    class_name: Optional[str] = None
    section: Optional[str] = None
    subject_name: Optional[str] = None
    teacher_name: Optional[str] = None

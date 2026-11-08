from backend.app.routers.auth import router as auth_router
from backend.app.routers.users import router as users_router
from backend.app.routers.classes import router as classes_router
from backend.app.routers.students import router as students_router
from backend.app.routers.import_routes import router as import_router
from backend.app.routers.teachers import router as teachers_router
from backend.app.routers.academic_years import router as academic_years_router
from backend.app.routers.class_teacher_assignment import router as class_teacher_assignment_router
from backend.app.routers.fees import router as fees_router
from backend.app.routers.subjects import router as subjects_router
from backend.app.routers.exams import router as exams_router
from backend.app.routers.attendance import router as attendance_router
from backend.app.routers.timetable import router as timetable_router
from backend.app.routers.reports import router as reports_router
from backend.app.routers.student_promotion import router as student_promotion_router
from backend.app.routers.system import router as system_router

__all__ = [
    "auth_router",
    "users_router",
    "classes_router",
    "students_router",
    "import_router",
    "teachers_router",
    "academic_years_router",
    "class_teacher_assignment_router",
    "fees_router",
    "subjects_router",
    "exams_router",
    "attendance_router",
    "timetable_router",
    "reports_router",
    "student_promotion_router",
    "system_router",
]

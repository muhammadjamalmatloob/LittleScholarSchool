import client from "./client";

export * from "./client";
export * from "./auth";
export * from "./users";
export * from "./classes";
export * from "./courses";
export * from "./students";
export * from "./fees";
export * from "./attendance";
export * from "./exams";
export * from "./timetable";
export * from "./reports";
export * from "./teachers";
export * from "./academicYears";
export * from "./classTeacherAssignments";
export * from "./promotion";

// Backward-compatibility aliases
export { authApi as authService } from "./auth";
export { userApi as userService } from "./users";
export { classApi as classService } from "./classes";
export { courseApi as courseService } from "./courses";
export { studentApi as studentService } from "./students";
export { feeApi as feeService } from "./fees";
export { attendanceApi as attendanceService } from "./attendance";
export { examApi as examService } from "./exams";
export { timetableApi as timetableService } from "./timetable";
export { reportApi as reportService } from "./reports";
export { teacherApi as teacherService } from "./teachers";
export { academicYearApi as academicYearService } from "./academicYears";
export { classTeacherAssignmentApi as classTeacherAssignmentService } from "./classTeacherAssignments";
export { promotionApi as promotionService } from "./promotion";

export default client;

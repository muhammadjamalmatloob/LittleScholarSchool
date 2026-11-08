import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { LicenseProvider } from "./context/LicenseContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ModuleRoute } from "./components/ModuleRoute";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { StudentList } from "./pages/Students/StudentList";
import { StudentDetail } from "./pages/Students/StudentDetail";
import { TeacherList } from "./pages/Teachers/TeacherList";
import { TeacherDetail } from "./pages/Teachers/TeacherDetail";
import { ClassManager } from "./pages/Classes/ClassManager";
import { CourseManager } from "./pages/Courses/CourseManager";
import { FeeManager } from "./pages/Fees/FeeManager";
import { Exams } from "./pages/Exams";
import { Timetable } from "./pages/Timetable";
import { AcademicYearList } from "./pages/AcademicYears/AcademicYearList";
import { StudentPromotion } from "./pages/Admin/StudentPromotion";
import { AppLayout } from "./layouts/AppLayout";

/**
 * AnimatedOutlet: Wraps route transitions with framer-motion AnimatePresence
 * - Page container mounts with subtle fade and slight upward slide
 * - Sidebar and Topbar remain entirely outside this animation wrapper
 */
function AnimatedOutlet() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full"
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <LicenseProvider>
          <AuthProvider>
            <Routes>
              {/* Public Login Route */}
              <Route path="/login" element={<Login />} />

              {/* Application Shell Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <AnimatedOutlet />
                    </AppLayout>
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />

                {/* Redirects for removed modules */}
                <Route path="users" element={<Navigate to="/dashboard" replace />} />
                <Route path="attendance" element={<Navigate to="/dashboard" replace />} />
                <Route path="reports" element={<Navigate to="/dashboard" replace />} />

                {/* Student Management */}
                <Route path="students" element={<StudentList />} />
                <Route path="students/:id" element={<StudentDetail />} />

                {/* Teacher Management */}
                <Route
                  path="teachers"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "principal"]}>
                      <ModuleRoute module="teachers">
                        <TeacherList />
                      </ModuleRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="teachers/:id"
                  element={
                    <ModuleRoute module="teachers">
                      <TeacherDetail />
                    </ModuleRoute>
                  }
                />

                {/* Classes & Sections */}
                <Route path="classes" element={<ClassManager />} />

                {/* Section-Wise Courses */}
                <Route
                  path="courses"
                  element={
                    <ModuleRoute module="courses">
                      <CourseManager />
                    </ModuleRoute>
                  }
                />

                {/* Fee Management & Invoicing */}
                <Route
                  path="fees"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "accountant", "principal"]}>
                      <ModuleRoute module="fees">
                        <FeeManager />
                      </ModuleRoute>
                    </ProtectedRoute>
                  }
                />

                {/* Marksheets & Examinations */}
                <Route
                  path="marksheet"
                  element={
                    <ModuleRoute module="exams">
                      <Exams />
                    </ModuleRoute>
                  }
                />
                <Route path="exams" element={<Navigate to="/marksheet" replace />} />

                {/* Section-Wise Timetable Management */}
                <Route
                  path="timetable"
                  element={
                    <ModuleRoute module="timetable">
                      <Timetable />
                    </ModuleRoute>
                  }
                />

                {/* Academic Years & Sessions */}
                <Route
                  path="academic-years"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "principal"]}>
                      <AcademicYearList />
                    </ProtectedRoute>
                  }
                />

                {/* Annual Student Promotion */}
                <Route
                  path="promotion"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <ModuleRoute module="promotion">
                        <StudentPromotion />
                      </ModuleRoute>
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthProvider>
        </LicenseProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

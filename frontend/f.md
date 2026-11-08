# School Management System — Frontend Architecture & File Guide

Comprehensive architectural overview and file directory breakdown for the Little Scholar School Management System frontend application built with React 19, Vite, Tailwind CSS v4, Framer Motion, Recharts, and Lucide React.

---

## Core System Architecture Rules

1. **Routing-Only `App.jsx`**: `App.jsx` contains exclusively route definitions, authentication guards, and the `framer-motion` `AnimatePresence` page transition layer. No page layout implementations, inline data, or business logic.
2. **Centralized Data Layer (`src/api/`)**: All application data services live strictly in `src/api/`. UI components must never store inline mock data sets.
3. **Single-Boolean Mock Switch (`USE_MOCK`)**: Every API service exports a `USE_MOCK` boolean flag. Toggling this flag between `true` and `false` switches the entire application between structured local mock data and live FastAPI backend endpoints without touching component files.
4. **Static Chrome & Decoupled Navigation**: The permanent dark Sidebar (`bg-slate-900`), floating glassmorphic Navbar, and full-screen noise/ambient glow stay mounted outside route animation wrappers, remaining completely static during page navigation.
5. **Atmospheric Canvas & Tactile Polish**: The canvas combines a base `bg-slate-50 dark:bg-slate-950` with a fixed SVG noise overlay (`.bg-noise` at 4% opacity) and dual-tone ambient mesh blur blobs (`blur-[120px]`).
6. **Currency Standardization**: All financial values are formatted strictly in Pakistani Rupee (**Rs.**), never dollar symbols.

---

## Complete Directory & File Breakdown

### 1. Root Configuration & Tooling (`/frontend/`)

- **`package.json`**: Package dependencies (React 19, Vite, Tailwind CSS v4, Framer Motion, Recharts, Lucide React, Axios) and lifecycle scripts (`dev`, `build`, `lint`, `preview`).
- **`vite.config.js`**: Vite bundler configuration utilizing `@vitejs/plugin-react` and `@tailwindcss/vite` for near-instant HMR and asset optimization.
- **`index.html`**: HTML entry point preloading Google Inter typography and defining viewport metadata.
- **`postcss.config.js`**: PostCSS configuration supporting modern CSS pipelines.
- **`eslint.config.js`**: Modern flat ESLint configuration enforcing code hygiene and React Hook rules.
- **`.env.example`**: Environment variable template declaring `VITE_API_URL` for FastAPI backend connection.

---

### 2. Application Entry & Styling (`src/`)

- **`main.jsx`**: Bootstraps the React DOM tree and renders the root `App` component into `index.html`.
- **`App.jsx`**: Master routing layer configuring `BrowserRouter`, route protection, role access permissions, and `AnimatedOutlet` with Framer Motion (`initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}`).
- **`index.css`**: Global design system stylesheet declaring Tailwind v4 tokens, CSS variables, dark-mode variant, custom scrollbars, and the `.bg-noise` SVG texture utility.
- **`App.css`**: Auxiliary application styling.

---

### 3. Layout Shell (`src/layouts/`)

- **`AppLayout.jsx`** *(also exported as `AppShell`)*: The master presentation shell housing:
  - Base canvas (`bg-slate-50 dark:bg-slate-950`).
  - Tactile SVG noise overlay (`bg-noise` with `opacity-[0.04]` and `mix-blend-overlay`).
  - Ambient mesh glow container (sky-blue/amber in light mode; deep indigo/blue in dark mode at 25% opacity with `blur-[120px]`).
  - Anchors the static `Sidebar` and floating glassmorphic `Navbar` outside page animation wrappers.

---

### 4. Centralized API & Mock Data Services (`src/api/`)

*Each file exports a `USE_MOCK` boolean switch. When `true`, it returns local mock data. When `false`, it makes asynchronous Axios requests to the FastAPI backend.*

- **`client.js`**: Central Axios instance with base URL configuration, request interceptor attaching Bearer tokens from `localStorage`, and response interceptor redirecting to `/login` on HTTP 401.
- **`dashboard.api.js`**: Dashboard service providing `getDashboardMetrics()`, `getAttendanceTrend()`, and `getPriorityActions()`.
- **`auth.js`**: User authentication service handling login credentials, JWT token lifecycle, and current user profile retrieval.
- **`students.js`**: Student information management (CRUD, enrollment, section transfers, roll-number lookups, and CSV/Excel bulk imports).
- **`teachers.js`**: Faculty directory management, teacher profiles, qualifications, and department allocations.
- **`attendance.js`**: Daily classroom roll calls, student attendance logs, class summaries, and weekly trend metrics.
- **`fees.js`**: Tuition fee ledger, voucher generation, overdue tracking, and payment collection recording in Pakistani Rupee (Rs.).
- **`classes.js`**: Academic grades and section configurations (e.g., Prep-A, Class 1-A to 10-A).
- **`courses.js`**: Academic subjects, syllabus allocation, and course-to-teacher mappings.
- **`exams.js`**: Examination scheduling, subject marks entry, grading scales, and report card generation.
- **`timetable.js`**: Weekly timetable scheduling by class section, period slots, and classroom venues.
- **`reports.js`**: Analytics reporting engine covering student performance, fee recovery rates, and attendance distributions.
- **`users.js`**: User account administration and role-based access control (Admin, Principal, Teacher, Accountant).
- **`academicYears.js`**: Academic year calendar terms, active session flags, and term date boundaries.
- **`classTeacherAssignments.js`**: Classroom incharge / head teacher assignment records.
- **`axios.js`**: Legacy Axios instance re-export for backwards compatibility.
- **`index.js`**: Master barrel export aggregating all API services.

---

### 5. State Context Providers (`src/context/`)

- **`AuthContext.jsx`**: Global authentication context managing login credentials, JWT tokens, and user role state.
- **`SidebarContext.jsx`**: Tracks desktop and mobile sidebar collapse/expansion state with toggle helpers.
- **`ThemeContext.jsx`**: Light and dark mode state provider persisting preferences to `localStorage`.

---

### 6. Core Components (`src/components/`)

- **`Sidebar.jsx`**: Fixed permanent dark navigation drawer (`bg-slate-900`) with role-based routing links, hamburger collapse toggle, fixed layout rail (`w-[76px]`), bottom-anchored user profile card, and snappy mobile overlay physics (`duration-160 ease-out`).
- **`Navbar.jsx`**: Floating glassmorphic top bar housing a centered search input and theme toggle.
- **`DashboardMetrics.jsx`**: Pure presentation component rendering 3 vibrant gradient KPI cards (Total Students, Today's Attendance, Pending Fees) with 40px typography, sentence-case labels, translucent icon wells, and SVG sparklines.
- **`AttendanceOverview.jsx`**: Pure presentation component rendering the 7-day Recharts monotone AreaChart with teal-to-transparent gradient fill and benchmark stats footer.
- **`ProtectedRoute.jsx`**: Route guard ensuring unauthenticated users redirect to login and enforcing role access policies.
- **`BottomNav.jsx`**: Compact bottom navigation bar for mobile viewports.

#### UI Primitives (`src/components/ui/`)
- **`ActionCard.jsx`**: Reusable interactive action card with hover effects.
- **`GlassCard.jsx`**: Glassmorphic backdrop container with subtle borders and shadow.
- **`GlassButton.jsx`**: Polished button component with tactile active state scaling.
- **`StatCard.jsx`**: Modular KPI metric presentation card.
- **`PillTabs.jsx`**: Segmented pill tab switcher for filtering sub-views.
- **`GlassBadge.jsx`**: Status badge pill for active/inactive indicators.
- **`ThemeToggle.jsx`**: Icon button toggling between light and dark themes.
- **`ConfirmModal.jsx`**: Reusable accessible confirmation dialog with frosted glass overlay, Framer Motion entrance scaling, red alert iconography, and customizable action buttons.


---

### 7. Application Pages (`src/pages/`)

- **`Dashboard.jsx`**: Central operations dashboard integrating `DashboardMetrics`, `AttendanceOverview`, and floating Priority Action notification cards with subtle ghost CTA buttons.
- **`Login.jsx`**: Educational portal authentication screen with login credentials validation.
- **`Users.jsx`**: System administration console for creating, editing, and assigning roles to system users.
- **`Exams.jsx`**: Exam term scheduler, marks entry table, grading calculator, and report generator.
- **`Timetable.jsx`**: Section timetable grid with period scheduling and room allocations.
- **`PlaceholderModule.jsx`**: Fallback view for modules in development.

#### Sub-Module Page Directories:
- **Students (`src/pages/Students/`)**:
  - `StudentList.jsx`: Directory with search, class filtering, and status badges.
  - `StudentDetail.jsx`: Complete profile showing guardian details, academic history, fees, and attendance.
  - `StudentForm.jsx`: Enrollment form for new admissions and detail updates.
  - `StudentImport.jsx`: Bulk student onboarding via CSV/Excel upload.
- **Teachers (`src/pages/Teachers/`)**:
  - `TeacherList.jsx`: Faculty roster with departmental badges and contact details.
  - `TeacherDetail.jsx`: Teacher workload, assigned classes, and course schedules.
  - `TeacherForm.jsx`: Faculty onboarding and credential recording.
- **Classes (`src/pages/Classes/`)**:
  - `ClassManager.jsx`: Grade level and section management interface.
  - `ClassTeacherAssignment.jsx`: Form assigning head teachers to specific class sections.
- **Courses (`src/pages/Courses/`)**:
  - `CourseManager.jsx`: Subject curriculum directory and teacher course allocation.
- **Attendance (`src/pages/Attendance/`)**:
  - `AttendanceManager.jsx`: Daily roll-call entry interface by section with quick Present/Absent toggles.
- **Fees (`src/pages/Fees/`)**:
  - `FeeManager.jsx`: Fee voucher ledger, overdue payment notifications, and payment collection tracking in Rs.
- **Reports (`src/pages/Reports/`)**:
  - `ReportsManager.jsx`: School analytics reporting center for performance and attendance exports.
- **Academic Years (`src/pages/AcademicYears/`)**:
  - `AcademicYearList.jsx`: Calendar session list with active status flags.
  - `AcademicYearForm.jsx`: Term creation and session configuration.

---

### 8. Services Compatibility (`src/services/`)

- **`api.js`**: Legacy export forwarding requests to `src/api/client.js`.

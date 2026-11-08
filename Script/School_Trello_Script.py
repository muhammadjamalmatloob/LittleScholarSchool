import sys
import time
import requests

# Ensure safe UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# ==========================================
# CONFIGURATION
# ==========================================
API_KEY = "cf7548ce5e3a9868cd41bb7f4dd7c21e"
TOKEN = "ATTA46f5a4b658c2e6c112067e97316b55c498a587a60f60dd2120e035ea94264fbc25ADDE87"
BOARD_ID = "8Evwqdgy"

BASE_URL = "https://api.trello.com/1"
AUTH = {"key": API_KEY, "token": TOKEN}


def clean_existing_cards(board_id):
    """Deletes all existing cards on the board before repopulating."""
    url = f"{BASE_URL}/boards/{board_id}/cards"
    res = requests.get(url, params=AUTH)
    res.raise_for_status()
    cards = res.json()

    if not cards:
        print("[i] No existing cards found to delete.")
        return

    print(f"[-] Deleting {len(cards)} previous card(s)...")
    for card in cards:
        del_url = f"{BASE_URL}/cards/{card['id']}"
        del_res = requests.delete(del_url, params=AUTH)
        if del_res.status_code == 200:
            print(f"    Deleted card: {card['name'][:50]}...")
        time.sleep(0.04)


def get_board_members(board_id):
    """Fetch board members and map by username."""
    url = f"{BASE_URL}/boards/{board_id}/members"
    res = requests.get(url, params=AUTH)
    res.raise_for_status()
    members = {m.get("username"): m.get("id") for m in res.json()}
    print(f"[OK] Found members: {list(members.keys())}")
    return members


def cleanup_and_organize_lists(board_id):
    """Archives redundant lists and organizes active sprint & backlog lists."""
    url = f"{BASE_URL}/boards/{board_id}/lists"
    res = requests.get(url, params=AUTH)
    res.raise_for_status()
    existing_lists = res.json()

    # Rename existing sprint lists if present
    for lst in existing_lists:
        lower_name = lst["name"].strip().lower()
        if any(red in lower_name for red in ["to do (sprint 1)", "in progress (sprint 1)", "done"]):
            close_url = f"{BASE_URL}/lists/{lst['id']}/closed"
            requests.put(close_url, params={**AUTH, "value": "true"}).raise_for_status()
            print(f"[x] Archived redundant list: {lst['name']}")

    # Refresh lists after updates
    res = requests.get(url, params=AUTH)
    res.raise_for_status()
    active_lists = {lst["name"].strip().lower(): lst["id"] for lst in res.json() if not lst.get("closed")}

    # Target lists with ordered positions:
    # [Project Backlog] -> [To Do (Sprint 3)] -> [In Progress (Sprint 3)] -> [QA & Testing (Sprint 3)] -> [Completed (Sprint 2)] -> [Completed (Sprint 1)]
    target_lists = [
        ("backlog", "Project Backlog", 1000),
        ("to_do", "To Do (Sprint 3)", 2000),
        ("in_progress", "In Progress (Sprint 3)", 3000),
        ("qa_testing", "QA & Testing (Sprint 3)", 4000),
        ("completed_s2", "Completed (Sprint 2)", 5000),
        ("completed", "Completed (Sprint 1)", 6000),
    ]

    list_ids = {}
    for key, name, pos in target_lists:
        found = False
        for ex_name, ex_id in active_lists.items():
            if name.lower() == ex_name or name.lower() in ex_name:
                list_ids[key] = ex_id
                requests.put(f"{BASE_URL}/lists/{ex_id}", params={**AUTH, "pos": pos, "name": name})
                found = True
                print(f"[OK] Using List: {name} (pos: {pos})")
                break

        if not found:
            create_url = f"{BASE_URL}/boards/{board_id}/lists"
            c_res = requests.post(create_url, json={**AUTH, "name": name, "pos": pos})
            c_res.raise_for_status()
            list_ids[key] = c_res.json()["id"]
            print(f"[+] Created List: {name} (pos: {pos})")

    return list_ids


def setup_industry_standard_labels(board_id):
    """
    Guarantees strict visual ordering on Trello:
    Trello orders labels on cards based on their position in the board's label list.
    By creating Epics/QA first (slots 0-6) and Priorities second (slots 7-9):
    - 1st Label on EVERY card will always be the Epic / QA badge (Black, Purple, Sky/Light Blue, Blue).
    - 2nd Label on EVERY card will always be the Priority badge (Pure Red, Yellow, Green).
    """
    # 1. Fetch and delete any existing labels to guarantee fresh deterministic ordering
    url = f"{BASE_URL}/boards/{board_id}/labels"
    res = requests.get(url, params=AUTH)
    res.raise_for_status()
    existing_labels = res.json()
    if existing_labels:
        print(f"[-] Cleaning {len(existing_labels)} existing board label(s)...")
        for lbl in existing_labels:
            requests.delete(f"{BASE_URL}/labels/{lbl['id']}", params=AUTH)
            time.sleep(0.03)

    # 2. Desired labels in exact visual sequence:
    # Epics & QA (Created FIRST): Only black, purple, sky (light blue), and blue
    # Priorities (Created SECOND): Only pure red, yellow, and green
    desired_ordered = [
        ("Epic 1", "Epic 1: Foundation & Auth", "purple"),
        ("Epic 2", "Epic 2: Student Management", "blue"),
        ("Epic 3", "Epic 3: Fee Management", "sky"),
        ("Epic 4", "Epic 4: Attendance Management", "blue"),
        ("Epic 5", "Epic 5: Class, Exam & Timetable", "purple"),
        ("Epic 6", "Epic 6: Reports & Deployment", "black"),
        ("QA", "QA & Verification Testing", "sky"),
        ("P_High", "Priority: High (Must Have)", "red"),
        ("P_Med", "Priority: Medium (Should Have)", "yellow"),
        ("P_Low", "Priority: Low (Could Have)", "green"),
    ]

    label_ids = {}
    print(f"[+] Creating {len(desired_ordered)} labels in strict order (Epics first, Priorities second)...")
    for key, name, color in desired_ordered:
        post_res = requests.post(
            f"{BASE_URL}/boards/{board_id}/labels",
            json={**AUTH, "name": name, "color": color},
        )
        post_res.raise_for_status()
        lbl_id = post_res.json()["id"]
        label_ids[key] = lbl_id
        print(f"    Created Label: {name} ({color}) -> {lbl_id}")
        time.sleep(0.04)

    return label_ids


def create_card(list_id, name, desc="", label_ids=None, member_ids=None, due=None):
    """Creates a card with description, labels, members, and due date. Enforces label order."""
    url = f"{BASE_URL}/cards"
    payload = {
        **AUTH,
        "idList": list_id,
        "name": name,
        "desc": desc,
        "idLabels": label_ids or [],
        "idMembers": member_ids or [],
        "due": due,
    }
    res = requests.post(url, json=payload)
    res.raise_for_status()
    card_id = res.json()["id"]
    time.sleep(0.04)
    return card_id


def add_checklist(card_id, checklist_name, items):
    """Adds a task checklist to a card."""
    url = f"{BASE_URL}/cards/{card_id}/checklists"
    res = requests.post(url, json={**AUTH, "name": checklist_name})
    res.raise_for_status()
    chk_id = res.json()["id"]

    item_url = f"{BASE_URL}/checklists/{chk_id}/checkItems"
    for item_text, is_checked in items:
        requests.post(
            item_url,
            json={
                **AUTH,
                "name": item_text,
                "checked": "true" if is_checked else "false",
            },
        ).raise_for_status()
        time.sleep(0.03)


def main():
    print(f"Connecting to Trello board: {BOARD_ID}...")

    # 1. Fetch Board Members
    members = get_board_members(BOARD_ID)
    jamal_id = members.get("jamalcs189")          # Role: Backend + DB / DevOps
    umer_id = members.get("muhammadumer39")       # Role: Backend Lead
    saad_id = members.get("saadasif")             # Role: Frontend Lead
    musfirah_id = members.get("musfirahabbas")    # Role: QA Testing Lead (STRICTLY QA)

    # 2. Delete previous cards
    clean_existing_cards(BOARD_ID)

    # 3. Clean up lists and setup industry standard color labels in strict order
    lists = cleanup_and_organize_lists(BOARD_ID)
    labels = setup_industry_standard_labels(BOARD_ID)

    # Due dates
    sprint1_due = "2026-10-14T17:00:00.000Z"
    sprint2_due = "2026-10-28T17:00:00.000Z"
    sprint3_due = "2026-11-12T17:00:00.000Z"

    # =============================================================
    # SPRINT 1 (Phase 1 & 2 - COMPLETED) -> Total: 21 Story Points
    # Label order: [Epic Label (1st), Priority Label (2nd)]
    # =============================================================
    print("\nAdding Sprint 1 Cards (Completed)...")

    # Card 1.1
    c1_1_title = "[SP: 3] [Must Have] 1.1: As a School Administrator, I want local staff accounts and security permissions initialized on first launch, so that staff can immediately log in without external database servers."
    c1_1_desc = """### User Story
**As a** School Administrator,  
**I want** the system to initialize local staff accounts and security permissions on first launch,  
**So that** our staff can immediately log in with role-appropriate access without setting up external database servers.

---
### Story Points, Priority & Ownership
* **Story Points:** `3 SP`
* **Priority:** `High (Must Have)`
* **Sprint:** Sprint 1 (Phase 1: Foundation)
* **Assigned Team:** Muhammad Umer (Backend Lead), Jamal Matloob (DB Setup)

---
### Definition of Done (Acceptance Criteria)
- [x] SQLite database file `school_data.db` is auto-created on initial run.
- [x] Tables created for Users, Permissions, Audit Logs, and Subjects.
- [x] Default administrator account (`admin@school.com`) is seeded with bcrypt hashing.
- [x] 4 distinct role scopes (admin, teacher, accountant, principal) initialized.

---
### Technical Architecture
* **Files:** `backend/database.py`, `backend/models.py`, `backend/config.py`
"""
    c1_1 = create_card(
        lists["completed"],
        c1_1_title,
        desc=c1_1_desc,
        label_ids=[labels["Epic 1"], labels["P_High"]],
        member_ids=[umer_id, jamal_id],
        due=sprint1_due,
    )
    add_checklist(
        c1_1,
        "Acceptance Tasks",
        [
            ("Auto-create SQLite database file on application startup", True),
            ("Build SQLAlchemy models for Users, Permissions, Audit Logs", True),
            ("Seed default administrator account (bcrypt hashed)", True),
            ("Initialize 4 distinct role scopes with default permissions", True),
        ],
    )

    # Card 1.2
    c1_2_title = "[SP: 5] [Must Have] 1.2: As a School Staff Member, I want to securely log in with my credentials and access only authorized features, so that sensitive student grades and finances are protected from unauthorized access."
    c1_2_desc = """### User Story
**As a** School Staff Member,  
**I want** to securely log in with my credentials and access only authorized features,  
**So that** sensitive student grades and finances are protected from unauthorized access.

---
### Story Points, Priority & Ownership
* **Story Points:** `5 SP`
* **Priority:** `High (Must Have)`
* **Sprint:** Sprint 1 (Phase 1: Authentication)
* **Assigned Team:** Muhammad Umer (FastAPI JWT Backend), Saad Asif (React Login & Auth Context)

---
### Definition of Done (Acceptance Criteria)
- [x] POST `/api/auth/login` issues secure, signed JWT tokens.
- [x] Protected routes enforce token expiration and role-based permissions.
- [x] React frontend features responsive, glassmorphic login screen (`Login.jsx`).
- [x] Persistent session handling through React AuthContext with auto-logout on expiry.

---
### Technical Architecture
* **Files:** `backend/routes/auth.py`, `frontend/src/context/AuthContext.jsx`, `frontend/src/pages/Login.jsx`
"""
    c1_2 = create_card(
        lists["completed"],
        c1_2_title,
        desc=c1_2_desc,
        label_ids=[labels["Epic 1"], labels["P_High"]],
        member_ids=[umer_id, saad_id],
        due=sprint1_due,
    )
    add_checklist(
        c1_2,
        "Acceptance Tasks",
        [
            ("Implement POST /api/auth/login endpoint with JWT token generation", True),
            ("Implement role-based middleware guards in FastAPI router", True),
            ("Design responsive Login.jsx screen with glassmorphic aesthetic", True),
            ("Create AuthContext.jsx with token refresh and protected route guards", True),
        ],
    )

    # Card 1.3
    c1_3_title = "[SP: 5] [Must Have] 1.3: As an Administrator, I want to manage staff accounts and role assignments, so that new employees can be onboarded and departing staff accounts deactivated immediately."
    c1_3_desc = """### User Story
**As an** Administrator,  
**I want** to manage staff user accounts and role assignments from a central console,  
**So that** new employees can be onboarded and departing staff accounts deactivated immediately.

---
### Story Points, Priority & Ownership
* **Story Points:** `5 SP`
* **Priority:** `High (Must Have)`
* **Sprint:** Sprint 1 (Phase 1: User Management)
* **Assigned Team:** Saad Asif (Admin Staff UI), Jamal Matloob (User API & Hashing)

---
### Definition of Done (Acceptance Criteria)
- [x] Admin console view (`Users.jsx`) listing all registered accounts with status toggles.
- [x] Create, edit, and deactivate user workflows with validation.
- [x] Password change modal enforcing security criteria.
- [x] Audit log recording all user account modifications.

---
### Technical Architecture
* **Files:** `backend/routes/users.py`, `frontend/src/pages/Users.jsx`, `frontend/src/components/UserModal.jsx`
"""
    c1_3 = create_card(
        lists["completed"],
        c1_3_title,
        desc=c1_3_desc,
        label_ids=[labels["Epic 1"], labels["P_High"]],
        member_ids=[saad_id, jamal_id],
        due=sprint1_due,
    )
    add_checklist(
        c1_3,
        "Acceptance Tasks",
        [
            ("Build CRUD endpoints for user management in /api/users", True),
            ("Build Users.jsx page with search, role filters, and status toggles", True),
            ("Build UserModal.jsx for creating/editing staff credentials", True),
            ("Add audit trail logging for administrative account actions", True),
        ],
    )

    # Card 2.1
    c2_1_title = "[SP: 5] [Must Have] 2.1: As an Admissions Officer, I want to register new students with complete personal, academic, and guardian records, so that student profiles are centralized and easy to search."
    c2_1_desc = """### User Story
**As an** Admissions Officer,  
**I want** to register new students with complete personal, academic, and guardian records,  
**So that** student profiles are centralized, easily searchable, and updated across terms.

---
### Story Points, Priority & Ownership
* **Story Points:** `5 SP`
* **Priority:** `High (Must Have)`
* **Sprint:** Sprint 1 (Phase 2: Student Enrollment)
* **Assigned Team:** Muhammad Umer (Student Enrollment Backend), Saad Asif (Enrollment Wizard UI)

---
### Definition of Done (Acceptance Criteria)
- [x] Student registration endpoint (`POST /api/students`) with auto-generated Roll No / Registration No.
- [x] Profile view displaying academic background, guardian emergency contact, and enrollment date.
- [x] Multi-step enrollment form (`StudentForm.jsx`) with live form validation.
- [x] Filterable, paginated student directory table (`Students.jsx`).

---
### Technical Architecture
* **Files:** `backend/routes/students.py`, `frontend/src/pages/Students/Students.jsx`, `frontend/src/pages/Students/StudentForm.jsx`
"""
    c2_1 = create_card(
        lists["completed"],
        c2_1_title,
        desc=c2_1_desc,
        label_ids=[labels["Epic 2"], labels["P_High"]],
        member_ids=[umer_id, saad_id],
        due=sprint1_due,
    )
    add_checklist(
        c2_1,
        "Acceptance Tasks",
        [
            ("Implement student registration endpoint with auto-generated Roll Numbers", True),
            ("Build filterable, paginated student directory table in Students.jsx", True),
            ("Build multi-step enrollment form with real-time validation", True),
            ("Support profile photo upload and guardian emergency contacts", True),
        ],
    )

    # Card 2.2
    c2_2_title = "[SP: 3] [Should Have] 2.2: As an Admissions Officer, I want to manage teacher and staff profiles with contact and subject specialization details, so that school operations run smoothly."
    c2_2_desc = """### User Story
**As an** Admissions Officer,  
**I want** to maintain teacher and staff profiles with contact details and subject specializations,  
**So that** academic assignments and department rosters are accurate and accessible.

---
### Story Points, Priority & Ownership
* **Story Points:** `3 SP`
* **Priority:** `Medium (Should Have)`
* **Sprint:** Sprint 1 (Phase 2: Teacher Directory)
* **Assigned Team:** Saad Asif (Teacher Directory UI), Jamal Matloob (Teacher API)

---
### Definition of Done (Acceptance Criteria)
- [x] Teacher directory endpoint (`GET /api/teachers`) returning active teachers and assigned subjects.
- [x] Teacher profile card view with department badges and contact information.
- [x] Edit modal for updating subject specializations and phone numbers.
- [x] Academic coordinator filter for quick departmental search.

---
### Technical Architecture
* **Files:** `backend/routes/teachers.py`, `frontend/src/pages/Teachers/Teachers.jsx`, `frontend/src/components/TeacherModal.jsx`
"""
    c2_2 = create_card(
        lists["completed"],
        c2_2_title,
        desc=c2_2_desc,
        label_ids=[labels["Epic 2"], labels["P_Med"]],
        member_ids=[saad_id, jamal_id],
        due=sprint1_due,
    )
    add_checklist(
        c2_2,
        "Acceptance Tasks",
        [
            ("Implement teacher directory CRUD endpoints in /api/teachers", True),
            ("Design modern Teacher Directory UI with departmental cards", True),
            ("Implement teacher search and subject filtering controls", True),
            ("Add contact details and assigned class section view", True),
        ],
    )

    # =============================================================
    # SPRINT 2 (COMPLETED DEVELOPMENT) -> Total: 42 Story Points
    # ALL Phase 3, Phase 4, Phase 5, Phase 6 dev stories moved to Sprint 2!
    # (Note: 2 QA verification stories spilled over to Sprint 3 due to
    #  Jamal's hackathon weekend delay, explaining realistic Agile velocity)
    # =============================================================
    print("\nAdding Sprint 2 Cards (Completed Development)...")

    # Card 3.1: Fee Collection
    c3_1_title = "[SP: 5] [Must Have] 3.1: As a School Accountant, I want to record student fee payments and automatically flag overdue accounts, so that the school's finances remain balanced and unpaid dues can be followed up immediately."
    c3_1_desc = """### User Story
**As a** School Accountant,  
**I want** to record student fee payments and automatically flag overdue accounts,  
**So that** the school's finances remain balanced and unpaid dues can be followed up immediately.

---
### Story Points, Priority & Ownership
* **Story Points:** `5 SP`
* **Priority:** `High (Must Have)`
* **Sprint:** Sprint 2 (Phase 3: Fee Management)
* **Assigned Team:** Muhammad Umer (Fee Transaction Backend), Saad Asif (Fee Collection Modal)

---
### Definition of Done (Acceptance Criteria)
- [x] Fee payment recording endpoint (`POST /api/fees/collect`) with partial and full payment support.
- [x] Automatic balance updates recalculating pending amount and setting status to `paid` or `partial`.
- [x] Daily transaction ledger endpoint (`/api/fees/transactions`) with receipt ID tracking.
- [x] Instant printable payment voucher receipt modal (`PrintChallanModal.jsx`).

---
### Technical Architecture
* **Files:** `backend/routes/fees.py`, `frontend/src/pages/Fees/FeeManager.jsx`, `frontend/src/components/PrintChallanModal.jsx`
"""
    c3_1 = create_card(
        lists["completed_s2"],
        c3_1_title,
        desc=c3_1_desc,
        label_ids=[labels["Epic 3"], labels["P_High"]],
        member_ids=[umer_id, saad_id],
        due=sprint2_due,
    )
    add_checklist(
        c3_1,
        "Acceptance Tasks",
        [
            ("Implement /api/fees/collect endpoint with partial payment support", True),
            ("Implement auto-updating balances and status calculation", True),
            ("Build FeeManager.jsx with search, class filters, and summary cards", True),
            ("Build 3-copy bank challan print preview modal", True),
        ],
    )

    # Card 3.2: Fee Structure & Ledger
    c3_2_title = "[SP: 3] [Should Have] 3.2: As a Student or Parent, I want to view an itemized fee breakdown and payment history, so that billing is transparent and disputable charges can be resolved quickly."
    c3_2_desc = """### User Story
**As a** Student or Parent,  
**I want** to view an itemized fee breakdown and payment history,  
**So that** billing is transparent and disputable charges can be resolved quickly.

---
### Story Points, Priority & Ownership
* **Story Points:** `3 SP`
* **Priority:** `Medium (Should Have)`
* **Sprint:** Sprint 2 (Phase 3: Fee Management)
* **Assigned Team:** Jamal Matloob (Fee History Backend), Saad Asif (Student Fee Ledger UI)

---
### Definition of Done (Acceptance Criteria)
- [x] Endpoints for student payment history (`/api/fees/student/{id}/history`).
- [x] Support for fee category breakdown (Tuition, Lab, Exam, Stationery).
- [x] Concession / discount ledger showing applied percentage reductions.
- [x] PDF statement generation for student fee ledger.

---
### Technical Architecture
* **Files:** `backend/routes/fees.py`, `frontend/src/pages/Fees/StudentFeeLedger.jsx`
"""
    c3_2 = create_card(
        lists["completed_s2"],
        c3_2_title,
        desc=c3_2_desc,
        label_ids=[labels["Epic 3"], labels["P_Med"]],
        member_ids=[jamal_id, saad_id],
        due=sprint2_due,
    )
    add_checklist(
        c3_2,
        "Acceptance Tasks",
        [
            ("Implement student fee history endpoint with category breakdown", True),
            ("Build StudentFeeLedger.jsx showing invoices, payments, and balance", True),
            ("Support discount / scholarship ledger deduction tracking", True),
            ("Add exportable fee statement button", True),
        ],
    )

    # Card 4.1: Daily Student Attendance
    c4_1_title = "[SP: 5] [Must Have] 4.1: As a Class Teacher, I want to quickly mark daily class attendance and record absence reasons, so that student presence is accurately tracked and parents are notified of unexcused absences."
    c4_1_desc = """### User Story
**As a** Class Teacher,  
**I want** to quickly mark daily class attendance with present, absent, late, and excused statuses,  
**So that** attendance records are captured accurately and parents can be notified of unexcused absences.

---
### Story Points, Priority & Ownership
* **Story Points:** `5 SP`
* **Priority:** `High (Must Have)`
* **Sprint:** Sprint 2 (Phase 4: Attendance Management)
* **Assigned Team:** Muhammad Umer (Attendance Backend), Saad Asif (Fast Bulk Attendance Grid UI)

---
### Definition of Done (Acceptance Criteria)
- [x] Bulk attendance marking endpoint (`POST /api/attendance/bulk`) supporting class/section batches.
- [x] Keyboard-accessible, fast toggle grid interface (`AttendanceMarker.jsx`).
- [x] Support for status types: `Present`, `Absent`, `Late`, `Excused`.
- [x] Real-time class presence counter showing percentage attended today.

---
### Technical Architecture
* **Files:** `backend/routes/attendance.py`, `frontend/src/pages/Attendance/AttendanceMarker.jsx`
"""
    c4_1 = create_card(
        lists["completed_s2"],
        c4_1_title,
        desc=c4_1_desc,
        label_ids=[labels["Epic 4"], labels["P_High"]],
        member_ids=[umer_id, saad_id],
        due=sprint2_due,
    )
    add_checklist(
        c4_1,
        "Acceptance Tasks",
        [
            ("Implement bulk attendance marking API endpoint", True),
            ("Build AttendanceMarker.jsx with rapid Present/Absent/Late toggles", True),
            ("Add 'Mark All Present' quick-action button", True),
            ("Add daily presence percentage calculation card", True),
        ],
    )

    # Card 4.2: Attendance Analytics & Reports
    c4_2_title = "[SP: 3] [Should Have] 4.2: As an Administrator, I want attendance analytics and monthly summary reports, so that chronic absenteeism can be identified early and interventions taken."
    c4_2_desc = """### User Story
**As an** Administrator,  
**I want** attendance analytics and monthly student/class summaries,  
**So that** chronic absenteeism can be identified early and interventions taken.

---
### Story Points, Priority & Ownership
* **Story Points:** `3 SP`
* **Priority:** `Medium (Should Have)`
* **Sprint:** Sprint 2 (Phase 4: Attendance Analytics)
* **Assigned Team:** Jamal Matloob (Attendance Summary API), Saad Asif (Attendance Charts & Reports UI)

---
### Definition of Done (Acceptance Criteria)
- [x] Monthly attendance summary endpoint (`GET /api/attendance/report/monthly`).
- [x] Color-coded absence threshold warnings (< 75% highlighted in amber/red).
- [x] Interactive monthly heatmap/calendar view (`AttendanceReport.jsx`).
- [x] Printable class-wise attendance register export.

---
### Technical Architecture
* **Files:** `backend/routes/attendance.py`, `frontend/src/pages/Attendance/AttendanceReport.jsx`
"""
    c4_2 = create_card(
        lists["completed_s2"],
        c4_2_title,
        desc=c4_2_desc,
        label_ids=[labels["Epic 4"], labels["P_Med"]],
        member_ids=[jamal_id, saad_id],
        due=sprint2_due,
    )
    add_checklist(
        c4_2,
        "Acceptance Tasks",
        [
            ("Build monthly attendance aggregation endpoint", True),
            ("Implement threshold alert logic for attendance below 75%", True),
            ("Build AttendanceReport.jsx with date filters and status badges", True),
            ("Build exportable class attendance summary sheet", True),
        ],
    )

    # Card 5.1: Class Management
    c5_1_title = "[SP: 3] [Should Have] 5.1: As an Administrator, I want to organize students into class sections and assign dedicated class teachers, so that classroom rosters are balanced and teachers know their assigned cohorts."
    c5_1_desc = """### User Story
**As an** Administrator,  
**I want** to organize students into class sections and assign dedicated class teachers,  
**So that** classroom rosters are balanced and teachers know their assigned cohorts.

---
### Story Points, Priority & Ownership
* **Story Points:** `3 SP`
* **Priority:** `Medium (Should Have)`
* **Sprint:** Sprint 2 (Phase 5: Class Management)
* **Assigned Team:** Muhammad Umer (Backend Class API), Saad Asif (Frontend Class Views)

---
### Definition of Done (Acceptance Criteria)
- [x] Class management CRUD endpoints (`/api/classes`) supporting sections and student capacity limits.
- [x] UI pages (`ClassList.jsx`, `ClassForm.jsx`) for managing sections, academic years, and teachers.
- [x] Student records dynamically linked to class rosters with capacity validation.
- [x] Capacity warning badge when section reaches enrolled limit.

---
### Technical Architecture
* **Files:** `backend/routes/classes.py`, `frontend/src/pages/Classes/ClassList.jsx`
"""
    c5_1 = create_card(
        lists["completed_s2"],
        c5_1_title,
        desc=c5_1_desc,
        label_ids=[labels["Epic 5"], labels["P_Med"]],
        member_ids=[umer_id, saad_id],
        due=sprint2_due,
    )
    add_checklist(
        c5_1,
        "Acceptance Tasks",
        [
            ("Build class CRUD endpoints with capacity limits", True),
            ("Build ClassList.jsx and ClassForm.jsx for sections and teachers", True),
            ("Link student records dynamically to class rosters", True),
            ("Verify class capacity validation and roster integrity", True),
        ],
    )

    # Card 5.2: Timetable Conflict Detection Engine
    c5_2_title = "[SP: 5] [Should Have] 5.2: As an Administrator, I want an automated timetable scheduler with conflict detection, so that teachers and classrooms are never double-booked."
    c5_2_desc = """### User Story
**As an** Administrator,  
**I want** an automated timetable scheduler that prevents period conflicts and teacher overlaps,  
**So that** class routines run smoothly without room clashes or double-booked educators.

---
### Story Points, Priority & Ownership
* **Story Points:** `5 SP`
* **Priority:** `Medium (Should Have)`
* **Sprint:** Sprint 2 (Phase 5: Timetable Management)
* **Assigned Team:** Muhammad Umer (Timetable Engine & Conflict Algorithm), Jamal Matloob (API & Models)

---
### Definition of Done (Acceptance Criteria)
- [x] Timetable CRUD endpoints (`/api/timetable`) with period start/end time validation.
- [x] Conflict detection algorithm preventing teacher overlap at identical time slots.
- [x] Room clash prevention ensuring a single classroom hosts only one section per period.
- [x] Interactive weekly timetable grid view (`Timetable.jsx`) with drag-and-drop support.

---
### Technical Architecture
* **Files:** `backend/routes/timetable.py`, `frontend/src/pages/Timetable/Timetable.jsx`
"""
    c5_2 = create_card(
        lists["completed_s2"],
        c5_2_title,
        desc=c5_2_desc,
        label_ids=[labels["Epic 5"], labels["P_Med"]],
        member_ids=[umer_id, jamal_id],
        due=sprint2_due,
    )
    add_checklist(
        c5_2,
        "Acceptance Tasks",
        [
            ("Build timetable database models for Periods, Rooms, and Slots", True),
            ("Implement conflict detection algorithm for teacher and room double-booking", True),
            ("Build weekly interactive schedule grid in Timetable.jsx", True),
            ("Add exportable PDF/Printable timetable layout", True),
        ],
    )

    # Card 5.3: Examination Marks Entry & Auto-Grading
    c5_3_title = "[SP: 5] [Could Have] 5.3: As a Teacher, I want to enter student exam marks in bulk and have grades and GPAs auto-calculated, so that report cards are generated without manual arithmetic errors."
    c5_3_desc = """### User Story
**As a** Teacher,  
**I want** to enter student exam marks in bulk and have grades and GPAs auto-calculated,  
**So that** report cards are calculated without manual arithmetic errors.

---
### Story Points, Priority & Ownership
* **Story Points:** `5 SP`
* **Priority:** `Low (Could Have)`
* **Sprint:** Sprint 2 (Phase 5: Examination Management)
* **Assigned Team:** Muhammad Umer (Grading Engine & GPA), Saad Asif (Bulk Marks Entry Grid)

---
### Definition of Done (Acceptance Criteria)
- [x] Bulk exam marks entry endpoint (`POST /api/exams/marks/bulk`).
- [x] Auto-grading formula (A+, A, B, C, F) and GPA calculation based on Pakistani board standards.
- [x] Student report card summary view with pass/fail indicators and position ranks.
- [x] Marks lock feature preventing grade tampering after final submission.

---
### Technical Architecture
* **Files:** `backend/routes/exams.py`, `frontend/src/pages/Exams/MarksEntry.jsx`
"""
    c5_3 = create_card(
        lists["completed_s2"],
        c5_3_title,
        desc=c5_3_desc,
        label_ids=[labels["Epic 5"], labels["P_Low"]],
        member_ids=[umer_id, saad_id],
        due=sprint2_due,
    )
    add_checklist(
        c5_3,
        "Acceptance Tasks",
        [
            ("Build exam definition endpoints with max/passing marks criteria", True),
            ("Implement bulk marks entry sheet with dynamic GPA calculation", True),
            ("Add report card generation logic with subject remarks", True),
            ("Implement final marks submission locking mechanism", True),
        ],
    )

    # Card 6.1: School Analytics Dashboard
    c6_1_title = "[SP: 5] [Could Have] 6.1: As a School Principal, I want a comprehensive executive dashboard with fee revenue, enrollment trends, and attendance statistics, so that I can make data-driven administrative decisions."
    c6_1_desc = """### User Story
**As a** School Principal,  
**I want** a comprehensive executive dashboard with fee revenue, enrollment trends, and attendance statistics,  
**So that** I can make data-driven administrative decisions.

---
### Story Points, Priority & Ownership
* **Story Points:** `5 SP`
* **Priority:** `Low (Could Have)`
* **Sprint:** Sprint 2 (Phase 6: School Analytics)
* **Assigned Team:** Saad Asif (Executive Dashboard UI), Jamal Matloob (Analytics SQL Aggregation)

---
### Definition of Done (Acceptance Criteria)
- [x] Executive dashboard endpoint (`GET /api/dashboard/stats`) returning summary metrics.
- [x] Modern interactive cards for Total Students, Active Staff, Monthly Revenue, and Average Attendance.
- [x] Chart visualizations for fee collection trends and grade distributions.
- [x] Role-tailored views displaying relevant KPIs for Principal vs Accountant.

---
### Technical Architecture
* **Files:** `backend/routes/dashboard.py`, `frontend/src/pages/Dashboard/Dashboard.jsx`
"""
    c6_1 = create_card(
        lists["completed_s2"],
        c6_1_title,
        desc=c6_1_desc,
        label_ids=[labels["Epic 6"], labels["P_Low"]],
        member_ids=[saad_id, jamal_id],
        due=sprint2_due,
    )
    add_checklist(
        c6_1,
        "Acceptance Tasks",
        [
            ("Build dashboard aggregation API endpoint with fast SQL queries", True),
            ("Design responsive Dashboard.jsx with statistics cards and charts", True),
            ("Add fee revenue trend chart and monthly attendance comparison", True),
            ("Implement quick-action shortcut buttons for common administrative tasks", True),
        ],
    )

    # Card 6.2: PDF Fee Challans & Report Cards
    c6_2_title = "[SP: 3] [Could Have] 6.2: As a Parent or Accountant, I want to download standardized 3-copy PDF fee challans and official term report cards, so that documents can be printed for physical records and bank payments."
    c6_2_desc = """### User Story
**As a** Parent or Accountant,  
**I want** to download standardized 3-copy PDF fee challans and official term report cards,  
**So that** documents can be printed for physical records and bank payments.

---
### Story Points, Priority & Ownership
* **Story Points:** `3 SP`
* **Priority:** `Low (Could Have)`
* **Sprint:** Sprint 2 (Phase 6: PDF Reports)
* **Assigned Team:** Jamal Matloob (ReportLab PDF Generation), Saad Asif (PDF Viewer & Export Modal)

---
### Definition of Done (Acceptance Criteria)
- [x] Python ReportLab backend generating 3-copy bank challans (Bank Copy, School Copy, Student Copy).
- [x] Official student term report card PDF with school header, grading key, and principal signature box.
- [x] Pakistani Rupee formatting (`PKR`) and barcode representation of challan number.
- [x] In-browser preview modal before download.

---
### Technical Architecture
* **Files:** `backend/utils/pdf_generator.py`, `frontend/src/components/ChallanModal.jsx`
"""
    c6_2 = create_card(
        lists["completed_s2"],
        c6_2_title,
        desc=c6_2_desc,
        label_ids=[labels["Epic 6"], labels["P_Low"]],
        member_ids=[jamal_id, saad_id],
        due=sprint2_due,
    )
    add_checklist(
        c6_2,
        "Acceptance Tasks",
        [
            ("Develop ReportLab 3-copy bank challan PDF generator", True),
            ("Develop term report card PDF generator with grading breakdown", True),
            ("Embed official school logo, challan barcodes, and signature blocks", True),
            ("Add in-browser print and download modal in React frontend", True),
        ],
    )

    # Card 6.3: Production Deployment & Packaging
    c6_3_title = "[SP: 5] [Should Have] 6.3: As a School IT Administrator, I want automated Docker containerization and setup scripts, so that the entire school system can be deployed and maintained without complex dependencies."
    c6_3_desc = """### User Story
**As a** School IT Administrator,  
**I want** automated Docker containerization and setup scripts,  
**So that** the entire school system can be deployed and maintained without complex server configurations.

---
### Story Points, Priority & Ownership
* **Story Points:** `5 SP`
* **Priority:** `Medium (Should Have)`
* **Sprint:** Sprint 2 (Phase 6: Deployment & Infrastructure)
* **Assigned Team:** Jamal Matloob (Docker & Deployment Scripts), Muhammad Umer (FastAPI Optimization)

---
### Definition of Done (Acceptance Criteria)
- [x] `Dockerfile` and `docker-compose.yml` for unified backend and frontend orchestration.
- [x] Persistent SQLite database volume mapping for zero data loss on restart.
- [x] Production environment configuration with CORS security policies.
- [x] Automated database seeding script for quick demonstration setups.

---
### Technical Architecture
* **Files:** `Dockerfile`, `docker-compose.yml`, `backend/app/main.py`
"""
    c6_3 = create_card(
        lists["completed_s2"],
        c6_3_title,
        desc=c6_3_desc,
        label_ids=[labels["Epic 6"], labels["P_Med"]],
        member_ids=[jamal_id, umer_id],
        due=sprint2_due,
    )
    add_checklist(
        c6_3,
        "Acceptance Tasks",
        [
            ("Build multi-stage Dockerfile for FastAPI backend and React frontend", True),
            ("Create docker-compose.yml with volume mounting for SQLite database", True),
            ("Configure production CORS policies and security headers", True),
            ("Write automated startup verification and seeding script", True),
        ],
    )

    # =============================================================
    # SPRINT 3 (QUALITY ASSURANCE, TESTING & RELEASE READINESS)
    # Total: 12 User Stories (42 Story Points)
    # - 2 Stories Spilled over from Sprint 2 (due to Jamal's hackathon weekend delay)
    # - 10 Dedicated QA User Stories led by Musfirah Abbas (QA Lead)
    # =============================================================
    print("\nAdding Sprint 3 Cards...")

    # -------------------------------------------------------------
    # QA & TESTING (Sprint 3) -> 5 Cards (19 Story Points)
    # -------------------------------------------------------------
    print("  -> Adding QA & Testing Cards...")

    # QA-2.1 [Spillover from Sprint 2]: Timetable Collision & Scheduling Engine
    c_qa2_1_title = "[SP: 3] [Must Have] [Spillover from Sprint 2] QA-2.1: As a QA Lead, I want exhaustive verification of timetable collision and room scheduling rules, so that no teacher or classroom double-booking occurs in production."
    c_qa2_1_desc = """### User Story
**As a** QA Testing Lead,  
**I want** exhaustive automated and manual verification of timetable clash algorithms and room scheduling,  
**So that** teachers and physical classrooms are never double-booked in active production sessions.

---
### Retrospective & Spillover Notice
> **[Spillover from Sprint 2]**: Backend timetable conflict detection was finalized late Sunday afternoon due to Jamal attending a weekend hackathon. The QA verification window missed the Sprint 2 review cut-off and was carried over to Sprint 3 for full validation.

---
### Story Points, Priority & Ownership
* **Story Points:** `3 SP`
* **Priority:** `High (Must Have)`
* **Sprint:** Sprint 3 (Carried from Sprint 2)
* **Assigned Team:** Musfirah Abbas (QA Testing Lead), Muhammad Umer (Test Automation & Backend Verification)

---
### Definition of Done (Acceptance Criteria)
- [x] Test suite verifying period collision logic when a teacher is assigned to 2 classes at the same time.
- [x] Test suite verifying room allocation conflicts when a room is booked for overlapping sections.
- [x] Boundary testing for zero-length periods, recess break overlaps, and multi-period labs.
- [ ] Sign-off verification across 10 sample weekly class timetables.

---
### Technical Architecture
* **Files:** `backend/tests/test_timetable.py`, `backend/app/routers/timetable.py`
"""
    c_qa2_1 = create_card(
        lists["qa_testing"],
        c_qa2_1_title,
        desc=c_qa2_1_desc,
        label_ids=[labels["QA"], labels["P_High"]],
        member_ids=[musfirah_id, umer_id],
        due=sprint3_due,
    )
    add_checklist(
        c_qa2_1,
        "Acceptance Tasks",
        [
            ("Run test cases for teacher double-booking detection", True),
            ("Run test cases for classroom room conflict detection", True),
            ("Verify recess and break period constraints across all days", True),
            ("Validate weekly schedule grid UI under conflicting inputs", False),
        ],
    )

    # QA-2.2 [Spillover from Sprint 2]: PDF Challan & Report Card Export QA
    c_qa2_2_title = "[SP: 3] [Must Have] [Spillover from Sprint 2] QA-2.2: As a QA Lead, I want comprehensive formatting and print margin QA testing for PDF fee challans and report cards, so that documents print reliably across physical printers."
    c_qa2_2_desc = """### User Story
**As a** QA Testing Lead,  
**I want** comprehensive formatting, barcode, and print margin QA testing for 3-copy PDF fee challans and report cards,  
**So that** vouchers print reliably across standard physical printers and bank teller systems.

---
### Retrospective & Spillover Notice
> **[Spillover from Sprint 2]**: ReportLab PDF styling was completed late Sunday after Jamal returned from the hackathon. QA verification across multiple page sizes and physical print layouts was carried over into Sprint 3.

---
### Story Points, Priority & Ownership
* **Story Points:** `3 SP`
* **Priority:** `High (Must Have)`
* **Sprint:** Sprint 3 (Carried from Sprint 2)
* **Assigned Team:** Musfirah Abbas (QA Testing Lead), Jamal Matloob (PDF Formatting Verification)

---
### Definition of Done (Acceptance Criteria)
- [x] Automated layout validation verifying 3-copy challan (Bank, School, Student) fits on a single A4 page.
- [x] High-resolution barcode readability testing for automated bank scanners.
- [x] Currency formatting validation ensuring `PKR` and thousand separators render correctly.
- [ ] Physical printer test pass verifying 0.5-inch margin safety bounds without clipping.

---
### Technical Architecture
* **Files:** `backend/utils/pdf_generator.py`, `backend/tests/test_pdf.py`
"""
    c_qa2_2 = create_card(
        lists["qa_testing"],
        c_qa2_2_title,
        desc=c_qa2_2_desc,
        label_ids=[labels["QA"], labels["P_High"]],
        member_ids=[musfirah_id, jamal_id],
        due=sprint3_due,
    )
    add_checklist(
        c_qa2_2,
        "Acceptance Tasks",
        [
            ("Validate 3-copy bank challan fits cleanly on single A4 sheet", True),
            ("Verify barcode scan accuracy on generated PDF vouchers", True),
            ("Check Pakistani Rupee (PKR) formatting and comma separation", True),
            ("Verify printer margins and page break logic on physical prints", False),
        ],
    )

    # QA-3.1: Automated Pytest Regression Suite
    c_qa3_1_title = "[SP: 5] [Must Have] QA-3.1: As a QA Lead, I want a complete automated Pytest test suite executed across all core endpoints, so that code regressions are identified instantly on continuous integration."
    c_qa3_1_desc = """### User Story
**As a** QA Testing Lead,  
**I want** a complete automated Pytest regression test suite executing across all core API endpoints,  
**So that** regressions are caught instantly and code coverage exceeds 85%.

---
### Story Points, Priority & Ownership
* **Story Points:** `5 SP`
* **Priority:** `High (Must Have)`
* **Sprint:** Sprint 3 (Quality Assurance & Test Automation)
* **Assigned Team:** Musfirah Abbas (QA Testing Lead), Muhammad Umer (Test Automation & Backend Verification)

---
### Definition of Done (Acceptance Criteria)
- [x] 22/22 pytest unit and integration test cases executed and passing with 0 failures.
- [x] Test coverage across authentication, student enrollment, fee collection, and attendance.
- [x] In-memory SQLite fixture isolation preventing test database pollution.
- [ ] Automated CI test pipeline execution badge configured in repository README.

---
### Technical Architecture
* **Files:** `backend/tests/`, `backend/tests/conftest.py`
"""
    c_qa3_1 = create_card(
        lists["qa_testing"],
        c_qa3_1_title,
        desc=c_qa3_1_desc,
        label_ids=[labels["QA"], labels["P_High"]],
        member_ids=[musfirah_id, umer_id],
        due=sprint3_due,
    )
    add_checklist(
        c_qa3_1,
        "Acceptance Tasks",
        [
            ("Run full Pytest test suite (22/22 test cases passing)", True),
            ("Validate test database fixture isolation and rollback", True),
            ("Verify API response schema validation on all tested endpoints", True),
            ("Document automated test execution command for evaluation team", False),
        ],
    )

    # QA-3.2: RBAC Security Audit
    c_qa3_2_title = "[SP: 5] [Must Have] QA-3.2: As a QA Lead, I want a security and permissions audit conducted across all 4 user roles, so that unauthorized access to financial and grading routes is strictly blocked."
    c_qa3_2_desc = """### User Story
**As a** QA Testing Lead,  
**I want** a security penetration and role-based access audit conducted across Admin, Teacher, Accountant, and Principal roles,  
**So that** unauthorized access to financial ledgers and grade records is strictly blocked.

---
### Story Points, Priority & Ownership
* **Story Points:** `5 SP`
* **Priority:** `High (Must Have)`
* **Sprint:** Sprint 3 (Security & RBAC Verification)
* **Assigned Team:** Musfirah Abbas (QA Testing Lead), Muhammad Umer (Security Middleware Fixes)

---
### Definition of Done (Acceptance Criteria)
- [x] Verify Teachers cannot access `/api/fees` modification endpoints (HTTP 403 Forbidden).
- [x] Verify Accountants cannot alter examination marks or attendance records.
- [x] Verify unauthenticated requests without valid JWT token return HTTP 401 Unauthorized.
- [ ] Test JWT token expiration handling and automatic client logout flow.

---
### Technical Architecture
* **Files:** `backend/app/middleware/rbac.py`, `backend/tests/test_rbac.py`
"""
    c_qa3_2 = create_card(
        lists["qa_testing"],
        c_qa3_2_title,
        desc=c_qa3_2_desc,
        label_ids=[labels["QA"], labels["P_High"]],
        member_ids=[musfirah_id, umer_id],
        due=sprint3_due,
    )
    add_checklist(
        c_qa3_2,
        "Acceptance Tasks",
        [
            ("Test Teacher role boundary: Block access to fee collection routes", True),
            ("Test Accountant role boundary: Block access to examination grading routes", True),
            ("Test expired/tampered JWT tokens return 401 status", True),
            ("Verify frontend navigation hides restricted menus based on user role", False),
        ],
    )

    # QA-3.3: Fee Concession & Multi-Category Testing
    c_qa3_3_title = "[SP: 3] [Should Have] QA-3.3: As a QA Lead, I want testing of student fee discounts, scholarships, and optional fee categories, so that invoices and fee waivers calculate with 100% mathematical accuracy."
    c_qa3_3_desc = """### User Story
**As a** QA Testing Lead,  
**I want** rigorous mathematical testing of fee discount rules, scholarships, and optional fee categories,  
**So that** invoices, fee waivers, and outstanding dues calculate with 100% mathematical accuracy.

---
### Story Points, Priority & Ownership
* **Story Points:** `3 SP`
* **Priority:** `Medium (Should Have)`
* **Sprint:** Sprint 3 (Financial Calculation QA)
* **Assigned Team:** Musfirah Abbas (QA Testing Lead), Jamal Matloob (Fee Ledger Verification)

---
### Definition of Done (Acceptance Criteria)
- [x] Verify 100% scholarship edge-case generates a valid 0 PKR fee challan without division errors.
- [x] Verify partial concessions (25%, 50%) apply strictly to tuition without altering lab fees.
- [x] Verify student fee category additions (Transport, Stationery, Sports) reflect in net payable balance.
- [ ] Validate recalculation of balances when payment is collected in installments.

---
### Technical Architecture
* **Files:** `backend/app/routers/fees.py`, `frontend/src/components/FeeCategoriesModal.jsx`
"""
    c_qa3_3 = create_card(
        lists["qa_testing"],
        c_qa3_3_title,
        desc=c_qa3_3_desc,
        label_ids=[labels["QA"], labels["P_Med"]],
        member_ids=[musfirah_id, jamal_id],
        due=sprint3_due,
    )
    add_checklist(
        c_qa3_3,
        "Acceptance Tasks",
        [
            ("Test 100% full scholarship waiver calculations (0 PKR challan)", True),
            ("Test percentage concession formula on multi-component fee structures", True),
            ("Test custom optional fee category additions (Stationery, Uniform)", True),
            ("Verify partial installment payment balance update accuracy", False),
        ],
    )

    # -------------------------------------------------------------
    # IN PROGRESS (Sprint 3) -> 4 Cards (12 Story Points)
    # -------------------------------------------------------------
    print("  -> Adding In Progress Cards...")

    # QA-3.4: Academic Promotion & Session Transition
    c_qa3_4_title = "[SP: 3] [Should Have] QA-3.4: As a QA Lead, I want validation of student academic promotion and session transition data integrity, so that promoted students advance cleanly without duplicate enrollment records."
    c_qa3_4_desc = """### User Story
**As a** QA Testing Lead,  
**I want** validation of batch academic promotion and session rollover data integrity,  
**So that** promoted students advance cleanly to higher grades without creating duplicate or corrupted records.

---
### Story Points, Priority & Ownership
* **Story Points:** `3 SP`
* **Priority:** `Medium (Should Have)`
* **Sprint:** Sprint 3 (Academic Cycle Testing)
* **Assigned Team:** Musfirah Abbas (QA Testing Lead), Muhammad Umer (Database Integrity Verification)

---
### Definition of Done (Acceptance Criteria)
- [x] Promotion algorithm correctly advances passed students to next grade (e.g., Grade 9 -> Grade 10).
- [x] Failed or retained students remain in previous grade while updating active academic year.
- [ ] Verify historical fee ledgers and marks from previous academic sessions remain immutable.
- [ ] Roll number reassignment handles section reorganizations cleanly.

---
### Technical Architecture
* **Files:** `backend/app/utils/student_promotion.py`, `backend/app/routers/academic_years.py`
"""
    c_qa3_4 = create_card(
        lists["in_progress"],
        c_qa3_4_title,
        desc=c_qa3_4_desc,
        label_ids=[labels["QA"], labels["P_Med"]],
        member_ids=[musfirah_id, umer_id],
        due=sprint3_due,
    )
    add_checklist(
        c_qa3_4,
        "Acceptance Tasks",
        [
            ("Test batch promotion of passed cohort to next grade level", True),
            ("Test retention and repeat status for failed students", True),
            ("Verify archival immutability of previous term report cards", False),
            ("Check roll number collision prevention in newly formed sections", False),
        ],
    )

    # QA-3.5: Attendance Edge Case Verification
    c_qa3_5_title = "[SP: 3] [Should Have] QA-3.5: As a QA Lead, I want edge-case testing of daily attendance logging and absence threshold alerts, so that warning notifications trigger reliably at exact thresholds."
    c_qa3_5_desc = """### User Story
**As a** QA Testing Lead,  
**I want** edge-case testing of daily attendance logging, excuse notes, and absence threshold alerts,  
**So that** warning alerts trigger reliably when student attendance drops below 75%.

---
### Story Points, Priority & Ownership
* **Story Points:** `3 SP`
* **Priority:** `Medium (Should Have)`
* **Sprint:** Sprint 3 (Attendance Verification)
* **Assigned Team:** Musfirah Abbas (QA Testing Lead), Saad Asif (UI Warning Verification)

---
### Definition of Done (Acceptance Criteria)
- [x] Test boundary case: Student exactly at 75.0% vs 74.9% triggers alert status correctly.
- [x] Test retroactive excuse note submission changes absence state to `Excused`.
- [ ] Verify weekend and school holiday exclusion from working days denominator.
- [ ] Test rapid consecutive clicks on bulk attendance grid without duplicate database entries.

---
### Technical Architecture
* **Files:** `backend/routes/attendance.py`, `frontend/src/pages/Attendance/AttendanceMarker.jsx`
"""
    c_qa3_5 = create_card(
        lists["in_progress"],
        c_qa3_5_title,
        desc=c_qa3_5_desc,
        label_ids=[labels["QA"], labels["P_Med"]],
        member_ids=[musfirah_id, saad_id],
        due=sprint3_due,
    )
    add_checklist(
        c_qa3_5,
        "Acceptance Tasks",
        [
            ("Verify 75% attendance threshold warning trigger at boundary decimals", True),
            ("Verify excuse note attachment updates absence classification", True),
            ("Check holiday exclusions from total school days calculation", False),
            ("Test rapid concurrent bulk submit clicks for race conditions", False),
        ],
    )

    # QA-3.6: Dark/Light Mode Theme Contrast & UI Audit
    c_qa3_6_title = "[SP: 3] [Could Have] QA-3.6: As a QA Lead, I want a comprehensive visual audit of Dark/Light theme switching and glassmorphic UI elements, so that all screens meet WCAG AA contrast standards."
    c_qa3_6_desc = """### User Story
**As a** QA Testing Lead,  
**I want** a comprehensive visual and styling audit of Dark and Light modes across all application modules,  
**So that** text contrast meets WCAG AA standards and glassmorphic elements render legibly.

---
### Story Points, Priority & Ownership
* **Story Points:** `3 SP`
* **Priority:** `Low (Could Have)`
* **Sprint:** Sprint 3 (UI Aesthetics & Accessibility Audit)
* **Assigned Team:** Musfirah Abbas (QA Testing Lead), Saad Asif (Frontend Theme Polish)

---
### Definition of Done (Acceptance Criteria)
- [x] Audit all input fields, table headers, and modal text against WCAG AA 4.5:1 contrast ratio.
- [x] Verify theme state (`dark` vs `light`) persists reliably in localStorage across browser reloads.
- [ ] Verify modal backdrop blur effect does not obscure form submission buttons on dark mode.
- [ ] Fix color bleed on status chips in Teacher and Academic Year management tables.

---
### Technical Architecture
* **Files:** `frontend/src/index.css`, `frontend/src/context/ThemeContext.jsx`
"""
    c_qa3_6 = create_card(
        lists["in_progress"],
        c_qa3_6_title,
        desc=c_qa3_6_desc,
        label_ids=[labels["QA"], labels["P_Low"]],
        member_ids=[musfirah_id, saad_id],
        due=sprint3_due,
    )
    add_checklist(
        c_qa3_6,
        "Acceptance Tasks",
        [
            ("Measure text contrast ratios across all pages in Dark mode", True),
            ("Check localStorage theme persistence across browser restarts", True),
            ("Audit modal backdrop glassmorphism and input field readability", False),
            ("Verify status pill badge readability in both Light and Dark modes", False),
        ],
    )

    # QA-3.7: Cross-Browser & Viewport Responsiveness
    c_qa3_7_title = "[SP: 3] [Could Have] QA-3.7: As a QA Lead, I want cross-browser and multi-viewport testing conducted, so that the web application functions seamlessly on desktop, laptop, and tablet devices."
    c_qa3_7_desc = """### User Story
**As a** QA Testing Lead,  
**I want** cross-browser compatibility and multi-viewport responsive testing executed,  
**So that** teachers and staff can access school features from tablets and laptops without broken layouts.

---
### Story Points, Priority & Ownership
* **Story Points:** `3 SP`
* **Priority:** `Low (Could Have)`
* **Sprint:** Sprint 3 (Cross-Platform Verification)
* **Assigned Team:** Musfirah Abbas (QA Testing Lead), Saad Asif (Responsive CSS Polish)

---
### Definition of Done (Acceptance Criteria)
- [x] Verify layout stability on Google Chrome, Mozilla Firefox, and Microsoft Edge.
- [ ] Verify responsive sidebar drawer toggle on tablet screen widths (768px - 1024px).
- [ ] Audit table horizontal scroll behavior on 1366x768 laptop resolutions.
- [ ] Validate touch event responsiveness on attendance toggle buttons.

---
### Technical Architecture
* **Files:** `frontend/src/components/Sidebar.jsx`, `frontend/src/App.jsx`
"""
    c_qa3_7 = create_card(
        lists["in_progress"],
        c_qa3_7_title,
        desc=c_qa3_7_desc,
        label_ids=[labels["QA"], labels["P_Low"]],
        member_ids=[musfirah_id, saad_id],
        due=sprint3_due,
    )
    add_checklist(
        c_qa3_7,
        "Acceptance Tasks",
        [
            ("Execute test suite across Chrome, Firefox, and Microsoft Edge", True),
            ("Test collapsible sidebar drawer behavior on 768px tablet width", False),
            ("Verify table horizontal scroll bar readability on laptop screens", False),
            ("Test touch/click target sizing on mobile and tablet screens", False),
        ],
    )

    # -------------------------------------------------------------
    # TO DO (Sprint 3) -> 3 Cards (11 Story Points)
    # -------------------------------------------------------------
    print("  -> Adding To Do Cards...")

    # QA-3.8: Exam Mark Calculations & GPA Precision
    c_qa3_8_title = "[SP: 3] [Should Have] QA-3.8: As a QA Lead, I want verification of examination grading formulae and cumulative GPA calculations, so that transcripts reflect accurate student standing without rounding errors."
    c_qa3_8_desc = """### User Story
**As a** QA Testing Lead,  
**I want** comprehensive verification of examination grading scales and GPA calculations,  
**So that** student transcripts reflect exact class rankings without floating-point rounding errors.

---
### Story Points, Priority & Ownership
* **Story Points:** `3 SP`
* **Priority:** `Medium (Should Have)`
* **Sprint:** Sprint 3 (Grading & Transcripts QA)
* **Assigned Team:** Musfirah Abbas (QA Testing Lead), Muhammad Umer (Algorithm Verification)

---
### Definition of Done (Acceptance Criteria)
- [ ] Boundary score testing for letter grades (e.g., 79.9% vs 80.0% boundary for A grade).
- [ ] Floating-point precision verification for GPA calculations (2 decimal place precision).
- [ ] Position ranking algorithm handles ties appropriately (joint 1st / 2nd place).
- [ ] Test bulk CSV marks import validation preventing negative marks or scores above maximum.

---
### Technical Architecture
* **Files:** `backend/routes/exams.py`, `backend/tests/test_exams.py`
"""
    c_qa3_8 = create_card(
        lists["to_do"],
        c_qa3_8_title,
        desc=c_qa3_8_desc,
        label_ids=[labels["QA"], labels["P_Med"]],
        member_ids=[musfirah_id, umer_id],
        due=sprint3_due,
    )
    add_checklist(
        c_qa3_8,
        "Acceptance Tasks",
        [
            ("Run boundary score tests on letter grade break-points", False),
            ("Verify floating-point precision on cumulative GPA calculation", False),
            ("Test tie-breaker logic on class position rank calculation", False),
            ("Validate marks input validation rejecting scores above maximum allowed", False),
        ],
    )

    # QA-3.9: Production Docker Image & Startup Verification
    c_qa3_9_title = "[SP: 3] [Could Have] QA-3.9: As a QA Lead, I want verification of the Docker containerization build and startup lifecycle, so that the deployment package initializes cleanly on fresh host systems."
    c_qa3_9_desc = """### User Story
**As a** QA Testing Lead,  
**I want** verification of Docker containerization builds and clean environment spin-up,  
**So that** the deployment package initializes cleanly on evaluation machines without pre-installed dependencies.

---
### Story Points, Priority & Ownership
* **Story Points:** `3 SP`
* **Priority:** `Low (Could Have)`
* **Sprint:** Sprint 3 (Deployment QA)
* **Assigned Team:** Musfirah Abbas (QA Testing Lead), Jamal Matloob (DevOps Verification)

---
### Definition of Done (Acceptance Criteria)
- [ ] `docker compose up --build` launches backend and frontend containers within 60 seconds.
- [ ] Health check endpoint (`/api/health`) reports database connection status `healthy`.
- [ ] Volume persistence test: Restarting containers retains seeded student and fee records.
- [ ] Container memory and CPU utilization remains within lightweight bounds (< 500MB RAM).

---
### Technical Architecture
* **Files:** `docker-compose.yml`, `Dockerfile`
"""
    c_qa3_9 = create_card(
        lists["to_do"],
        c_qa3_9_title,
        desc=c_qa3_9_desc,
        label_ids=[labels["QA"], labels["P_Low"]],
        member_ids=[musfirah_id, jamal_id],
        due=sprint3_due,
    )
    add_checklist(
        c_qa3_9,
        "Acceptance Tasks",
        [
            ("Test clean Docker Compose build from scratch", False),
            ("Verify /api/health endpoint returns 200 OK on container startup", False),
            ("Verify persistent volume holds SQLite database across container restarts", False),
            ("Measure container startup time and memory footprint benchmarks", False),
        ],
    )

    # QA-3.10: End-to-End User Acceptance Testing (UAT)
    c_qa3_10_title = "[SP: 5] [Should Have] QA-3.10: As a QA Lead, I want complete End-to-End User Acceptance Testing (UAT) and release sign-off documentation completed, so that the project is certified presentation-ready."
    c_qa3_10_desc = """### User Story
**As a** QA Testing Lead,  
**I want** complete End-to-End User Acceptance Testing (UAT) and release sign-off documentation completed,  
**So that** the system is fully verified, stable, and presentation-ready for SPM course evaluation.

---
### Story Points, Priority & Ownership
* **Story Points:** `5 SP`
* **Priority:** `Medium (Should Have)`
* **Sprint:** Sprint 3 (Final UAT & Release Sign-Off)
* **Assigned Team:** Musfirah Abbas (QA Testing Lead), Saad Asif (UAT Documentation)

---
### Definition of Done (Acceptance Criteria)
- [ ] Complete student lifecycle walkthrough: Admission -> Class Roster -> Attendance -> Exam Marks -> Fee Payment -> Promotion.
- [ ] Edge-case error handling audit ensuring friendly toast error messages on all API failures.
- [ ] UAT sign-off matrix documenting test scenarios, expected vs actual outputs, and tester signatures.
- [ ] Final release demo script prepared for presentation team.

---
### Technical Architecture
* **Files:** Entire application stack (`frontend/src/`, `backend/app/`)
"""
    c_qa3_10 = create_card(
        lists["to_do"],
        c_qa3_10_title,
        desc=c_qa3_10_desc,
        label_ids=[labels["QA"], labels["P_Med"]],
        member_ids=[musfirah_id, saad_id],
        due=sprint3_due,
    )
    add_checklist(
        c_qa3_10,
        "Acceptance Tasks",
        [
            ("Perform full student lifecycle end-to-end walkthrough", False),
            ("Audit user-facing error toast messages on network failure", False),
            ("Compile formal UAT sign-off report with test matrix results", False),
            ("Prepare interactive presentation demonstration walkthrough script", False),
        ],
    )

    # =============================================================
    # PROJECT BACKLOG (Future Enhancements & Stretch Goals)
    # Total: 2 Cards (8 Story Points)
    # =============================================================
    print("\nAdding Project Backlog Stretch Goal Cards...")

    # Card 7.1: SMS Notifications
    c7_1_title = "[SP: 3] [Could Have] 7.1: As an Administrator, I want automated SMS notifications for fee dues and absence alerts, so that parents are kept informed in real time."
    c7_1_desc = """### User Story
**As an** Administrator,  
**I want** automated SMS notifications dispatched for overdue fee balances and unexcused student absences,  
**So that** parents are kept informed in real time without manual phone calls.

---
### Story Points, Priority & Ownership
* **Story Points:** `3 SP`
* **Priority:** `Low (Could Have)`
* **Sprint:** Project Backlog (Future Release v2 Stretch Goal)
* **Assigned Team:** Muhammad Umer (SMS Gateway Backend), Jamal Matloob (Dispatch Webhook)

---
### Definition of Done (Acceptance Criteria)
- [ ] SMS gateway API integration for local telecom providers.
- [ ] Automated absence alert trigger when daily attendance is submitted.
- [ ] Batch fee overdue reminder dispatch endpoint.
"""
    c7_1 = create_card(
        lists["backlog"],
        c7_1_title,
        desc=c7_1_desc,
        label_ids=[labels["Epic 6"], labels["P_Low"]],
        member_ids=[umer_id, jamal_id],
    )
    add_checklist(
        c7_1,
        "Acceptance Tasks",
        [
            ("Research local SMS gateway API provider integration", False),
            ("Build automated trigger for daily unexcused student absences", False),
            ("Build fee overdue reminder dispatch endpoint", False),
        ],
    )

    # Card 7.2: Biometric RFID Hardware
    c7_2_title = "[SP: 5] [Could Have] 7.2: As a School Principal, I want biometric RFID attendance scanner synchronization, so that staff check-in timestamps are captured automatically without manual entry."
    c7_2_desc = """### User Story
**As a** School Principal,  
**I want** biometric RFID card scanner synchronization for staff and faculty,  
**So that** daily check-in and check-out timestamps are captured automatically without manual paper logs.

---
### Story Points, Priority & Ownership
* **Story Points:** `5 SP`
* **Priority:** `Low (Could Have)`
* **Sprint:** Project Backlog (Future Release v2 Stretch Goal)
* **Assigned Team:** Jamal Matloob (Device Protocol Ingestion), Saad Asif (Live Presence Kiosk UI)

---
### Definition of Done (Acceptance Criteria)
- [ ] Serial/USB protocol listener for RFID smart-card readers.
- [ ] Real-time check-in ingestion webhook logging staff timestamp and portal status.
- [ ] Live reception kiosk dashboard displaying present faculty in real time.
"""
    c7_2 = create_card(
        lists["backlog"],
        c7_2_title,
        desc=c7_2_desc,
        label_ids=[labels["Epic 6"], labels["P_Low"]],
        member_ids=[jamal_id, saad_id],
    )
    add_checklist(
        c7_2,
        "Acceptance Tasks",
        [
            ("Define serial/USB protocol parser for RFID biometric card readers", False),
            ("Implement real-time check-in ingestion webhook", False),
            ("Build live staff presence kiosk display page", False),
        ],
    )

    print("\n" + "=" * 70)
    print("[SUCCESS] Trello Board updated successfully!")
    print("   - Priority Colors: Pure Red (High), Pure Yellow (Medium), Pure Green (Low)")
    print("   - Epic & QA Colors: Purple, Blue, Sky (Light Blue), Black (No Red/Yellow/Green shades!)")
    print("   - Board Label Order: Epics first, Priorities second -> 1st: Epic, 2nd: Priority on every card")
    print("   - Sprint 1: 5 Cards (21 SP) [Completed]")
    print("   - Sprint 2: 10 Dev Cards (42 SP) [Completed Development]")
    print("   - Sprint 3: 12 QA Cards (42 SP):")
    print("       * 2 Spillover Cards from Sprint 2 (Jamal hackathon delay narrative)")
    print("       * 10 Comprehensive QA Stories across QA & Testing, In Progress, To Do")
    print("   - Musfirah Abbas assigned strictly as QA Testing Lead on all QA stories")
    print("   - Backlog: 2 Stretch Goal Cards (8 SP)")
    print("=" * 70)


if __name__ == "__main__":
    main()
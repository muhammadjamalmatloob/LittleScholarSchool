import os
import re
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

NAVY = RGBColor(15, 41, 74)       # #0F294A
BLUE = RGBColor(37, 99, 235)      # #2563EB
CHARCOAL = RGBColor(31, 41, 55)   # #1F2937
GRAY = RGBColor(107, 114, 128)    # #6B7280

def set_cell_background(cell, hex_color):
    """Sets background color of a table cell."""
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tc_pr.append(shd)

def set_cell_margins(cell, top=120, bottom=120, left=150, right=150):
    """Sets cell padding (in twips: 20 twips = 1 pt)."""
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'  <w:top w:w="{top}" w:type="dxa"/>'
        f'  <w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'  <w:left w:w="{left}" w:type="dxa"/>'
        f'  <w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tc_pr.append(tc_mar)

def set_table_borders(table, color="D1D5DB", sz="4"):
    """Adds subtle light gray borders to table."""
    tbl_pr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'  <w:top w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:bottom w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:left w:val="none"/>'
        f'  <w:right w:val="none"/>'
        f'  <w:insideH w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:insideV w:val="none"/>'
        f'</w:tblBorders>'
    )
    tbl_pr.append(borders)

def style_heading_1(doc, text):
    h = doc.add_paragraph()
    h.paragraph_format.space_before = Pt(18)
    h.paragraph_format.space_after = Pt(6)
    h.paragraph_format.keep_with_next = True
    run = h.add_run(text)
    run.font.name = "Calibri"
    run.font.size = Pt(16)
    run.font.bold = True
    run.font.color.rgb = NAVY
    return h

def style_heading_2(doc, text):
    h = doc.add_paragraph()
    h.paragraph_format.space_before = Pt(14)
    h.paragraph_format.space_after = Pt(4)
    h.paragraph_format.keep_with_next = True
    run = h.add_run(text)
    run.font.name = "Calibri"
    run.font.size = Pt(13)
    run.font.bold = True
    run.font.color.rgb = BLUE
    return h

def style_heading_3(doc, text):
    h = doc.add_paragraph()
    h.paragraph_format.space_before = Pt(10)
    h.paragraph_format.space_after = Pt(2)
    h.paragraph_format.keep_with_next = True
    run = h.add_run(text)
    run.font.name = "Calibri"
    run.font.size = Pt(11.5)
    run.font.bold = True
    run.font.color.rgb = CHARCOAL
    return h

def add_callout(doc, text, bold_prefix=""):
    """Adds a stylish callout box with a left border."""
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    set_cell_background(cell, "EFF6FF")  # very light blue
    set_cell_margins(cell, top=140, bottom=140, left=200, right=200)

    tc_pr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'  <w:left w:val="single" w:sz="24" w:space="0" w:color="2563EB"/>'
        f'  <w:top w:val="none"/>'
        f'  <w:bottom w:val="none"/>'
        f'  <w:right w:val="none"/>'
        f'</w:tcBorders>'
    )
    tc_pr.append(borders)

    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    if bold_prefix:
        r_bold = p.add_run(bold_prefix + " ")
        r_bold.font.name = "Calibri"
        r_bold.font.bold = True
        r_bold.font.size = Pt(10.5)
        r_bold.font.color.rgb = NAVY
    r = p.add_run(text)
    r.font.name = "Calibri"
    r.font.size = Pt(10.5)
    r.font.color.rgb = CHARCOAL
    doc.add_paragraph().paragraph_format.space_after = Pt(6)

def add_styled_table(doc, headers, data, col_widths=None):
    tbl = doc.add_table(rows=len(data) + 1, cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tbl)

    # Style Header
    hdr_cells = tbl.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].text = title
        set_cell_background(hdr_cells[i], "1E3A8A")  # Navy
        set_cell_margins(hdr_cells[i], top=140, bottom=140, left=150, right=150)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        for run in p.runs:
            run.font.name = "Calibri"
            run.font.bold = True
            run.font.size = Pt(10)
            run.font.color.rgb = RGBColor(255, 255, 255)

    # Style Data Rows
    for r_idx, row_data in enumerate(data):
        row_cells = tbl.rows[r_idx + 1].cells
        bg_color = "F9FAFB" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row_data):
            row_cells[c_idx].text = str(val)
            set_cell_background(row_cells[c_idx], bg_color)
            set_cell_margins(row_cells[c_idx], top=100, bottom=100, left=150, right=150)
            p = row_cells[c_idx].paragraphs[0]
            for run in p.runs:
                run.font.name = "Calibri"
                run.font.size = Pt(9.5)
                run.font.color.rgb = CHARCOAL

    if col_widths:
        for row in tbl.rows:
            for idx, width in enumerate(col_widths):
                row.cells[idx].width = Inches(width)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)
    return tbl

def add_body_p(doc, text="", bold_prefix=""):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.font.name = "Calibri"
        r_pre.font.bold = True
        r_pre.font.size = Pt(10.5)
        r_pre.font.color.rgb = CHARCOAL
    if text:
        # Simple inline bold parsing (**bold**)
        parts = re.split(r"(\*\*.*?\*\*)", text)
        for part in parts:
            if part.startswith("**") and part.endswith("**"):
                r = p.add_run(part[2:-2])
                r.font.bold = True
            else:
                r = p.add_run(part)
            r.font.name = "Calibri"
            r.font.size = Pt(10.5)
            r.font.color.rgb = CHARCOAL
    return p

def add_bullet_item(doc, text="", bold_prefix=""):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.space_before = Pt(1)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.font.name = "Calibri"
        r_pre.font.bold = True
        r_pre.font.size = Pt(10)
        r_pre.font.color.rgb = CHARCOAL
    if text:
        parts = re.split(r"(\*\*.*?\*\*)", text)
        for part in parts:
            if part.startswith("**") and part.endswith("**"):
                r = p.add_run(part[2:-2])
                r.font.bold = True
            else:
                r = p.add_run(part)
            r.font.name = "Calibri"
            r.font.size = Pt(10)
            r.font.color.rgb = CHARCOAL
    return p

# ==============================================================================
# 1. BUILD SPRINT REVIEW REPORT (.docx)
# ==============================================================================
def build_review_report_docx(output_path):
    doc = Document()
    
    # Page setup
    for sec in doc.sections:
        sec.top_margin = Inches(0.8)
        sec.bottom_margin = Inches(0.8)
        sec.left_margin = Inches(0.8)
        sec.right_margin = Inches(0.8)

    # Document Title Block
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(2)
    r_uni = p_title.add_run("SCHOOL MANAGEMENT SYSTEM")
    r_uni.font.name = "Calibri"
    r_uni.font.size = Pt(18)
    r_uni.font.bold = True
    r_uni.font.color.rgb = NAVY

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(12)
    r_sub = p_sub.add_run("Sprint 1 & 2 Review & Retrospective Report | Software Project Management (CS-SPM)")
    r_sub.font.name = "Calibri"
    r_sub.font.size = Pt(11)
    r_sub.font.color.rgb = BLUE

    add_callout(
        doc,
        "Deployment Model: Standalone Desktop EXE (Electron 27 + FastAPI 0.104 + SQLite3)\n"
        "Live Scrum Board: https://trello.com/b/8Evwqdgy/school-management-system\n"
        "Project Repository: Modular Architecture with Python Backend & Vite React Frontend",
        bold_prefix="PROJECT CONTEXT & METADATA:"
    )

    # Team Table
    style_heading_2(doc, "Project Team & Role Specialization")
    team_data = [
        ["Muhammad Umer", "Backend Lead", "DB Schema, SQLAlchemy Models, JWT Auth, RBAC, Core APIs"],
        ["Jamal Matloob", "Backend + Desktop Integration", "Database Init, Electron IPC Main Process, Pandas Import, PDF Pipelines"],
        ["Saad Asif", "Frontend Lead", "React UI, Tailwind CSS, Data Tables, Form Validation, UI Shell"],
        ["Musfirah Abbas", "Documentation & QA Lead", "SRS, Agile Metrics, Sprint Reports, Acceptance Criteria Verification"],
    ]
    add_styled_table(doc, ["Team Member", "Assigned Role", "Domain Focus"], team_data, [1.6, 1.8, 3.4])

    # PART 1: SPRINT 1
    style_heading_1(doc, "PART 1: SPRINT 1 REVIEW REPORT (COMPLETED)")
    add_body_p(doc, "**Sprint Duration:** 2 Weeks (Week 1, Day 1 – Week 2, Day 2) | **Status:** 100% Completed")
    add_body_p(doc, "**Sprint Goal:** Establish desktop application shell, configure a zero-config local SQLite database, implement secure JWT authentication with Role-Based Access Control (RBAC), and deliver end-to-end Student Management with bulk Excel/CSV import.")

    style_heading_2(doc, "1.1 Sprint 1 Metrics & Velocity")
    s1_metrics = [
        ["Committed Story Points", "21 SP", "Planned backlog stories estimated via Fibonacci"],
        ["Completed Story Points", "21 SP", "All 5 stories achieved Definition of Done (DoD)"],
        ["Measured Sprint Velocity", "21 SP", "Baseline velocity established for team capacity"],
        ["Commitment Reliability Ratio", "100%", "Zero scope slippage or dropped commitments"],
        ["Total Developer Hours Invested", "~92 Hours", "Average ~23 hours per member over 2 weeks"],
    ]
    add_styled_table(doc, ["Agile Metric", "Result", "Evaluation & Analysis"], s1_metrics, [2.0, 1.2, 3.6])

    style_heading_2(doc, "1.2 User Stories Delivered in Sprint 1")
    
    stories_s1 = [
        ("Story 1.1: As a School Administrator, I want local staff accounts and security permissions initialized on first launch, so that staff can immediately log in without external database servers.", "3 SP", "Must Have (High)", "Umer (Backend Lead), Jamal (DB Scripting)",
         "Created persistent SQLite connection (backend/database.py). Implemented SQLAlchemy models for users, permissions, audit_logs, students, and classes. Seeded default admin (admin@school.com) and 4 roles (admin, teacher, accountant, principal). Verified via database migration checks."),
        ("Story 1.2: As a School Staff Member, I want to securely log in with my credentials and access only authorized features, so that sensitive student grades and finances are protected from unauthorized access.", "5 SP", "Must Have (High)", "Umer (Backend Lead)",
         "Implemented POST /api/auth/login with PyJWT tokens and bcrypt hashing. Created RBAC middleware enforcing role authorization on protected endpoints. Built User Management CRUD routes with 403 Forbidden checks."),
        ("Story 1.3: As a Desktop User, I want to launch the system as a native desktop application window, so that I can use the software easily without managing command lines or web servers.", "5 SP", "Must Have (High)", "Saad (Frontend Lead), Jamal (Electron IPC)",
         "Electron main process auto-spawns FastAPI background service on port 8000. Configured React 18 + Vite shell with Tailwind CSS. Built responsive login page with JWT storage and role-aware navigation sidebar."),
        ("Story 2.1: As a School Administrator, I want to search, filter, and update student profiles in a clean directory, so that student records remain accurate and any student file can be retrieved in seconds.", "5 SP", "Must Have (High)", "Umer (Backend APIs), Saad (Frontend UI)",
         "REST CRUD routes (GET, POST, PUT, DELETE /api/students). Built paginated StudentList.jsx table with search by name/roll number and class filters. Built StudentForm.jsx modal with full input validation. Tested with 500+ mock records."),
        ("Story 2.2: As a School Administrator, I want to bulk import hundreds of student records from an Excel or CSV spreadsheet, so that I can enroll entire classes without tedious manual data entry.", "3 SP", "Should Have (Med)", "Jamal (Pandas Parser), Saad (Upload Modal)",
         "High-performance pandas ingestion endpoint validating required headers (Name, Roll No, Class). Automated duplicate roll number detection. Built StudentImport.jsx drag-and-drop modal with error reporting log.")
    ]

    for title, sp, prio, team, details in stories_s1:
        style_heading_3(doc, f"{title} [{sp} | {prio}]")
        add_body_p(doc, f"**Assigned Team:** {team}")
        add_body_p(doc, f"**Delivered Artifacts & Technical Notes:** {details}")

    style_heading_2(doc, "1.3 Sprint 1 Retrospective (Agile Lessons Learned)")
    retro_data = [
        ["What Went Well", "• FastAPI + SQLite provided instant local zero-latency data access.\n• Tailwind components accelerated responsive UI development.\n• Clear separation between Umer (backend) and Saad (frontend) eliminated merge conflicts."],
        ["Challenges Faced", "• CSV ingestion failed initially when column headers contained trailing whitespace.\n• Electron background process occasionally remained active after window close."],
        ["Actionable Fixes", "• Added header whitespace normalization in Pandas pre-processing pipeline.\n• Configured Electron 'before-quit' lifecycle hook to reliably terminate FastAPI process.\n• Formalized Fibonacci story points and MoSCoW priorities on all Trello cards."],
    ]
    add_styled_table(doc, ["Retrospective Dimension", "Observations & Key Takeaways"], retro_data, [1.8, 5.0])

    # PART 2: SPRINT 2
    style_heading_1(doc, "PART 2: SPRINT 2 STATUS REPORT (ACTIVE / IN PROGRESS)")
    add_body_p(doc, "**Sprint Duration:** 2 Weeks (Week 2, Day 3 – Week 3, Day 2) | **Status:** In Progress")
    add_body_p(doc, "**Sprint Goal:** Implement complete Fee Management (payment recording, overdue calculations, PDF invoices) and Attendance Management (single-view class registers, percentage logic, absenteeism reports).")

    style_heading_2(doc, "2.1 Sprint 2 Story Point Distribution")
    add_body_p(doc, "**Total Sprint 2 Scope:** 16 Story Points (Planned within team velocity of 21 SP, providing testing buffer).")
    
    s2_cards = [
        ["3.1", "As a School Accountant, I want to record student fee payments and automatically flag overdue accounts, so that the school's finances remain balanced and unpaid dues can be followed up immediately.", "5 SP", "🔴 Must Have", "In Progress", "Umer (Backend API), Saad (Fee UI)"],
        ["4.1", "As a Class Teacher, I want to mark daily classroom attendance on a single screen with a 'Mark All Present' shortcut, so that morning roll call takes less than a minute of classroom time.", "5 SP", "🔴 Must Have", "In Progress", "Jamal (Attendance API), Saad (Grid UI)"],
        ["3.2", "As a Student or Parent, I want to receive a clear, itemized PDF receipt whenever I pay school fees, so that I have official tangible proof of payment for my personal records.", "3 SP", "🟠 Should Have", "To Do", "Umer & Jamal (ReportLab PDF)"],
        ["4.2", "As a School Principal, I want to view monthly attendance percentages and automated absenteeism alerts, so that I can identify and support chronically absent students before grades drop.", "3 SP", "🟠 Should Have", "To Do", "Jamal (Analytics logic), Saad (Reports UI)"],
    ]
    add_styled_table(doc, ["ID", "Canonical User Story", "SP", "Priority", "Status", "Ownership"], s2_cards, [0.4, 3.4, 0.5, 0.9, 0.8, 1.2])

    style_heading_2(doc, "2.2 Current Progress & Risk Mitigation")
    add_bullet_item(doc, "Fee models and payment recording endpoints completed; currently building interactive FeeList.jsx table and quick payment collection modal.", bold_prefix="Fee Management (3.1 & 3.2): ")
    add_bullet_item(doc, "Attendance database schema with composite unique constraints on (student_id, date) verified; bulk marking endpoint functional. Designing 'Mark All Present' UI grid toggle.", bold_prefix="Attendance Tracking (4.1 & 4.2): ")
    add_bullet_item(doc, "ReportLab canvas margins and multi-page tables are being pre-tested in scripts to avoid PDF styling delays during frontend download integration.", bold_prefix="Technical Risk Mitigation: ")

    # PART 3: VELOCITY
    style_heading_1(doc, "PART 3: AGILE VELOCITY ANALYSIS & RELEASE FORECAST")
    add_body_p(doc, "Sprint Velocity measures the capacity of productive work delivered to Definition of Done per sprint iteration.")

    velocity_data = [
        ["Sprint 1 (Completed)", "21 SP", "21 SP", "21 SP", "100%", "Phase 1 & Phase 2 Core MVP"],
        ["Sprint 2 (Active)", "16 SP", "10 SP (In Prog)", "16 SP (Target)", "On Track", "Phase 3 Fees & Phase 4 Attendance"],
        ["Sprint 3 (Backlog)", "26 SP", "Planned", "26 SP (Forecast)", "N/A", "Phase 5 Exams, Timetable, Dashboard & EXE"],
    ]
    add_styled_table(doc, ["Sprint Cadence", "Committed", "Delivered", "Velocity", "Reliability", "Scope Overview"], velocity_data, [1.4, 0.8, 1.0, 1.0, 0.8, 1.8])

    add_callout(
        doc,
        "Measured Historical Velocity (Sprint 1): 21 Story Points / Sprint\n"
        "Total Remaining Product Backlog: 26 Story Points (Sprint 3 Scope)\n"
        "Forecast Calculation: Remaining Backlog (26 SP) / Average Velocity (21 SP) = 1.24 Sprints\n"
        "Release Conclusion: The project is mathematically on track for complete desktop delivery within 3 sprints (6 weeks total).",
        bold_prefix="MATHEMATICAL RELEASE PROJECTION:"
    )

    doc.save(output_path)
    print(f"[OK] Generated: {output_path}")

# ==============================================================================
# 2. BUILD SPRINT SCHEDULE (.docx)
# ==============================================================================
def build_schedule_docx(output_path):
    doc = Document()
    
    # Page setup
    for sec in doc.sections:
        sec.top_margin = Inches(0.8)
        sec.bottom_margin = Inches(0.8)
        sec.left_margin = Inches(0.8)
        sec.right_margin = Inches(0.8)

    # Document Title Block
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(2)
    r_uni = p_title.add_run("SCHOOL MANAGEMENT SYSTEM")
    r_uni.font.name = "Calibri"
    r_uni.font.size = Pt(18)
    r_uni.font.bold = True
    r_uni.font.color.rgb = NAVY

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(12)
    r_sub = p_sub.add_run("Sprint Schedule & Agile Scrum Ceremonies Document | Software Project Management")
    r_sub.font.name = "Calibri"
    r_sub.font.size = Pt(11)
    r_sub.font.color.rgb = BLUE

    add_callout(
        doc,
        "Methodology: Agile Scrum Framework (3 Iterations × 2 Weeks)\n"
        "Total Planned Effort: 63 Story Points across 6 Epics\n"
        "Live Board Link: https://trello.com/b/8Evwqdgy/school-management-system",
        bold_prefix="EXECUTIVE SCHEDULE SUMMARY:"
    )

    style_heading_1(doc, "1. SIX-WEEK SCRUM DELIVERY ROADMAP")
    roadmap_data = [
        ["Sprint 0: Inception", "Week 0 (Sep 25 - Oct 01)", "Project Charter, SRS, Tooling, SQLite architecture design, Git repository initialization."],
        ["Sprint 1: Foundation", "Weeks 1 - 2 (Oct 01 - Oct 14)", "DB Schema & seeding, JWT Auth & RBAC middleware, Electron shell, Student CRUD, CSV Import (21 SP - 100% DONE)."],
        ["Sprint 2: Operations", "Weeks 3 - 4 (Oct 15 - Oct 28)", "Student Fee payment recording, overdue tracking, PDF invoices, single-view Class Attendance registers (16 SP - ACTIVE)."],
        ["Sprint 3: Release", "Weeks 5 - 6 (Oct 29 - Nov 12)", "Class management, Exam marks entry & GPA, Timetable conflict detection, KPI Dashboard, single Windows EXE (26 SP)."],
    ]
    add_styled_table(doc, ["Milestone Phase", "Timeline Cadence", "Deliverable Objectives"], roadmap_data, [1.5, 1.8, 3.5])

    style_heading_1(doc, "2. AGILE CEREMONIES SCHEDULE")
    add_body_p(doc, "To maintain rigorous project management standards, the team adheres to scheduled Scrum ceremonies throughout each 2-week cycle:")

    ceremony_data = [
        ["Sprint Planning", "First Monday of Sprint\n(10:00 AM - 11:30 AM)", "Select backlog items, assign Fibonacci points, allocate tasks to team members on Trello board."],
        ["Daily Standup", "Mon, Wed, Fri\n(05:00 PM - 05:15 PM)", "15-min check-in: What did you complete? What will you do next? Are there any technical blockers?"],
        ["Backlog Refinement", "Mid-Sprint Wednesday\n(04:00 PM - 04:45 PM)", "Groom upcoming sprint cards, clarify acceptance criteria, break down complex stories."],
        ["Sprint Review & Demo", "Final Friday of Sprint\n(04:00 PM - 05:00 PM)", "Live software demonstration against Definition of Done (DoD). Move verified cards to Completed."],
        ["Sprint Retrospective", "Immediately after Review\n(05:00 PM - 05:45 PM)", "Analyze what went well, bottlenecks faced, and create actionable engineering improvements."],
    ]
    add_styled_table(doc, ["Scrum Ceremony", "Frequency & Time", "Purpose & Primary Outputs"], ceremony_data, [1.5, 1.7, 3.6])

    style_heading_1(doc, "3. TEAM CAPACITY & WORKLOAD ALLOCATION MATRIX")
    add_body_p(doc, "**Capacity Baseline:** 4 team members × 20 dedicated hours/week = **80 hrs/week** (160 developer hours per sprint).")

    workload_data = [
        ["Muhammad Umer", "Backend Lead", "13 SP (1.1, 1.2, 2.1)", "8 SP (3.1, 3.2)", "13 SP (5.1, 5.2, 6.3)", "34 SP"],
        ["Jamal Matloob", "Backend + Desktop", "11 SP (1.1, 1.3, 2.2)", "11 SP (4.1, 3.2, 4.2)", "13 SP (5.3, 6.1, 6.2, 6.3)", "35 SP"],
        ["Saad Asif", "Frontend Lead", "13 SP (1.3, 2.1, 2.2)", "13 SP (3.1, 4.1, 4.2)", "18 SP (5.1, 5.2, 5.3, 6.1)", "44 SP"],
        ["Musfirah Abbas", "Documentation & QA", "QA Verification & Sprint 1 Report", "QA Verification & Sprint 2 Report", "3 SP (6.2 Docs) + Final SPM Report", "Lead QA & Docs"],
    ]
    add_styled_table(doc, ["Member Name", "Role Focus", "Sprint 1", "Sprint 2", "Sprint 3", "Total SP"], workload_data, [1.4, 1.3, 1.2, 1.2, 1.2, 0.7])

    style_heading_1(doc, "4. DEFINITION OF DONE (QUALITY GATES)")
    add_body_p(doc, "A user story card on Trello cannot be marked 'Completed' until all of the following quality criteria are met:")
    add_bullet_item(doc, "All database queries executed via SQLAlchemy ORM with foreign key constraints enforced.", bold_prefix="1. Database Integrity: ")
    add_bullet_item(doc, "Core CRUD operations covered by automated pytest test scripts.", bold_prefix="2. Automated Testing: ")
    add_bullet_item(doc, "API endpoints return structured JSON with standard HTTP status codes (200, 201, 401, 403, 404).", bold_prefix="3. Error Handling: ")
    add_bullet_item(doc, "Client views built with responsive Tailwind CSS, loading indicators, and form error feedback.", bold_prefix="4. Frontend Standards: ")
    add_bullet_item(doc, "Desktop window starts cleanly without terminal warnings or orphan background processes.", bold_prefix="5. Desktop Packaging: ")
    add_bullet_item(doc, "All checklist tasks on Trello checked and verified by QA Lead (Musfirah).", bold_prefix="6. Verification: ")

    doc.save(output_path)
    print(f"[OK] Generated: {output_path}")

if __name__ == "__main__":
    docs_dir = r"d:\5th semester\SPM\school-management-system\docs"
    os.makedirs(docs_dir, exist_ok=True)
    
    review_path = os.path.join(docs_dir, "SPRINT_1_AND_2_REVIEW_REPORT.docx")
    schedule_path = os.path.join(docs_dir, "SPRINT_SCHEDULE.docx")
    
    build_review_report_docx(review_path)
    build_schedule_docx(schedule_path)
    print("[SUCCESS] Both Word (.docx) documents generated successfully!")

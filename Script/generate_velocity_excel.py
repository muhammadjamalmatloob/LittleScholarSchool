import os
import sys
import openpyxl
from openpyxl.chart import BarChart, Reference
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

def create_velocity_workbook():
    wb = openpyxl.Workbook()

    # Define color palette (Clean Corporate Navy / Indigo & Emerald)
    primary_color = "312E81"      # Dark Indigo
    accent_green = "059669"       # Emerald Green
    accent_amber = "D97706"       # Amber
    accent_red = "DC2626"         # Crimson
    header_fill = PatternFill(start_color="1E1B4B", end_color="1E1B4B", fill_type="solid")
    sub_header_fill = PatternFill(start_color="312E81", end_color="312E81", fill_type="solid")
    zebra_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    highlight_spill_fill = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
    highlight_active_fill = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")

    font_title = Font(name="Segoe UI", size=16, bold=True, color="FFFFFF")
    font_section = Font(name="Segoe UI", size=12, bold=True, color="1E1B4B")
    font_header = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
    font_bold = Font(name="Segoe UI", size=10, bold=True, color="111827")
    font_regular = Font(name="Segoe UI", size=10, color="374151")
    font_spill = Font(name="Segoe UI", size=10, bold=True, color="B91C1C")
    font_active = Font(name="Segoe UI", size=10, bold=True, color="B45309")

    align_center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    align_left = Alignment(horizontal="left", vertical="center", wrap_text=True)
    align_right = Alignment(horizontal="right", vertical="center")

    thin_border = Border(
        left=Side(style="thin", color="CBD5E1"),
        right=Side(style="thin", color="CBD5E1"),
        top=Side(style="thin", color="CBD5E1"),
        bottom=Side(style="thin", color="CBD5E1"),
    )
    double_bottom_border = Border(
        left=Side(style="thin", color="CBD5E1"),
        right=Side(style="thin", color="CBD5E1"),
        top=Side(style="thin", color="CBD5E1"),
        bottom=Side(style="double", color="1E1B4B"),
    )

    # =========================================================================
    # SHEET 1: Sprint Velocity & Retrospective
    # =========================================================================
    ws1 = wb.active
    ws1.title = "Velocity & Sprint Metrics"
    ws1.views.sheetView[0].showGridLines = True

    # Title Banner
    ws1.merge_cells("A1:J1")
    ws1["A1"] = "School Management System — Agile Sprint Velocity & Retrospective Dashboard"
    ws1["A1"].font = font_title
    ws1["A1"].fill = header_fill
    ws1["A1"].alignment = align_center
    ws1.row_dimensions[1].height = 36

    # Section 1: Velocity Summary Table
    ws1["A3"] = "1. SPRINT VELOCITY SUMMARY TABLE"
    ws1["A3"].font = font_section

    headers_summary = [
        "Sprint",
        "Status",
        "Primary Focus Modules",
        "Committed (SP)",
        "Completed (SP)",
        "Spillover (SP)",
        "In Progress (SP)",
        "To-Do (SP)",
        "Say-Do Ratio (%)",
        "Retrospective Observations & Blockers",
    ]

    for col_idx, h in enumerate(headers_summary, start=1):
        cell = ws1.cell(row=4, column=col_idx, value=h)
        cell.font = font_header
        cell.fill = sub_header_fill
        cell.alignment = align_center
        cell.border = thin_border
    ws1.row_dimensions[4].height = 26

    # Sprint Data Rows
    sprint_data = [
        (
            "Sprint 1",
            "CLOSED",
            "Phase 1 & 2: Database Initialization, RBAC Auth, Student Enrollment & Teacher Directory",
            21,
            21,
            0,
            0,
            0,
            "=E5/D5",
            "Clean sprint delivery. Core architecture, SQLite seeding, and JWT authentication passed Definition of Done on time.",
        ),
        (
            "Sprint 2",
            "CLOSED",
            "Phase 3, 4, 5, 6: Fee Management, Attendance, Class Sections, Timetable Engine, Exams, Analytics, PDF Challans & Docker",
            48,
            42,
            6,
            0,
            0,
            "=E6/D6",
            "RETROSPECTIVE DELAY: Jamal attended a weekend hackathon, pushing final PR merges to Sunday afternoon. Dev was 100% completed, but the QA testing window missed the sprint review cut-off. 2 QA user stories (6 SP) spilled over into Sprint 3.",
        ),
        (
            "Sprint 3",
            "ACTIVE (IN PROGRESS)",
            "Comprehensive Quality Assurance, Test Suite Automation (22 Tests), Dark Mode Audit & UAT Sign-Off (Musfirah QA Lead)",
            42,
            0,
            0,
            31,
            11,
            "N/A (Active)",
            "Currently running sprint. 6 SP carried over from Sprint 2 + 36 SP new QA stories. 19 SP actively in QA & Testing list, 12 SP in Dev progress, 11 SP in To-Do queue.",
        ),
    ]

    for r_idx, row in enumerate(sprint_data, start=5):
        ws1.row_dimensions[r_idx].height = 34
        for c_idx, val in enumerate(row, start=1):
            cell = ws1.cell(row=r_idx, column=c_idx, value=val)
            cell.font = font_regular
            cell.border = thin_border
            if c_idx in [1, 2]:
                cell.alignment = align_center
                if val == "CLOSED":
                    cell.font = font_bold
                elif "ACTIVE" in str(val):
                    cell.font = font_active
                    cell.fill = highlight_active_fill
            elif c_idx in [4, 5, 6, 7, 8]:
                cell.alignment = align_center
                cell.font = font_bold
                if c_idx == 6 and val == 6:
                    cell.fill = highlight_spill_fill
                    cell.font = font_spill
            elif c_idx == 9:
                cell.alignment = align_center
                cell.font = font_bold
                if isinstance(val, str) and val.startswith("="):
                    cell.number_format = "0.0%"
            else:
                cell.alignment = align_left

    # Total / Summary Row (Row 8)
    ws1.row_dimensions[8].height = 24
    ws1["A8"] = "Total / Avg"
    ws1["A8"].font = font_bold
    ws1["A8"].alignment = align_center
    ws1["A8"].border = double_bottom_border

    ws1["B8"] = "2 Closed, 1 Active"
    ws1["B8"].font = font_bold
    ws1["B8"].alignment = align_center
    ws1["B8"].border = double_bottom_border

    ws1["C8"] = "Cumulative Project Scope across 3 Sprints"
    ws1["C8"].font = font_bold
    ws1["C8"].alignment = align_left
    ws1["C8"].border = double_bottom_border

    ws1["D8"] = "=SUM(D5:D7)"
    ws1["D8"].font = font_bold
    ws1["D8"].alignment = align_center
    ws1["D8"].border = double_bottom_border

    ws1["E8"] = "=SUM(E5:E7)"
    ws1["E8"].font = font_bold
    ws1["E8"].alignment = align_center
    ws1["E8"].border = double_bottom_border

    ws1["F8"] = "=SUM(F5:F7)"
    ws1["F8"].font = font_bold
    ws1["F8"].alignment = align_center
    ws1["F8"].border = double_bottom_border

    ws1["G8"] = "=SUM(G5:G7)"
    ws1["G8"].font = font_bold
    ws1["G8"].alignment = align_center
    ws1["G8"].border = double_bottom_border

    ws1["H8"] = "=SUM(H5:H7)"
    ws1["H8"].font = font_bold
    ws1["H8"].alignment = align_center
    ws1["H8"].border = double_bottom_border

    ws1["I8"] = "=AVERAGE(E5:E6)/AVERAGE(D5:D6)"
    ws1["I8"].font = font_bold
    ws1["I8"].number_format = "0.0%"
    ws1["I8"].alignment = align_center
    ws1["I8"].border = double_bottom_border

    ws1["J8"] = "Historical Delivery Say/Do Ratio: 93.8% across closed sprints"
    ws1["J8"].font = font_bold
    ws1["J8"].alignment = align_left
    ws1["J8"].border = double_bottom_border

    # Section 2: Key Metrics Cards (Rows 10 to 12)
    ws1["A10"] = "2. AGILE METRICS & CAPACITY BENCHMARKS"
    ws1["A10"].font = font_section

    kpi_boxes = [
        ("A11", "B12", "Team Historical Velocity", "31.5 SP / Sprint", "Calculated strictly from Closed Sprints (S1: 21, S2: 42) / 2"),
        ("D11", "E12", "Sprint 2 Say-Do Ratio", "87.5%", "42 SP Completed out of 48 SP Committed (6 SP Hackathon Spillover)"),
        ("G11", "H12", "Sprint 3 Active Load", "42 SP", "19 SP in QA Verification, 12 SP in Dev, 11 SP in To-Do queue"),
        ("I11", "J12", "QA Testing Lead", "Musfirah Abbas", "Dedicated QA role: 22 Pytest regressions, RBAC & UAT sign-off"),
    ]

    for start_c, end_c, title, val, sub in kpi_boxes:
        start_col, start_row = start_c[0], int(start_c[1:])
        end_col, end_row = end_c[0], int(end_c[1:])
        cell = ws1[start_c]
        cell.value = f"{title}\n{val}\n({sub})"
        cell.font = font_bold
        cell.alignment = align_center
        cell.fill = zebra_fill
        # Border box
        for r in range(start_row, end_row + 1):
            for c_letter in [start_col, end_col]:
                col_num = ord(c_letter) - ord('A') + 1
                ws1.cell(row=r, column=col_num).border = thin_border
        ws1.merge_cells(f"{start_c}:{end_c}")

    # =========================================================================
    # NATIVE EXCEL CLUSTERED COLUMN CHART (Embedded in Sheet 1)
    # =========================================================================
    chart = BarChart()
    chart.type = "col"
    chart.style = 10
    chart.title = "Agile Sprint Velocity (Committed vs. Completed vs. Active)"
    chart.y_axis.title = "Story Points (SP)"
    chart.x_axis.title = "Sprints"
    chart.width = 18
    chart.height = 11

    # Data: Columns D (Committed) and E (Completed) from rows 4 to 7
    data_ref = Reference(ws1, min_col=4, min_row=4, max_col=5, max_row=7)
    cats_ref = Reference(ws1, min_col=1, min_row=5, max_row=7)

    chart.add_data(data_ref, titles_from_data=True)
    chart.set_categories(cats_ref)

    # Insert chart directly below the tables (at Cell A15)
    ws1.add_chart(chart, "A15")

    # Section 3: Sprint 3 Active Breakdown Table (Placed at Column H, Row 15 next to the chart)
    ws1["H15"] = "3. SPRINT 3 ACTIVE PIPELINE BREAKDOWN"
    ws1["H15"].font = font_section

    s3_breakdown_headers = ["Trello Board Column", "Story Points (SP)", "Cards Count", "Current Stage Focus"]
    for c_i, h in enumerate(s3_breakdown_headers, start=8):
        c = ws1.cell(row=16, column=c_i, value=h)
        c.font = font_header
        c.fill = sub_header_fill
        c.alignment = align_center
        c.border = thin_border

    s3_breakdown_data = [
        ("QA & Testing (Sprint 3)", 19, 5, "Musfirah verifying Timetable Clashes, PDF Challans, Pytest & RBAC"),
        ("In Progress (Sprint 3)", 12, 4, "Academic Promotions, Attendance Threshold Alerts, Theme Contrast & Viewports"),
        ("To Do (Sprint 3)", 11, 3, "Exam Marks GPA Precision, Docker Image Startup & Final UAT Sign-Off"),
        ("Total Sprint 3 Scope", 42, 12, "Scheduled for release on Nov 12, 2026"),
    ]

    for r_i, (col_name, sp, count, desc) in enumerate(s3_breakdown_data, start=17):
        is_total = r_i == 20
        fnt = font_bold if is_total else font_regular
        brd = double_bottom_border if is_total else thin_border
        fll = zebra_fill if not is_total else PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")

        c1 = ws1.cell(row=r_i, column=8, value=col_name)
        c2 = ws1.cell(row=r_i, column=9, value=sp)
        c3 = ws1.cell(row=r_i, column=10, value=count)
        c4 = ws1.cell(row=r_i, column=11, value=desc) if ws1.max_column >= 11 else None

        for cell in [c1, c2, c3]:
            cell.font = fnt
            cell.border = brd
            cell.fill = fll
        c1.alignment = align_left
        c2.alignment = align_center
        c3.alignment = align_center

    # =========================================================================
    # SHEET 2: Detailed User Stories Backlog
    # =========================================================================
    ws2 = wb.create_sheet(title="User Stories Breakdown")
    ws2.views.sheetView[0].showGridLines = True

    # Title Banner
    ws2.merge_cells("A1:H1")
    ws2["A1"] = "Complete User Stories Master Registry — School Management System"
    ws2["A1"].font = font_title
    ws2["A1"].fill = header_fill
    ws2["A1"].alignment = align_center
    ws2.row_dimensions[1].height = 36

    headers_stories = [
        "Card ID",
        "User Story Title & Description",
        "Epic",
        "MoSCoW Priority",
        "Story Points (SP)",
        "Assigned Team Members",
        "Sprint",
        "Current Status",
    ]

    for col_idx, h in enumerate(headers_stories, start=1):
        cell = ws2.cell(row=3, column=col_idx, value=h)
        cell.font = font_header
        cell.fill = sub_header_fill
        cell.alignment = align_center
        cell.border = thin_border
    ws2.row_dimensions[3].height = 26

    # All 29 Cards in the Project
    stories = [
        # Sprint 1
        ("1.1", "Local SQLite Database & Permissions Initialization", "Epic 1: Foundation & Auth", "Must Have", 3, "Muhammad Umer, Jamal Matloob", "Sprint 1", "Completed"),
        ("1.2", "User Authentication & JWT Role-Based Protection", "Epic 1: Foundation & Auth", "Must Have", 5, "Muhammad Umer, Saad Asif", "Sprint 1", "Completed"),
        ("1.3", "Staff Account Directory & Profile Management", "Epic 1: Foundation & Auth", "Must Have", 5, "Saad Asif, Jamal Matloob", "Sprint 1", "Completed"),
        ("2.1", "Student Admission & Academic Profile Enrollment", "Epic 2: Student Management", "Must Have", 5, "Muhammad Umer, Saad Asif", "Sprint 1", "Completed"),
        ("2.2", "Teacher Directory & Subject Specialization", "Epic 2: Student Management", "Should Have", 3, "Saad Asif, Jamal Matloob", "Sprint 1", "Completed"),

        # Sprint 2 (Completed Dev)
        ("3.1", "Fee Structure, Invoicing & Due Date Rules", "Epic 3: Fee Management", "Must Have", 5, "Muhammad Umer, Saad Asif", "Sprint 2", "Completed"),
        ("3.2", "Fee Collection Receipts & Defaulter Tracking", "Epic 3: Fee Management", "Should Have", 3, "Jamal Matloob, Saad Asif", "Sprint 2", "Completed"),
        ("4.1", "Daily Student Attendance & Excuse Note Tracking", "Epic 4: Attendance Management", "Must Have", 5, "Muhammad Umer, Saad Asif", "Sprint 2", "Completed"),
        ("4.2", "Attendance Analytics & Threshold Absence Alerts", "Epic 4: Attendance Management", "Should Have", 3, "Jamal Matloob, Saad Asif", "Sprint 2", "Completed"),
        ("5.1", "Class Sections & Teacher Assignment", "Epic 5: Class, Exam & Timetable", "Should Have", 3, "Muhammad Umer, Saad Asif", "Sprint 2", "Completed"),
        ("5.2", "Timetable Conflict Detection Algorithm", "Epic 5: Class, Exam & Timetable", "Should Have", 5, "Muhammad Umer, Jamal Matloob", "Sprint 2", "Completed"),
        ("5.3", "Examination Grading & Auto-GPA Calculation", "Epic 5: Class, Exam & Timetable", "Could Have", 5, "Muhammad Umer, Saad Asif", "Sprint 2", "Completed"),
        ("6.1", "Comprehensive School Analytics Dashboard", "Epic 6: Reports & Deployment", "Could Have", 5, "Saad Asif, Jamal Matloob", "Sprint 2", "Completed"),
        ("6.2", "3-Copy Bank PDF Fee Challans & Report Cards", "Epic 6: Reports & Deployment", "Could Have", 3, "Jamal Matloob, Saad Asif", "Sprint 2", "Completed"),
        ("6.3", "Production Deployment & Docker Containerization", "Epic 6: Reports & Deployment", "Should Have", 5, "Jamal Matloob, Muhammad Umer", "Sprint 2", "Completed"),

        # Sprint 3 - 2 Spillovers from Sprint 2
        ("QA-2.1", "[Spillover from Sprint 2] Timetable Collision & Room Scheduling QA Verification", "QA & Verification Testing", "Must Have", 3, "Musfirah Abbas (QA Lead), Muhammad Umer", "Sprint 3", "QA & Testing"),
        ("QA-2.2", "[Spillover from Sprint 2] PDF Fee Challan & Report Card Export QA Verification", "QA & Verification Testing", "Must Have", 3, "Musfirah Abbas (QA Lead), Jamal Matloob", "Sprint 3", "QA & Testing"),

        # Sprint 3 - 10 New QA Stories
        ("QA-3.1", "Automated Pytest Regression Suite Execution (22/22 Tests Passing)", "QA & Verification Testing", "Must Have", 5, "Musfirah Abbas (QA Lead), Muhammad Umer", "Sprint 3", "QA & Testing"),
        ("QA-3.2", "Role-Based Access Control (RBAC) Security Audit & Route Guards", "QA & Verification Testing", "Must Have", 5, "Musfirah Abbas (QA Lead), Muhammad Umer", "Sprint 3", "QA & Testing"),
        ("QA-3.3", "Student Fee Discount Engine & Multi-Category Verification", "QA & Verification Testing", "Should Have", 3, "Musfirah Abbas (QA Lead), Jamal Matloob", "Sprint 3", "QA & Testing"),
        ("QA-3.4", "Academic Promotion Batch Processing & Session Transition Data Integrity", "QA & Verification Testing", "Should Have", 3, "Musfirah Abbas (QA Lead), Muhammad Umer", "Sprint 3", "In Progress"),
        ("QA-3.5", "Daily Attendance Logging, Excuse Notes & Absence Threshold Alerts", "QA & Verification Testing", "Should Have", 3, "Musfirah Abbas (QA Lead), Saad Asif", "Sprint 3", "In Progress"),
        ("QA-3.6", "Dark/Light Mode Theme Contrast & Glassmorphic UI Audit (WCAG AA)", "QA & Verification Testing", "Could Have", 3, "Musfirah Abbas (QA Lead), Saad Asif", "Sprint 3", "In Progress"),
        ("QA-3.7", "Cross-Browser Compatibility & Responsive Viewport Testing", "QA & Verification Testing", "Could Have", 3, "Musfirah Abbas (QA Lead), Saad Asif", "Sprint 3", "In Progress"),
        ("QA-3.8", "Exam Mark Bulk Entry, Grading Formulae & Cumulative GPA Precision", "QA & Verification Testing", "Should Have", 3, "Musfirah Abbas (QA Lead), Muhammad Umer", "Sprint 3", "To Do"),
        ("QA-3.9", "Production Docker Image Containerization & Environment Startup Verification", "QA & Verification Testing", "Could Have", 3, "Musfirah Abbas (QA Lead), Jamal Matloob", "Sprint 3", "To Do"),
        ("QA-3.10", "End-to-End User Acceptance Testing (UAT) & Release Sign-Off Matrix", "QA & Verification Testing", "Should Have", 5, "Musfirah Abbas (QA Lead), Saad Asif", "Sprint 3", "To Do"),

        # Backlog
        ("7.1", "Automated SMS Gateway for Fee Dues & Absence Alerts", "Epic 6: Reports & Deployment", "Could Have", 3, "Muhammad Umer, Jamal Matloob", "Backlog", "Project Backlog"),
        ("7.2", "Biometric RFID Attendance Scanner Synchronization", "Epic 6: Reports & Deployment", "Could Have", 5, "Jamal Matloob, Saad Asif", "Backlog", "Project Backlog"),
    ]

    for r_idx, story in enumerate(stories, start=4):
        ws2.row_dimensions[r_idx].height = 22
        is_spill = "Spillover" in str(story[1])
        is_s3_active = story[6] == "Sprint 3"

        for c_idx, val in enumerate(story, start=1):
            cell = ws2.cell(row=r_idx, column=c_idx, value=val)
            cell.font = font_regular
            cell.border = thin_border

            if c_idx in [1, 4, 5, 7]:
                cell.alignment = align_center
            elif c_idx == 8:
                cell.alignment = align_center
                if val == "Completed":
                    cell.font = font_bold
                    cell.fill = PatternFill(start_color="ECFDF5", end_color="ECFDF5", fill_type="solid")
                elif val == "QA & Testing":
                    cell.font = font_active
                    cell.fill = highlight_active_fill
                elif val == "In Progress":
                    cell.font = font_active
                    cell.fill = highlight_active_fill
                elif val == "To Do":
                    cell.fill = zebra_fill
            else:
                cell.alignment = align_left

            if is_spill:
                cell.fill = highlight_spill_fill
                if c_idx == 1:
                    cell.font = font_spill

    # Auto-fit column widths nicely across both sheets
    for ws in [ws1, ws2]:
        for col in ws.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            for cell in col:
                # ignore merged title banner
                if cell.row == 1:
                    continue
                val_str = str(cell.value or "")
                if "\n" in val_str:
                    lines = val_str.split("\n")
                    max_len = max(max_len, max(len(line) for line in lines))
                else:
                    max_len = max(max_len, len(val_str))
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    # Set specific balanced widths for key text columns
    ws1.column_dimensions["A"].width = 14
    ws1.column_dimensions["B"].width = 24
    ws1.column_dimensions["C"].width = 45
    ws1.column_dimensions["D"].width = 16
    ws1.column_dimensions["E"].width = 16
    ws1.column_dimensions["F"].width = 16
    ws1.column_dimensions["G"].width = 16
    ws1.column_dimensions["H"].width = 16
    ws1.column_dimensions["I"].width = 18
    ws1.column_dimensions["J"].width = 52

    ws2.column_dimensions["A"].width = 12
    ws2.column_dimensions["B"].width = 55
    ws2.column_dimensions["C"].width = 30
    ws2.column_dimensions["D"].width = 18
    ws2.column_dimensions["E"].width = 18
    ws2.column_dimensions["F"].width = 38
    ws2.column_dimensions["G"].width = 14
    ws2.column_dimensions["H"].width = 18

    # Save workbook
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_excel = os.path.join(base_dir, "School_Management_Sprint_Velocity.xlsx")
    wb.save(output_excel)

    print("\n" + "=" * 70)
    print("[SUCCESS] Professional Excel Workbook generated successfully!")
    print(f"File Path: {output_excel}")
    print("=" * 70)
    print("Workbook Structure:")
    print("  • Sheet 1: 'Velocity & Sprint Metrics' (Summary Table, KPI Cards, Embedded Chart)")
    print("  • Sheet 2: 'User Stories Breakdown' (All 29 Cards, Priorities, SP, Ownership, Status)")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    create_velocity_workbook()

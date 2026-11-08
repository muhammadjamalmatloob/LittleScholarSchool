from io import BytesIO
import os
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


def _find_school_logo() -> Optional[str]:
    candidate_paths = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "public", "logo-transparent.png")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "public", "logo.png")),
        os.path.abspath("frontend/public/logo-transparent.png"),
        os.path.abspath("frontend/public/logo.png"),
    ]
    for p in candidate_paths:
        if os.path.exists(p):
            return p
    return None


def generate_fee_receipt(fee, student, class_obj, charge) -> BytesIO:
    buffer = BytesIO()
    document = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    document.setTitle(f"Fee Receipt {fee.id} - Little Scholar School System")

    # Margin and bounds
    margin = 48
    content_width = width - (2 * margin)

    # 1. Header Band
    logo_path = _find_school_logo()
    y = height - 50

    if logo_path:
        try:
            document.drawImage(logo_path, margin, y - 48, width=54, height=54, preserveAspectRatio=True, mask='auto')
        except Exception:
            pass

    header_x = margin + 64 if logo_path else margin

    # School Identity Header
    document.setFillColor(colors.HexColor("#1e3a8a"))
    document.setFont("Helvetica-Bold", 17)
    document.drawString(header_x, y - 8, "LITTLE SCHOLAR SCHOOL SYSTEM")

    document.setFillColor(colors.HexColor("#475569"))
    document.setFont("Helvetica", 9)
    document.drawString(header_x, y - 22, "Directorate of Student Accounts & Financial Administration")
    document.drawString(header_x, y - 34, "Official Fee Payment Receipt • Main Campus • +92 42 3588 9000")

    # Document Reference Badge on Top Right
    document.setFont("Helvetica-Bold", 10)
    document.setFillColor(colors.HexColor("#0f172a"))
    document.drawRightString(width - margin, y - 8, f"RECEIPT #{fee.id}")
    document.setFont("Helvetica", 8)
    document.setFillColor(colors.HexColor("#64748b"))
    document.drawRightString(width - margin, y - 22, f"Date: {fee.paid_date or 'N/A'}")

    y -= 58
    document.setStrokeColor(colors.HexColor("#1e3a8a"))
    document.setLineWidth(1.5)
    document.line(margin, y, width - margin, y)

    # 2. Status Ribbon
    y -= 22
    balance = max(fee.amount - (fee.paid_amount or 0), 0)
    is_fully_paid = balance <= 0

    if is_fully_paid:
        status_bg = colors.HexColor("#ecfdf5")
        status_border = colors.HexColor("#10b981")
        status_text_color = colors.HexColor("#065f46")
        status_label = "STATUS: FULLY PAID & CLEARED"
    else:
        status_bg = colors.HexColor("#fffbeb")
        status_border = colors.HexColor("#f59e0b")
        status_text_color = colors.HexColor("#92400e")
        status_label = f"STATUS: PARTIAL PAYMENT (DUE: Rs. {balance:,.2f})"

    document.setFillColor(status_bg)
    document.setStrokeColor(status_border)
    document.setLineWidth(1)
    document.roundRect(margin, y - 6, content_width, 24, 4, stroke=1, fill=1)

    document.setFont("Helvetica-Bold", 9)
    document.setFillColor(status_text_color)
    document.drawCentredString(width / 2, y + 2, status_label)

    # 3. Two-Column Student & Voucher Metadata Section
    y -= 30
    document.setFillColor(colors.HexColor("#0f172a"))
    document.setFont("Helvetica-Bold", 11)
    document.drawString(margin, y, "Student & Academic Information")
    document.drawRightString(width - margin, y, "Transaction Details")

    y -= 8
    document.setStrokeColor(colors.HexColor("#e2e8f0"))
    document.setLineWidth(0.8)
    document.line(margin, y, width - margin, y)

    # Data Rows
    roll_display = str(getattr(student, "formatted_roll_number", None) or getattr(student, "roll_number", None) or student.id)
    class_display = f"{class_obj.name} - {class_obj.section or 'A'}"

    left_rows = [
        ("Student Name", str(student.name)),
        ("Roll Number", roll_display),
        ("Academic Class", class_display),
        ("Student ID", f"STU-{student.id}"),
    ]

    right_rows = [
        ("Transaction ID", str(fee.transaction_id or f"CSH-{fee.id:04d}")),
        ("Payment Channel", str(fee.payment_method or "Campus Desk Cash").title()),
        ("Payment Date", str(fee.paid_date or "Recorded at Counter")),
        ("Due Date", str(fee.due_date or "Immediate")),
    ]

    row_y = y - 18
    for (l_label, l_val), (r_label, r_val) in zip(left_rows, right_rows):
        # Left side
        document.setFont("Helvetica-Bold", 9)
        document.setFillColor(colors.HexColor("#475569"))
        document.drawString(margin, row_y, f"{l_label}:")
        document.setFont("Helvetica", 9)
        document.setFillColor(colors.HexColor("#0f172a"))
        document.drawString(margin + 85, row_y, l_val)

        # Right side
        document.setFont("Helvetica-Bold", 9)
        document.setFillColor(colors.HexColor("#475569"))
        document.drawString(width / 2 + 15, row_y, f"{r_label}:")
        document.setFont("Helvetica", 9)
        document.setFillColor(colors.HexColor("#0f172a"))
        document.drawString(width / 2 + 105, row_y, r_val)

        row_y -= 16

    # 4. Financial Breakdown Table
    y = row_y - 12
    document.setFillColor(colors.HexColor("#0f172a"))
    document.setFont("Helvetica-Bold", 11)
    document.drawString(margin, y, "Fee Charge Ledger & Breakdown")

    y -= 8
    document.setStrokeColor(colors.HexColor("#1e3a8a"))
    document.setLineWidth(1)
    document.line(margin, y, width - margin, y)

    # Table Header Row
    y -= 18
    document.setFillColor(colors.HexColor("#f1f5f9"))
    document.rect(margin, y - 4, content_width, 18, stroke=0, fill=1)

    document.setFont("Helvetica-Bold", 9)
    document.setFillColor(colors.HexColor("#1e293b"))
    document.drawString(margin + 10, y, "Sr.")
    document.drawString(margin + 40, y, "Description / Fee Category")
    document.drawRightString(width - margin - 150, y, "Billed Amount")
    document.drawRightString(width - margin - 75, y, "Paid Amount")
    document.drawRightString(width - margin - 10, y, "Balance")

    # Table Data Row
    y -= 20
    document.setFont("Helvetica", 9)
    document.setFillColor(colors.HexColor("#0f172a"))
    document.drawString(margin + 10, y, "1")
    document.drawString(margin + 40, y, str(getattr(charge, "charge_name", "Monthly Academic Tuition")))
    document.drawRightString(width - margin - 150, y, f"Rs. {fee.amount:,.2f}")
    document.drawRightString(width - margin - 75, y, f"Rs. {(fee.paid_amount or 0):,.2f}")
    document.drawRightString(width - margin - 10, y, f"Rs. {balance:,.2f}")

    # Separator Line
    y -= 10
    document.setStrokeColor(colors.HexColor("#cbd5e1"))
    document.setLineWidth(0.6)
    document.line(margin, y, width - margin, y)

    # Totals Row
    y -= 18
    document.setFont("Helvetica-Bold", 9)
    document.setFillColor(colors.HexColor("#1e3a8a"))
    document.drawString(margin + 40, y, "Total Net Amount Received:")
    document.drawRightString(width - margin - 75, y, f"Rs. {(fee.paid_amount or 0):,.2f}")
    document.drawRightString(width - margin - 10, y, f"Rs. {balance:,.2f}")

    # 5. Instructions & Authorized Signatures
    y -= 45
    document.setFillColor(colors.HexColor("#f8fafc"))
    document.setStrokeColor(colors.HexColor("#e2e8f0"))
    document.roundRect(margin, y - 40, content_width, 50, 4, stroke=1, fill=1)

    document.setFont("Helvetica-Bold", 8)
    document.setFillColor(colors.HexColor("#334155"))
    document.drawString(margin + 10, y - 6, "Payment Notice & Instructions:")
    document.setFont("Helvetica", 8)
    document.setFillColor(colors.HexColor("#64748b"))
    document.drawString(margin + 10, y - 18, "• This is a system-generated official payment receipt issued under the Little Scholar School System.")
    document.drawString(margin + 10, y - 28, "• Please retain this receipt for student academic records, registration verifications, and annual clearance.")

    # Signature Block - Principal Only
    y -= 75
    col_w = 180
    bx = margin + content_width - col_w - 10
    document.setStrokeColor(colors.HexColor("#94a3b8"))
    document.setLineWidth(0.8)
    document.line(bx, y, bx + col_w, y)
    document.setFont("Helvetica-Bold", 9)
    document.setFillColor(colors.HexColor("#1e293b"))
    document.drawCentredString(bx + col_w / 2, y - 14, "Principal Signature & Stamp")

    # Footer note
    document.setFont("Helvetica", 7)
    document.setFillColor(colors.HexColor("#94a3b8"))
    document.drawCentredString(width / 2, margin - 15, "Generated automatically by School Management System (SMS) • Valid without manual alteration")

    document.save()
    buffer.seek(0)
    return buffer

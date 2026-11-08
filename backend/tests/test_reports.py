from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def admin_headers():
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@school.com", "password": "admin123"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_dashboard_summary_and_priority_actions():
    headers = admin_headers()
    res = client.get("/api/reports/dashboard/summary", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert "total_students" in data
    assert "total_teachers" in data
    assert "attendance_today" in data
    assert "pending_fees" in data
    assert "collected_fees" in data

    actions_res = client.get("/api/reports/dashboard/priority-actions", headers=headers)
    assert actions_res.status_code == 200, actions_res.text
    actions = actions_res.json()
    assert isinstance(actions, list)
    assert len(actions) > 0


def test_reports_manager_endpoints():
    headers = admin_headers()

    # Attendance report
    att_res = client.get("/api/reports/attendance", headers=headers)
    assert att_res.status_code == 200, att_res.text
    att_data = att_res.json()
    assert "class_average" in att_data
    assert "summary" in att_data

    # Fee report
    fee_res = client.get("/api/reports/fees", headers=headers)
    assert fee_res.status_code == 200, fee_res.text
    fee_data = fee_res.json()
    assert "total_fees" in fee_data
    assert "total_collected" in fee_data
    assert "collection_rate" in fee_data
    assert "students" in fee_data

    # Exam performance report
    exam_res = client.get("/api/reports/exam-performance", headers=headers)
    assert exam_res.status_code == 200, exam_res.text
    exam_data = exam_res.json()
    assert "average_marks" in exam_data
    assert "pass_percentage" in exam_data
    assert "grade_distribution" in exam_data


def test_student_report_summary():
    headers = admin_headers()
    # List students to get valid student ID
    st_res = client.get("/api/students", headers=headers)
    assert st_res.status_code == 200
    items = st_res.json()["items"]
    if items:
        student_id = items[0]["id"]
        summary_res = client.get(f"/api/reports/student-summary/{student_id}", headers=headers)
        assert summary_res.status_code == 200, summary_res.text
        summary = summary_res.json()
        assert summary["student_id"] == student_id
        assert "attendance" in summary
        assert "fees" in summary
        assert "exams" in summary


def test_pdf_report_download():
    headers = admin_headers()
    pdf_res = client.get("/api/reports/download/attendance", headers=headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 0

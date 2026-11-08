import io
import uuid

import pytest
from fastapi.testclient import TestClient

from backend.app.database import init_database
from backend.main import app

client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    init_database()


def get_admin_token():
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@school.com", "password": "admin123"},
    )
    return response.json()["access_token"]


def auth_headers():
    return {"Authorization": f"Bearer {get_admin_token()}"}


def available_class_id(headers, required_slots=1):
    classes = client.get("/api/classes", headers=headers).json()
    for class_item in classes:
        if class_item["capacity"] - class_item["student_count"] >= required_slots:
            return class_item["id"], class_item["section"]
    pytest.fail(f"No class has {required_slots} available enrollment slot(s)")


def test_list_classes():
    response = client.get("/api/classes", headers=auth_headers())
    assert response.status_code == 200
    assert len(response.json()) > 0


def test_student_crud_lifecycle():
    headers = auth_headers()
    class_id, _ = available_class_id(headers, required_slots=2)
    unique = uuid.uuid4().hex[:8]
    student_payload = {
        "name": f"Hamza Tariq {unique}",
        "class_id": class_id,
        "date_of_birth": "2015-06-15",
        "gender": "M",
        "parent_name": "Tariq Mahmood",
        "contact_number": "03001234567",
        "email": f"hamza.{unique}@example.com",
        "address": "Gulberg III",
        "city": "Lahore",
        "admission_date": "2024-01-10",
        "is_active": True,
        "notes": "Transfer student",
    }

    create_response = client.post(
        "/api/students",
        json=student_payload,
        headers=headers,
    )
    assert create_response.status_code == 201
    created_student = create_response.json()
    student_id = created_student["id"]
    assert created_student["id"].startswith("STUD_")
    assert created_student["roll_number"] >= 1

    second_response = client.post(
        "/api/students",
        json={**student_payload, "name": f"Hamza Tariq Second {unique}"},
        headers=headers,
    )
    assert second_response.status_code == 201
    second_student = second_response.json()
    assert second_student["roll_number"] == created_student["roll_number"] + 1

    get_response = client.get(f"/api/students/{student_id}", headers=headers)
    assert get_response.status_code == 200
    assert get_response.json()["id"] == student_id

    search_response = client.get(
        f"/api/students?search={unique}",
        headers=headers,
    )
    assert search_response.status_code == 200
    assert any(item["id"] == student_id for item in search_response.json()["items"])

    update_response = client.put(
        f"/api/students/{student_id}",
        json={"name": f"Hamza Tariq Jr. {unique}", "city": "Islamabad"},
        headers=headers,
    )
    assert update_response.status_code == 200
    assert update_response.json()["city"] == "Islamabad"

    attendance_response = client.get(
        f"/api/students/{student_id}/attendance-summary",
        headers=headers,
    )
    assert attendance_response.status_code == 200
    assert "percentage" in attendance_response.json()

    fee_response = client.get(
        f"/api/students/{student_id}/fee-status",
        headers=headers,
    )
    assert fee_response.status_code == 200
    assert "total_due" in fee_response.json()

    for record in (created_student, second_student):
        delete_response = client.delete(
            f"/api/students/{record['id']}",
            headers=headers,
        )
        assert delete_response.status_code == 200

    verify_delete = client.get(f"/api/students/{student_id}", headers=headers)
    assert verify_delete.status_code == 200
    assert verify_delete.json()["is_active"] is False


def test_csv_import_and_template():
    headers = auth_headers()
    class_id, section = available_class_id(headers, required_slots=3)
    template_response = client.get(
        f"/api/import/students/template?class_id={class_id}&section={section}&roll_mode=new",
        headers=headers,
    )
    assert template_response.status_code == 200
    assert "Student Name" in template_response.text
    assert "Roll Number" not in template_response.text

    unique = uuid.uuid4().hex[:8]
    csv_content = f"""Student Name,Date of Birth,Gender,Parent Name,Contact Number,Email,Address,City
Batch Student A {unique},2016-01-01,M,Parent A,03000000001,batchA-{unique}@example.com,Address A,Lahore
Batch Student B {unique},2016-02-02,F,Parent B,03000000002,batchB-{unique}@example.com,Address B,Lahore
Batch Student C {unique},2016-03-03,M,Parent C,03000000003,batchC-{unique}@example.com,Address C,Lahore
"""
    import_response = client.post(
        f"/api/import/students?class_id={class_id}&section={section}&roll_mode=new",
        files={
            "file": (
                "test_students.csv",
                io.BytesIO(csv_content.encode("utf-8")),
                "text/csv",
            )
        },
        headers=headers,
    )
    assert import_response.status_code == 200
    report = import_response.json()
    assert report["imported"] == 3
    assert report["skipped"] == 0
    assert report["errors"] == []


def test_csv_import_preserves_existing_roll_number_for_next_enrollment():
    headers = auth_headers()
    unique = uuid.uuid4().hex[:8]
    class_id, section = available_class_id(headers)
    existing_students = client.get(
        f"/api/students?class_id={class_id}&limit=500", headers=headers
    ).json()["items"]
    imported_roll = max((item["roll_number"] for item in existing_students), default=0) + 100
    csv_content = f"""Student Name,Roll Number,Date of Birth,Gender,Parent Name,Contact Number,Email,Address,City,Admission Date,Notes,Is Active
Imported Student {unique},{imported_roll},2016-01-01,M,Parent,03000000004,imported-{unique}@example.com,Address,Lahore,2025-08-15,Imported record,Yes
"""
    import_response = client.post(
        f"/api/import/students?class_id={class_id}&section={section}&roll_mode=existing",
        files={"file": ("rolls.csv", io.BytesIO(csv_content.encode()), "text/csv")},
        headers=headers,
    )
    assert import_response.status_code == 200
    assert import_response.json()["imported"] == 1

    create_response = client.post(
        "/api/students",
        json={"name": f"Next Student {unique}", "class_id": class_id},
        headers=headers,
    )
    assert create_response.status_code == 201
    assert create_response.json()["roll_number"] == imported_roll + 1

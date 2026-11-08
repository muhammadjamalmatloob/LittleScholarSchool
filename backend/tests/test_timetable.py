import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def admin_headers():
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@school.com", "password": "admin123"},
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_get_section_timetables_with_metadata():
    headers = admin_headers()
    response = client.get("/api/timetable/sections", headers=headers)
    assert response.status_code == 200, response.text
    sections = response.json()
    assert isinstance(sections, list)
    assert len(sections) > 0
    first_sec = sections[0]
    assert "weekly_matrix" in first_sec
    assert "daily_schedule" in first_sec

    # Check that metadata fields exist on slot objects
    first_matrix_row = first_sec["weekly_matrix"][0]
    first_slot = first_matrix_row["slots"]["Monday"]
    assert "class_id" in first_slot
    assert "period_number" in first_slot
    assert "day_of_week" in first_slot


def test_timetable_crud_and_conflict_check():
    headers = admin_headers()

    # 1. Fetch classes, teachers, and subjects
    classes_resp = client.get("/api/classes", headers=headers)
    assert classes_resp.status_code == 200
    classes = classes_resp.json()
    assert len(classes) >= 2
    class1_id = classes[0]["id"]
    class2_id = classes[1]["id"]

    teachers_resp = client.get("/api/teachers?limit=100", headers=headers)
    assert teachers_resp.status_code == 200
    teachers = teachers_resp.json()["items"]
    assert len(teachers) > 0
    teacher_id = teachers[0]["id"]

    subjects_resp = client.get("/api/subjects", headers=headers)
    assert subjects_resp.status_code == 200
    subjects = subjects_resp.json()
    assert len(subjects) > 0
    subject_id = subjects[0]["id"]

    # 2. Create or upsert a timetable slot for Class 1 on Friday Period 5
    payload = {
        "class_id": class1_id,
        "subject_id": subject_id,
        "teacher_id": teacher_id,
        "day_of_week": "Friday",
        "period_number": 5,
        "room_number": "Test Room 101",
    }
    create_resp = client.post("/api/timetable", json=payload, headers=headers)
    assert create_resp.status_code == 200, create_resp.text
    slot = create_resp.json()
    assert slot["class_id"] == class1_id
    assert slot["period_number"] == 5
    slot_id = slot["id"]

    # 3. Conflict check: try to schedule same teacher for Class 2 on Friday Period 5
    conflict_payload = {
        "class_id": class2_id,
        "subject_id": subject_id,
        "teacher_id": teacher_id,
        "day_of_week": "Friday",
        "period_number": 5,
    }
    conflict_resp = client.post("/api/timetable", json=conflict_payload, headers=headers)
    assert conflict_resp.status_code == 400
    assert "already assigned" in conflict_resp.json()["detail"].lower()

    # 4. Delete the created slot
    delete_resp = client.delete(f"/api/timetable/{slot_id}", headers=headers)
    assert delete_resp.status_code == 200
    assert delete_resp.json()["success"] is True

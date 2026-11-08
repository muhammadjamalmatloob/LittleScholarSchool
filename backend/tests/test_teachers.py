from datetime import date

from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def admin_headers():
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@school.com", "password": "admin123"},
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def login_headers(email, password):
    response = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_teacher_crud_and_code_generation():
    headers = admin_headers()
    payload = {
        "full_name": "Phase 1A Teacher",
        "email": "phase1a.teacher@example.com",
        "qualification": "Master of Education",
        "specialization": "Science",
        "salary": 50000,
        "total_periods_per_week": 25,
    }
    create_response = client.post("/api/teachers", json=payload, headers=headers)
    assert create_response.status_code == 201, create_response.text
    teacher = create_response.json()
    assert teacher["teacher_code"].startswith("TCH_")
    teacher_id = teacher["id"]

    list_response = client.get("/api/teachers?limit=100", headers=headers)
    assert list_response.status_code == 200
    assert any(item["id"] == teacher_id for item in list_response.json()["items"])

    update_response = client.put(
        f"/api/teachers/{teacher_id}",
        json={"full_name": "Updated Phase 1A Teacher", "salary": 55000},
        headers=headers,
    )
    assert update_response.status_code == 200
    assert update_response.json()["full_name"] == "Updated Phase 1A Teacher"
    assert update_response.json()["salary"] == 55000

    salary_response = client.get(
        f"/api/teachers/{teacher_id}/salary-summary?month=4&year=2025",
        headers=headers,
    )
    assert salary_response.status_code == 200
    assert salary_response.json()["month"] == "April 2025"
    assert salary_response.json()["net_salary"] == 55000

    delete_response = client.delete(f"/api/teachers/{teacher_id}", headers=headers)
    assert delete_response.status_code == 200
    active_response = client.get(
        f"/api/teachers/{teacher_id}?is_active=false",
        headers=headers,
    )
    assert active_response.status_code == 200
    assert active_response.json()["is_active"] is False


def test_teacher_authorization_and_missing_teacher():
    principal_headers = login_headers("principal@school.com", "principal123")
    read_response = client.get("/api/teachers", headers=principal_headers)
    assert read_response.status_code == 200

    teacher_headers = login_headers("teacher@school.com", "teacher123")
    write_response = client.post(
        "/api/teachers",
        json={
            "full_name": "Unauthorized Teacher",
            "email": "unauthorized@example.com",
            "qualification": "Bachelor of Education",
        },
        headers=teacher_headers,
    )
    assert write_response.status_code == 403

    missing_response = client.get("/api/teachers/999999", headers=principal_headers)
    assert missing_response.status_code == 404

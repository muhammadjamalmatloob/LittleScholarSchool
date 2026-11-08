from datetime import date, timedelta

from fastapi.testclient import TestClient

from backend.main import app


client = TestClient(app)


def admin_headers():
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@school.com", "password": "admin123"},
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_academic_year_lifecycle_and_overlap_validation():
    headers = admin_headers()
    existing_years = client.get(
        "/api/academic-years?include_inactive=true",
        headers=headers,
    ).json()
    latest_end = max(
        date.fromisoformat(year["end_date"]) for year in existing_years
    )
    start_date = latest_end + timedelta(days=1)
    end_date = start_date + timedelta(days=364)
    year_name = f"{start_date.year}-{end_date.year}"
    create_response = client.post(
        "/api/academic-years",
        json={
            "year_name": year_name,
            "start_date": str(start_date),
            "end_date": str(end_date),
        },
        headers=headers,
    )
    assert create_response.status_code == 201, create_response.text
    academic_year = create_response.json()

    overlap_response = client.post(
        "/api/academic-years",
        json={
            "year_name": f"{year_name}-overlap",
            "start_date": str(start_date + timedelta(days=30)),
            "end_date": str(end_date - timedelta(days=30)),
        },
        headers=headers,
    )
    assert overlap_response.status_code == 409

    deactivate_response = client.delete(
        f"/api/academic-years/{academic_year['id']}",
        headers=headers,
    )
    assert deactivate_response.status_code == 204


def test_class_teacher_assignment_replaces_current_assignment():
    headers = admin_headers()
    years = client.get("/api/academic-years", headers=headers).json()
    current_year = next(year for year in years if year["is_current"])
    teachers = client.get("/api/teachers?is_active=true", headers=headers).json()["items"]

    first_assignment = client.post(
        "/api/class-teacher-assignments",
        json={
            "class_id": 1,
            "teacher_id": teachers[0]["id"],
            "academic_year_id": current_year["id"],
            "assignment_date": str(date.today()),
        },
        headers=headers,
    )
    assert first_assignment.status_code == 201, first_assignment.text

    second_teacher = teachers[1] if len(teachers) > 1 else teachers[0]
    replacement = client.post(
        "/api/class-teacher-assignments",
        json={
            "class_id": 1,
            "teacher_id": second_teacher["id"],
            "academic_year_id": current_year["id"],
            "assignment_date": str(date.today()),
        },
        headers=headers,
    )
    assert replacement.status_code == 201, replacement.text
    assert replacement.json()["id"] == first_assignment.json()["id"]
    assert replacement.json()["teacher_id"] == second_teacher["id"]

    current_teacher = client.get(
        f"/api/classes/1/current-teacher?academic_year_id={current_year['id']}",
        headers=headers,
    )
    assert current_teacher.status_code == 200
    assert current_teacher.json()["teacher"]["id"] == second_teacher["id"]

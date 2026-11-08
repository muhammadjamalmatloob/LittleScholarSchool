from datetime import date
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


def test_student_promotion_lifecycle():
    headers = admin_headers()

    # 1. Fetch academic years
    years_res = client.get("/api/academic-years", headers=headers)
    assert years_res.status_code == 200
    years = years_res.json()
    assert len(years) > 0
    from_year = years[0]

    # Create target academic year if only 1 exists
    if len(years) < 2:
        create_year_res = client.post(
            "/api/academic-years",
            json={
                "year_name": "2025-2026",
                "start_date": "2025-04-01",
                "end_date": "2026-03-31",
            },
            headers=headers,
        )
        assert create_year_res.status_code in [201, 409]
        years_res = client.get("/api/academic-years", headers=headers)
        years = years_res.json()

    to_year = [y for y in years if y["id"] != from_year["id"]][0]

    # 2. Fetch classes
    classes_res = client.get("/api/classes", headers=headers)
    assert classes_res.status_code == 200
    classes = classes_res.json()
    assert len(classes) >= 2

    c1 = classes[0]
    c2 = classes[1]

    # Map class 1 -> class 2, and other classes -> null (graduate)
    mapping = {str(c1["id"]): c2["id"]}
    for c in classes[1:]:
        mapping[str(c["id"])] = None

    # 3. Test Preview endpoint
    preview_res = client.post(
        "/api/student-promotion/preview",
        json={
            "from_academic_year_id": from_year["id"],
            "to_academic_year_id": to_year["id"],
            "promotion_mapping": mapping,
            "min_attendance": 75.0,
            "min_marks": 40.0,
        },
        headers=headers,
    )
    assert preview_res.status_code == 200, preview_res.text
    preview_data = preview_res.json()
    assert "total_students" in preview_data
    assert "eligible_for_promotion" in preview_data
    assert "students" in preview_data
    assert isinstance(preview_data["students"], list)

    # 4. Test Execute endpoint
    exec_res = client.post(
        "/api/student-promotion/execute",
        json={
            "from_academic_year_id": from_year["id"],
            "to_academic_year_id": to_year["id"],
            "promotion_mapping": mapping,
            "min_attendance": 75.0,
            "min_marks": 40.0,
        },
        headers=headers,
    )
    assert exec_res.status_code == 200, exec_res.text
    exec_data = exec_res.json()
    assert exec_data["success"] is True
    assert "promoted" in exec_data
    assert "graduated" in exec_data

    # 5. Test History endpoint
    history_res = client.get("/api/student-promotion/history", headers=headers)
    assert history_res.status_code == 200, history_res.text
    history = history_res.json()
    assert isinstance(history, list)
    assert len(history) > 0
    assert any(h["action"] == "STUDENT_PROMOTION" for h in history)

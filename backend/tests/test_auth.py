import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.app.database import init_database

client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    init_database()


def test_login_success():
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@school.com", "password": "admin123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "admin@school.com"
    assert data["user"]["role"] == "admin"


def test_login_invalid_password():
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@school.com", "password": "wrongpassword"},
    )
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]


def test_get_current_user_unauthorized():
    response = client.get("/api/auth/current-user")
    assert response.status_code == 401


def test_get_current_user_authorized():
    # Login as admin
    login_res = client.post(
        "/api/auth/login",
        json={"email": "admin@school.com", "password": "admin123"},
    )
    token = login_res.json()["access_token"]

    response = client.get(
        "/api/auth/current-user",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["email"] == "admin@school.com"
    assert user_data["role"] == "admin"
    assert len(user_data["permissions"]) > 0


def test_rbac_access_control():
    # Login as teacher
    teacher_login = client.post(
        "/api/auth/login",
        json={"email": "teacher@school.com", "password": "teacher123"},
    )
    teacher_token = teacher_login.json()["access_token"]

    # Teacher should NOT be allowed to create users (Admin only)
    forbidden_res = client.post(
        "/api/users",
        json={
            "email": "intruder@school.com",
            "password": "password123",
            "role": "teacher",
            "full_name": "Intruder User",
        },
        headers={"Authorization": f"Bearer {teacher_token}"},
    )
    assert forbidden_res.status_code == 403


def test_admin_user_crud():
    # Login as admin
    admin_login = client.post(
        "/api/auth/login",
        json={"email": "admin@school.com", "password": "admin123"},
    )
    admin_token = admin_login.json()["access_token"]

    # Create new test user
    test_email = "newstaff@school.com"
    create_res = client.post(
        "/api/users",
        json={
            "email": test_email,
            "password": "securepassword123",
            "role": "teacher",
            "full_name": "New Staff Member",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert create_res.status_code in [201, 400]  # If already created in prior run
    if create_res.status_code == 201:
        created_id = create_res.json()["id"]

        # Read user
        get_res = client.get(
            f"/api/users/{created_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert get_res.status_code == 200
        assert get_res.json()["full_name"] == "New Staff Member"

        # Update user
        update_res = client.put(
            f"/api/users/{created_id}",
            json={"full_name": "Updated Staff Member"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert update_res.status_code == 200
        assert update_res.json()["full_name"] == "Updated Staff Member"

        # Delete user
        del_res = client.delete(
            f"/api/users/{created_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert del_res.status_code == 200

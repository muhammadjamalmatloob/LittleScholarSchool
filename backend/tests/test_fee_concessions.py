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


def test_fee_category_and_discount_plan():
    headers = admin_headers()

    # 1. Fetch existing fee charges to get a valid class and academic year with seeded charges
    all_charges_resp = client.get("/api/fee-charges", headers=headers)
    assert all_charges_resp.status_code == 200
    all_charges = all_charges_resp.json()
    assert len(all_charges) > 0

    tuition_charge = next(c for c in all_charges if "tuition" in c["charge_name"].lower())
    class_id = tuition_charge["class_id"]
    ay_id = tuition_charge["academic_year_id"]
    tuition_id = tuition_charge["id"]
    standard_tuition = tuition_charge["amount"]

    # 2. Add a new fee category for this class: "Monthly Stationery & Art Supplies"
    category_payload = {
        "class_id": class_id,
        "academic_year_id": ay_id,
        "charge_name": "Monthly Stationery & Art Supplies",
        "amount": 750.0,
        "charge_type": "monthly",
        "is_mandatory": True,
    }
    cat_resp = client.post("/api/fee-charges", json=category_payload, headers=headers)
    assert cat_resp.status_code == 201, cat_resp.text
    stationery_charge = cat_resp.json()
    stationery_id = stationery_charge["id"]

    # 3. Find students in this class
    students_resp = client.get(f"/api/students?class_id={class_id}&limit=10", headers=headers)
    assert students_resp.status_code == 200
    students_data = students_resp.json()
    student_items = students_data["items"] if "items" in students_data else students_data
    assert len(student_items) >= 1
    discounted_student = student_items[0]
    student_id = discounted_student["id"]

    # 4. Configure a discount for this student:
    # 50% discount on Tuition, and opt-out of Stationery
    discounted_tuition = standard_tuition / 2.0
    plan_payload = [
        {
            "fee_charge_id": tuition_id,
            "amount": discounted_tuition,
            "is_enabled": True,
        },
        {
            "fee_charge_id": stationery_id,
            "amount": 750.0,
            "is_enabled": False,  # Opted out of stationery fee
        },
    ]
    plan_resp = client.put(
        f"/api/students/{student_id}/fee-plan?academic_year_id={ay_id}",
        json=plan_payload,
        headers=headers,
    )
    assert plan_resp.status_code == 200, plan_resp.text
    plan_items = plan_resp.json()
    plan_map = {item["fee_charge_id"]: item for item in plan_items}
    assert plan_map[tuition_id]["amount"] == pytest.approx(discounted_tuition)
    assert plan_map[tuition_id]["is_enabled"] is True
    assert plan_map[stationery_id]["is_enabled"] is False

    # 5. Generate chalans for this class for Month 11, Year 2026
    gen_payload = {
        "class_id": class_id,
        "academic_year_id": ay_id,
        "month": 11,
        "year": 2026,
    }
    gen_resp = client.post("/api/fee-generation/chalans", json=gen_payload, headers=headers)
    assert gen_resp.status_code == 200, gen_resp.text

    # 6. Verify fees generated for the discounted student
    student_fees_resp = client.get(
        f"/api/fees?student_id={student_id}&month=11&year=2026",
        headers=headers,
    )
    assert student_fees_resp.status_code == 200
    fees = student_fees_resp.json()["items"]

    # Tuition fee should exist and have the discounted amount!
    student_tuition = next((f for f in fees if f["fee_charge_id"] == tuition_id), None)
    assert student_tuition is not None
    assert student_tuition["amount"] == pytest.approx(discounted_tuition)

    # Stationery fee should NOT exist because is_enabled was False!
    student_stationery = next((f for f in fees if f["fee_charge_id"] == stationery_id), None)
    assert student_stationery is None

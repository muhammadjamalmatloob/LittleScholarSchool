import json
from calendar import monthrange
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.crud import create_audit_log
from backend.app.middleware.rbac import require_permission, require_roles
from backend.app.models import (
    AcademicYear,
    Class,
    Fee,
    FeeCharge,
    Student,
    StudentFeePlan,
    User,
)
from backend.app.schemas import (
    ChalanActionResponse,
    ChalanGenerationRequest,
    ChalanGenerationResponse,
    ChalanItemUpdate,
    ChalanUpdateRequest,
    FeeChargeCreate,
    FeeChargeOut,
    FeeChargeUpdate,
    FeeOut,
    FeePaymentCreate,
    StudentFeePlanItem,
    StudentFeePlanOut,
)
from backend.app.utils.fee_receipt_generator import generate_fee_receipt

router = APIRouter(tags=["Fees"])


def _get_fee_charge(db: Session, charge_id: int) -> FeeCharge:
    charge = db.query(FeeCharge).filter(FeeCharge.id == charge_id).first()
    if charge is None:
        raise HTTPException(status_code=404, detail="Fee charge not found")
    return charge


def _charge_applies(charge: FeeCharge, month: int) -> bool:
    if charge.charge_type in {"yearly", "one-time"}:
        return charge.applicable_from_month in (None, month)
    if charge.charge_type == "quarterly" and month not in {1, 4, 7, 10}:
        return False
    if charge.applicable_from_month and month < charge.applicable_from_month:
        return False
    if charge.applicable_to_month and month > charge.applicable_to_month:
        return False
    return True


def _get_student_fee_plans(db: Session, student_id: str, academic_year_id: int):
    return {
        plan.fee_charge_id: plan
        for plan in db.query(StudentFeePlan).filter(
            StudentFeePlan.student_id == student_id,
            StudentFeePlan.academic_year_id == academic_year_id,
        ).all()
    }


def _fee_out(fee: Fee, student: Student, class_obj: Class, charge: FeeCharge) -> FeeOut:
    paid_amount = fee.paid_amount or 0
    year_name = student.academic_year.year_name if student.academic_year else "2024-2025"
    session = year_name.split("-")[0] if "-" in year_name else year_name
    class_name = class_obj.name.replace("Grade ", "").replace("Class ", "").strip()
    formatted_roll = f"{session}-{class_name}-{(class_obj.section or 'A').upper()}-{student.roll_number or 1:02d}"
    return FeeOut(
        id=fee.id,
        student_id=student.id,
        student_name=student.name,
        roll_number=student.roll_number,
        formatted_roll_number=formatted_roll,
        class_id=class_obj.id,
        class_name=class_obj.name,
        section=class_obj.section,
        fee_charge_id=charge.id,
        charge_name=charge.charge_name,
        amount=fee.amount,
        paid_amount=paid_amount,
        balance=max(fee.amount - paid_amount, 0),
        month=fee.month,
        year=fee.year,
        due_date=fee.due_date,
        status=fee.status,
        paid_date=fee.paid_date,
        payment_method=fee.payment_method,
        transaction_id=fee.transaction_id,
        remarks=fee.remarks,
    )


@router.get("/fee-charges", response_model=list[FeeChargeOut])
def list_fee_charges(
    class_id: Optional[int] = Query(None),
    academic_year_id: Optional[int] = Query(None),
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("fee-charges", "read")),
):
    query = db.query(FeeCharge)
    if class_id is not None and not hasattr(class_id, "default"):
        query = query.filter(FeeCharge.class_id == int(class_id))
    if academic_year_id is not None and not hasattr(academic_year_id, "default"):
        query = query.filter(FeeCharge.academic_year_id == int(academic_year_id))
    if not include_inactive:
        query = query.filter(FeeCharge.is_active.is_(True))
    return query.order_by(FeeCharge.charge_name).all()


@router.post("/fee-charges", response_model=FeeChargeOut, status_code=status.HTTP_201_CREATED)
def create_fee_charge(
    payload: FeeChargeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    if db.query(Class).filter(Class.id == payload.class_id, Class.is_active.is_(True)).first() is None:
        raise HTTPException(status_code=404, detail="Active class not found")
    if db.query(AcademicYear).filter(
        AcademicYear.id == payload.academic_year_id,
        AcademicYear.is_active.is_(True),
    ).first() is None:
        raise HTTPException(status_code=404, detail="Active academic year not found")

    # If an active charge with this name already exists for this class & year, update it rather than duplicating
    existing_charge = db.query(FeeCharge).filter(
        FeeCharge.class_id == payload.class_id,
        FeeCharge.academic_year_id == payload.academic_year_id,
        FeeCharge.charge_name.ilike(payload.charge_name.strip()),
        FeeCharge.is_active.is_(True),
    ).first()
    if existing_charge:
        existing_charge.amount = payload.amount
        existing_charge.charge_type = payload.charge_type
        existing_charge.applicable_from_month = payload.applicable_from_month
        existing_charge.is_mandatory = payload.is_mandatory
        db.commit()
        db.refresh(existing_charge)
        return existing_charge

    charge_data = payload.model_dump()
    charge_data["charge_name"] = payload.charge_name.strip()
    charge = FeeCharge(**charge_data)
    db.add(charge)
    db.commit()
    db.refresh(charge)
    return charge


@router.get("/students/{student_id}/fee-plan", response_model=list[StudentFeePlanOut])
def get_student_fee_plan(
    student_id: str,
    academic_year_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("fees", "read")),
):
    return db.query(StudentFeePlan).filter(
        StudentFeePlan.student_id == student_id,
        StudentFeePlan.academic_year_id == academic_year_id,
    ).all()


@router.put("/students/{student_id}/fee-plan", response_model=list[StudentFeePlanOut])
def save_student_fee_plan(
    student_id: str,
    academic_year_id: int,
    payload: list[StudentFeePlanItem],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "accountant")),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    charge_ids = {item.fee_charge_id for item in payload}
    charges = db.query(FeeCharge).filter(
        FeeCharge.id.in_(charge_ids),
        FeeCharge.class_id == student.class_id,
        FeeCharge.academic_year_id == academic_year_id,
        FeeCharge.is_active.is_(True),
    ).all()
    if len(charges) != len(charge_ids):
        raise HTTPException(status_code=400, detail="Fee plan contains an invalid class fee category")
    existing = {
        plan.fee_charge_id: plan
        for plan in db.query(StudentFeePlan).filter(
            StudentFeePlan.student_id == student_id,
            StudentFeePlan.academic_year_id == academic_year_id,
        ).all()
    }

    # 1. Update StudentFeePlan template
    plan_by_id = {}
    plan_by_name = {}
    charges_map = {c.id: c for c in charges}

    for item in payload:
        plan = existing.get(item.fee_charge_id)
        if plan is None:
            plan = StudentFeePlan(
                student_id=student_id,
                fee_charge_id=item.fee_charge_id,
                academic_year_id=academic_year_id,
            )
            db.add(plan)
        amt = round(max(0.0, float(item.amount)), 2)
        plan.amount = amt
        plan.is_enabled = bool(item.is_enabled)
        plan_by_id[item.fee_charge_id] = plan

        charge_obj = charges_map.get(item.fee_charge_id)
        if charge_obj and charge_obj.charge_name:
            plan_by_name[charge_obj.charge_name.strip().lower()] = plan

    for fee_charge_id, plan in existing.items():
        if fee_charge_id not in charge_ids:
            plan.is_enabled = False
            plan_by_id[fee_charge_id] = plan

    # 2. Immediately synchronize updated concessions/rates to active UNPAID fee records
    unpaid_fees = db.query(Fee).filter(
        Fee.student_id == student_id,
        Fee.status != "paid",
        (Fee.paid_amount == 0) | (Fee.paid_amount.is_(None)),
    ).all()

    for fee in unpaid_fees:
        p = plan_by_id.get(fee.fee_charge_id)
        if not p and fee.fee_charge_id:
            fc = db.query(FeeCharge).filter(FeeCharge.id == fee.fee_charge_id).first()
            if fc and fc.charge_name:
                p = plan_by_name.get(fc.charge_name.strip().lower())

        if p is not None:
            if not p.is_enabled:
                # Fee category opted out / waived completely for this student
                db.delete(fee)
            else:
                new_amt = round(max(0.0, float(p.amount)), 2)
                fee.amount = new_amt
                std_charge = charges_map.get(p.fee_charge_id)
                if std_charge and std_charge.amount > 0 and new_amt < std_charge.amount:
                    disc_pct = round(((std_charge.amount - new_amt) / std_charge.amount) * 100)
                    fee.remarks = f"{disc_pct}% Approved Concession"
                elif std_charge and new_amt == std_charge.amount and fee.remarks and "Concession" in fee.remarks:
                    fee.remarks = ""

    db.commit()
    return db.query(StudentFeePlan).filter(
        StudentFeePlan.student_id == student_id,
        StudentFeePlan.academic_year_id == academic_year_id,
    ).all()


@router.put("/fee-charges/{charge_id}", response_model=FeeChargeOut)
def update_fee_charge(
    charge_id: int,
    payload: FeeChargeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    charge = _get_fee_charge(db, charge_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(charge, field, value.strip() if field == "charge_name" else value)
    db.commit()
    db.refresh(charge)
    return charge


@router.delete("/fee-charges/{charge_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_fee_charge(
    charge_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    charge = _get_fee_charge(db, charge_id)
    charge.is_active = False
    db.commit()


@router.get("/fees", response_model=dict)
def list_fees(
    class_id: Optional[int] = Query(None),
    student_id: Optional[str] = Query(None),
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("fees", "read")),
):
    query = db.query(Fee, Student, Class, FeeCharge).join(
        Student, Fee.student_id == Student.id
    ).join(
        Class, Student.class_id == Class.id
    ).join(
        FeeCharge, Fee.fee_charge_id == FeeCharge.id
    )
    if class_id is not None:
        query = query.filter(Student.class_id == class_id)
    if student_id is not None:
        query = query.filter(Fee.student_id == student_id)
    if month is not None:
        query = query.filter(Fee.month == month)
    if year is not None:
        query = query.filter(Fee.year == year)
    if status_filter:
        query = query.filter(Fee.status == status_filter)
    items = [_fee_out(fee, student, class_obj, charge) for fee, student, class_obj, charge in query.order_by(Fee.due_date.desc()).all()]
    return {"total": len(items), "items": items}


@router.post("/fee-generation/chalans", response_model=ChalanGenerationResponse)
def generate_chalans(
    payload: ChalanGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "accountant")),
):
    class_obj = db.query(Class).filter(Class.id == payload.class_id, Class.is_active.is_(True)).first()
    if class_obj is None:
        raise HTTPException(status_code=404, detail="Active class not found")
    charges = db.query(FeeCharge).filter(
        FeeCharge.class_id == payload.class_id,
        FeeCharge.academic_year_id == payload.academic_year_id,
        FeeCharge.is_active.is_(True),
    ).all()
    students = db.query(Student).filter(
        Student.class_id == payload.class_id,
        Student.academic_year_id == payload.academic_year_id,
        Student.is_active.is_(True),
    ).all()
    due_date = payload.due_date or date(payload.year, payload.month, min(10, monthrange(payload.year, payload.month)[1]))
    created = existing = skipped = 0
    for student in students:
        student_plans = _get_student_fee_plans(db, student.id, payload.academic_year_id)
        for charge in charges:
            plan = student_plans.get(charge.id)
            if plan is not None and not plan.is_enabled:
                skipped += 1
                continue
            if not _charge_applies(charge, payload.month):
                skipped += 1
                continue
            if charge.charge_type in {"yearly", "one-time"}:
                annual_fee_exists = db.query(Fee.id).filter(
                    Fee.student_id == student.id,
                    Fee.fee_charge_id == charge.id,
                ).first()
                if annual_fee_exists:
                    existing += 1
                    continue
            fee = db.query(Fee).filter(
                Fee.student_id == student.id,
                Fee.fee_charge_id == charge.id,
                Fee.month == payload.month,
                Fee.year == payload.year,
            ).first()
            if fee:
                existing += 1
                continue
            base_amount = plan.amount if plan is not None else charge.amount
            disc_pct = getattr(student, "discount_percentage", 0.0) or 0.0
            if disc_pct > 0 and charge.charge_type == "monthly":
                final_amount = round(base_amount * (1.0 - (disc_pct / 100.0)), 2)
            else:
                final_amount = base_amount

            db.add(Fee(
                student_id=student.id,
                fee_charge_id=charge.id,
                month=payload.month,
                year=payload.year,
                due_date=due_date,
                amount=final_amount,
                status="pending",
                paid_amount=0,
                created_by=current_user.id,
            ))
            created += 1
    db.commit()
    return ChalanGenerationResponse(
        created=created,
        existing=existing,
        skipped=skipped,
        total_students=len(students),
        total_charges=len(charges),
    )


@router.put("/fees/chalan", response_model=ChalanActionResponse)
def update_chalan(
    payload: ChalanUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "accountant")),
):
    """
    Update, add, or remove line items for a student's specific monthly fee challan.
    Allows ad-hoc charges (books, stationary, uniforms) and custom discounts.
    Strictly prohibited if payment has already been recorded.
    """
    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    existing_fees = db.query(Fee).filter(
        Fee.student_id == payload.student_id,
        Fee.month == payload.month,
        Fee.year == payload.year,
    ).all()

    # Safety check: Cannot modify if any payment has been collected
    paid_total = sum(float(f.paid_amount or 0) for f in existing_fees)
    if paid_total > 0 or any((f.paid_amount or 0) > 0 for f in existing_fees):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot edit challan because payment (Rs. {paid_total:,.0f}) has already been recorded. Deleting or modifying paid records is prohibited.",
        )

    fallback_day = min(10, monthrange(payload.year, payload.month)[1])
    fallback_due = date(payload.year, payload.month, fallback_day)
    target_due = payload.due_date or (existing_fees[0].due_date if existing_fees else fallback_due)

    existing_by_id = {f.id: f for f in existing_fees}
    existing_by_charge = {f.fee_charge_id: f for f in existing_fees}
    keep_fee_ids = set()
    updated_items = 0

    for item in payload.items:
        amt = round(max(0.0, float(item.amount)), 2)
        # 1. Existing record matched by fee_id
        if item.fee_id and item.fee_id in existing_by_id:
            fee_rec = existing_by_id[item.fee_id]
            fee_rec.amount = amt
            fee_rec.due_date = target_due
            if item.remarks is not None:
                fee_rec.remarks = item.remarks
            keep_fee_ids.add(fee_rec.id)
            updated_items += 1
        # 2. Existing record matched by charge_id
        elif item.fee_charge_id and item.fee_charge_id in existing_by_charge:
            fee_rec = existing_by_charge[item.fee_charge_id]
            fee_rec.amount = amt
            fee_rec.due_date = target_due
            if item.remarks is not None:
                fee_rec.remarks = item.remarks
            keep_fee_ids.add(fee_rec.id)
            updated_items += 1
        # 3. New charge line item added to this student's challan (e.g. stationary, books, etc.)
        else:
            charge = None
            if item.fee_charge_id:
                charge = db.query(FeeCharge).filter(FeeCharge.id == item.fee_charge_id).first()
            if not charge and item.charge_name and item.charge_name.strip():
                clean_name = item.charge_name.strip()
                # Find matching charge or create a dedicated one-time charge for this class
                charge = db.query(FeeCharge).filter(
                    FeeCharge.class_id == student.class_id,
                    FeeCharge.charge_name.ilike(clean_name),
                    FeeCharge.is_active.is_(True),
                ).first()
                if not charge:
                    ay_id = student.academic_year_id or (existing_fees[0].fee_charge.academic_year_id if existing_fees else 1)
                    charge = FeeCharge(
                        class_id=student.class_id,
                        academic_year_id=ay_id,
                        charge_name=clean_name,
                        amount=amt,
                        charge_type="one-time",
                        is_mandatory=False,
                        is_active=True,
                    )
                    db.add(charge)
                    db.flush()

            if not charge:
                continue

            # Check if record for this charge already exists in existing_fees
            existing_for_charge = next((f for f in existing_fees if f.fee_charge_id == charge.id), None)
            if existing_for_charge:
                existing_for_charge.amount = amt
                existing_for_charge.due_date = target_due
                if item.remarks is not None:
                    existing_for_charge.remarks = item.remarks
                keep_fee_ids.add(existing_for_charge.id)
                updated_items += 1
            else:
                new_fee = Fee(
                    student_id=payload.student_id,
                    fee_charge_id=charge.id,
                    month=payload.month,
                    year=payload.year,
                    due_date=target_due,
                    amount=amt,
                    status="pending",
                    paid_amount=0.0,
                    remarks=item.remarks,
                    created_by=current_user.id,
                )
                db.add(new_fee)
                db.flush()
                keep_fee_ids.add(new_fee.id)
                updated_items += 1

    # Remove line items removed in the modal
    for f in existing_fees:
        if f.id not in keep_fee_ids:
            db.delete(f)

    db.commit()

    create_audit_log(
        db,
        user_id=current_user.id,
        action="UPDATE_CHALAN",
        table_name="fees",
        record_id=payload.student_id,
        new_values=json.dumps({"month": payload.month, "year": payload.year, "items_count": len(payload.items)}),
    )

    return ChalanActionResponse(
        success=True,
        message=f"Challan for {student.name} ({payload.month}/{payload.year}) updated successfully.",
        updated_items=updated_items,
    )


@router.delete("/fees/chalan", response_model=ChalanActionResponse)
def delete_chalan(
    student_id: str = Query(..., description="Student ID"),
    month: int = Query(..., ge=1, le=12, description="Billing Month"),
    year: int = Query(..., ge=2000, le=2100, description="Billing Year"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "accountant")),
):
    """
    Delete or void an unpaid fee challan for a student.
    Strictly prohibited if payment has already been collected.
    """
    fees = db.query(Fee).filter(
        Fee.student_id == student_id,
        Fee.month == month,
        Fee.year == year,
    ).all()
    if not fees:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No challan found for this student and billing period.",
        )

    paid_total = sum(float(f.paid_amount or 0) for f in fees)
    if paid_total > 0 or any((f.paid_amount or 0) > 0 for f in fees):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete challan because payment (Rs. {paid_total:,.0f}) has already been collected. Deleting paid records is prohibited.",
        )

    count = len(fees)
    for f in fees:
        db.delete(f)
    db.commit()

    create_audit_log(
        db,
        user_id=current_user.id,
        action="DELETE_CHALAN",
        table_name="fees",
        record_id=student_id,
        new_values=json.dumps({"month": month, "year": year, "deleted_count": count}),
    )

    return ChalanActionResponse(
        success=True,
        message=f"Challan for month {month}/{year} ({count} line items) deleted successfully.",
        updated_items=count,
    )


@router.get("/fees/student/{student_id}", response_model=list[FeeOut])
def list_student_fees(
    student_id: str,
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("fees", "read")),
):
    result = list_fees(student_id=student_id, month=month, year=year, db=db, current_user=current_user)
    return result["items"]


@router.post("/fees/{fee_id}/pay", response_model=FeeOut)
def record_fee_payment(
    fee_id: int,
    payload: FeePaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "accountant")),
):
    row = db.query(Fee, Student, Class, FeeCharge).join(
        Student, Fee.student_id == Student.id
    ).join(
        Class, Student.class_id == Class.id
    ).join(
        FeeCharge, Fee.fee_charge_id == FeeCharge.id
    ).filter(Fee.id == fee_id).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Fee chalan not found")
    fee, student, class_obj, charge = row
    remaining = fee.amount - (fee.paid_amount or 0)
    if payload.paid_amount > remaining:
        raise HTTPException(status_code=400, detail=f"Payment cannot exceed the remaining balance of {remaining:.2f}")
    fee.paid_amount = (fee.paid_amount or 0) + payload.paid_amount
    fee.paid_date = payload.paid_date or date.today()
    fee.payment_method = payload.payment_method
    fee.transaction_id = payload.transaction_id
    fee.remarks = payload.remarks
    fee.status = "paid" if fee.paid_amount >= fee.amount else "partial"
    db.commit()
    db.refresh(fee)
    return _fee_out(fee, student, class_obj, charge)


@router.get("/fees/{fee_id}/receipt")
def get_fee_receipt(
    fee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("fees", "read")),
):
    row = db.query(Fee, Student, Class, FeeCharge).join(
        Student, Fee.student_id == Student.id
    ).join(
        Class, Student.class_id == Class.id
    ).join(
        FeeCharge, Fee.fee_charge_id == FeeCharge.id
    ).filter(Fee.id == fee_id).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Fee chalan not found")
    fee, student, class_obj, charge = row
    receipt = generate_fee_receipt(fee, student, class_obj, charge)
    return Response(
        content=receipt.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="fee-receipt-{fee.id}.pdf"'},
    )

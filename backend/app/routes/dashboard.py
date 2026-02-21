"""Dashboard API routes."""

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Policy, Rule, ScanState, Violation

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _violation_to_summary_item(v: Violation) -> dict:
    """Serialize a violation for recent_violations list."""
    return {
        "id": v.id,
        "rule_id": v.rule_id,
        "record_id": v.record_id,
        "status": v.status,
        "severity": v.rule.severity if v.rule else None,
        "explanation": (v.explanation[:200] + "…") if v.explanation and len(v.explanation) > 200 else (v.explanation or ""),
        "detected_at": v.detected_at.isoformat() if v.detected_at else None,
    }


@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)) -> dict:
    """
    Return dashboard summary: policy/rule/violation counts, pending and high-severity counts,
    and the last 5 violations.
    """
    total_policies = db.query(func.count(Policy.id)).scalar() or 0
    total_rules = db.query(func.count(Rule.id)).scalar() or 0
    total_violations = db.query(func.count(Violation.id)).scalar() or 0
    pending_violations = (
        db.query(func.count(Violation.id)).filter(Violation.status == "pending").scalar() or 0
    )
    high_severity = (
        db.query(func.count(Violation.id))
        .join(Rule, Violation.rule_id == Rule.id)
        .filter(func.lower(Rule.severity) == "high")
        .scalar()
        or 0
    )
    recent = (
        db.query(Violation)
        .join(Rule, Violation.rule_id == Rule.id)
        .order_by(Violation.detected_at.desc(), Violation.id.desc())
        .limit(5)
        .all()
    )
    recent_violations = [_violation_to_summary_item(v) for v in recent]

    scan_state = db.query(ScanState).first()
    last_scan_timestamp = (
        scan_state.last_scan_timestamp.isoformat()
        if scan_state and scan_state.last_scan_timestamp
        else None
    )
    last_scan_status = scan_state.last_scan_status if scan_state else None
    total_violations_found = (
        scan_state.total_violations_found if scan_state else 0
    )
    scan_duration_seconds = (
        scan_state.scan_duration_seconds if scan_state else None
    )
    last_scan_created_at = (
        scan_state.created_at.isoformat()
        if scan_state and scan_state.created_at
        else None
    )

    return {
        "total_policies": total_policies,
        "total_rules": total_rules,
        "total_violations": total_violations,
        "pending_violations": pending_violations,
        "high_severity": high_severity,
        "recent_violations": recent_violations,
        "last_scan_timestamp": last_scan_timestamp,
        "last_scan_status": last_scan_status,
        "total_violations_found": total_violations_found,
        "scan_duration_seconds": scan_duration_seconds,
        "last_scan_created_at": last_scan_created_at,
    }

from fastapi import APIRouter, Query
from typing import Optional
from app.services.db_service import DBService

router = APIRouter()


@router.get("/reports")
async def list_reports(
    status: str = Query("verified"),
    state: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    damage_type: Optional[str] = Query(None),
    min_lat: Optional[float] = Query(None),
    max_lat: Optional[float] = Query(None),
    min_lng: Optional[float] = Query(None),
    max_lng: Optional[float] = Query(None),
    limit: int = Query(500, le=1000),
    offset: int = Query(0),
):
    db = DBService()
    reports = db.get_reports(
        status=status,
        state=state,
        severity=severity,
        damage_type=damage_type,
        min_lat=min_lat,
        max_lat=max_lat,
        min_lng=min_lng,
        max_lng=max_lng,
        limit=limit,
        offset=offset,
    )
    return {"reports": reports, "count": len(reports)}


@router.get("/reports/{report_id}")
async def get_report(report_id: str):
    db = DBService()
    report = db.get_report_by_id(report_id)
    if not report:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Report not found")
    return report

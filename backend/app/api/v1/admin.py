from fastapi import APIRouter, Depends
from app.core.security import verify_admin_token
from app.services.db_service import DBService
from app.models.report import AdminUpdateReport

router = APIRouter()


@router.get("/admin/reports/pending", dependencies=[Depends(verify_admin_token)])
async def get_pending():
    db = DBService()
    return {"reports": db.get_pending_reports()}


@router.patch("/admin/reports/{report_id}", dependencies=[Depends(verify_admin_token)])
async def update_report(report_id: str, body: AdminUpdateReport):
    db = DBService()
    updated = db.update_report_status(report_id, body.status, body.admin_notes)
    return {"success": True, "report": updated}

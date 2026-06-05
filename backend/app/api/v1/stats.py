from fastapi import APIRouter
from app.services.db_service import DBService

router = APIRouter()


@router.get("/stats/summary")
async def summary_stats():
    db = DBService()
    return db.get_summary_stats()


@router.get("/stats/by-state")
async def stats_by_state():
    db = DBService()
    return {"data": db.get_stats_by_state()}


@router.get("/stats/by-type")
async def stats_by_type():
    db = DBService()
    return {"data": db.get_stats_by_type()}


@router.get("/stats/recent")
async def recent_reports():
    db = DBService()
    return {"data": db.get_recent_reports(limit=10)}

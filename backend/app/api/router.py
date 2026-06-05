from fastapi import APIRouter
from app.api.v1 import upload, reports, route, stats, admin

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(upload.router, tags=["Upload"])
api_router.include_router(reports.router, tags=["Reports"])
api_router.include_router(route.router, tags=["Routing"])
api_router.include_router(stats.router, tags=["Statistics"])
api_router.include_router(admin.router, tags=["Admin"])

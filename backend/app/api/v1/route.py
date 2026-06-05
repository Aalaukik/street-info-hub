from fastapi import APIRouter, HTTPException
from app.models.route import RoutePlanRequest, RoutePlanResponse
from app.services.routing_service import RoutingService
from app.services.db_service import DBService

router = APIRouter()


@router.post("/route/plan")
async def plan_route(body: RoutePlanRequest):
    """
    Plan a route from origin to destination.
    Returns multiple route options scored by road quality.
    """
    db = DBService()
    # Fetch all verified damage reports (for overlay)
    # We pass all reports and let the routing service filter by proximity
    all_reports = db.get_reports(status="verified", limit=1000)

    routing = RoutingService()
    try:
        result = await routing.plan_route(
            origin=body.origin,
            destination=body.destination,
            damage_reports=all_reports,
            mode=body.mode,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Routing service error: {str(e)}")

    return result

from pydantic import BaseModel
from typing import Optional, List


class RoutePlanRequest(BaseModel):
    origin: str
    destination: str
    mode: str = "driving-car"


class DamageWarning(BaseModel):
    report_id: str
    latitude: float
    longitude: float
    damage_types: List[str]
    severity: str
    distance_from_start_km: float


class RouteOption(BaseModel):
    route_id: str
    summary: str
    distance_km: float
    duration_min: float
    road_quality_score: int        # 0 (terrible) – 100 (perfect)
    recommendation_tag: str        # "fastest" | "safest" | "balanced"
    damage_count: int
    damage_warnings: List[DamageWarning]
    geometry: dict                 # GeoJSON LineString


class RoutePlanResponse(BaseModel):
    origin_coords: dict
    destination_coords: dict
    routes: List[RouteOption]

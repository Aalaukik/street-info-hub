"""
Routing service — calls OpenRouteService, then overlays road damage reports.
"""
import httpx
import math
import logging
from app.core.config import get_settings
from app.services.geocoding_service import forward_geocode

logger = logging.getLogger(__name__)
ORS_BASE = "https://api.openrouteservice.org"


class RoutingService:
    def __init__(self):
        self.settings = get_settings()

    async def plan_route(
        self,
        origin: str,
        destination: str,
        damage_reports: list[dict],
        mode: str = "driving-car",
    ) -> dict:
        # Geocode origin + destination
        origin_coords = await forward_geocode(origin)
        dest_coords = await forward_geocode(destination)

        if not origin_coords:
            raise ValueError(f"Could not find location: '{origin}'")
        if not dest_coords:
            raise ValueError(f"Could not find location: '{destination}'")

        # Fetch routes from ORS
        routes_raw = await self._fetch_ors_routes(
            [origin_coords["lng"], origin_coords["lat"]],
            [dest_coords["lng"], dest_coords["lat"]],
            mode,
        )

        # Build enriched route options
        route_options = []
        for i, route in enumerate(routes_raw):
            coords = route["geometry"]["coordinates"]
            distance_km = route["summary"]["distance"] / 1000
            duration_min = route["summary"]["duration"] / 60

            # Find damage reports near this route
            nearby = self._find_damage_near_route(coords, damage_reports, buffer_km=0.5)

            # Compute road quality score
            rqs = self._road_quality_score(nearby, distance_km)

            # Determine tag
            tag = self._tag_route(i, routes_raw, nearby)

            route_options.append(
                {
                    "route_id": f"r{i+1}",
                    "summary": route.get("summary_text", f"Route {i+1}"),
                    "distance_km": round(distance_km, 2),
                    "duration_min": round(duration_min, 1),
                    "road_quality_score": rqs,
                    "recommendation_tag": tag,
                    "damage_count": len(nearby),
                    "damage_warnings": nearby,
                    "geometry": route["geometry"],
                }
            )

        return {
            "origin_coords": {"lat": origin_coords["lat"], "lng": origin_coords["lng"]},
            "destination_coords": {"lat": dest_coords["lat"], "lng": dest_coords["lng"]},
            "routes": route_options,
        }

    async def _fetch_ors_routes(
        self, origin: list, destination: list, mode: str
    ) -> list[dict]:
        headers = {
            "Authorization": self.settings.ors_api_key,
            "Content-Type": "application/json",
        }
        body = {
            "coordinates": [origin, destination],
            "alternative_routes": {"share_factor": 0.6, "target_count": 3},
            "geometry": True,
            "instructions": False,
        }

        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                f"{ORS_BASE}/v2/directions/{mode}",
                json=body,
                headers=headers,
            )

        if resp.status_code != 200:
            logger.error(f"ORS error {resp.status_code}: {resp.text[:300]}")
            raise ValueError("Routing service unavailable. Please try again.")

        data = resp.json()
        routes = data.get("routes", [])
        if not routes:
            raise ValueError("No routes found between the two locations.")
        return routes

    def _find_damage_near_route(
        self,
        route_coords: list,
        damage_reports: list[dict],
        buffer_km: float = 0.5,
    ) -> list[dict]:
        """Simple Haversine check for each damage report against route line."""
        warnings = []
        for report in damage_reports:
            r_lat, r_lng = report["latitude"], report["longitude"]
            min_dist = min(
                _haversine(r_lat, r_lng, c[1], c[0]) for c in route_coords[::5]
            )
            if min_dist <= buffer_km:
                # Estimate distance from route start
                dist_from_start = self._route_dist_to_point(
                    route_coords, r_lat, r_lng
                )
                warnings.append(
                    {
                        "report_id": report["id"],
                        "latitude": r_lat,
                        "longitude": r_lng,
                        "damage_types": report.get("damage_types", []),
                        "severity": report.get("severity", "minor"),
                        "distance_from_start_km": round(dist_from_start, 2),
                    }
                )
        # Sort by distance along route
        warnings.sort(key=lambda x: x["distance_from_start_km"])
        return warnings

    def _route_dist_to_point(
        self, route_coords: list, lat: float, lng: float
    ) -> float:
        """Approximate cumulative distance to the nearest route point."""
        best_i = 0
        best_d = float("inf")
        for i, c in enumerate(route_coords):
            d = _haversine(lat, lng, c[1], c[0])
            if d < best_d:
                best_d = d
                best_i = i

        # Sum segments up to best_i
        total = 0.0
        for j in range(best_i):
            total += _haversine(
                route_coords[j][1], route_coords[j][0],
                route_coords[j + 1][1], route_coords[j + 1][0],
            )
        return total

    @staticmethod
    def _road_quality_score(warnings: list[dict], distance_km: float) -> int:
        if distance_km < 0.1:
            return 100
        penalty = 0
        for w in warnings:
            sev = w.get("severity", "minor")
            if sev == "severe":
                penalty += 15
            elif sev == "moderate":
                penalty += 8
            else:
                penalty += 3
        # Normalise by distance — 100km route can afford more damage
        density_penalty = int(penalty * (10 / max(distance_km, 1)))
        return max(0, 100 - density_penalty)

    @staticmethod
    def _tag_route(
        index: int, all_routes: list, warnings: list
    ) -> str:
        if len(all_routes) == 1:
            return "recommended"
        durations = [r["summary"]["duration"] for r in all_routes]
        if all_routes[index]["summary"]["duration"] == min(durations):
            return "fastest"
        if len(warnings) == 0 or (
            index > 0 and len(warnings) <= 1
        ):
            return "safest"
        return "balanced"


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Returns distance in km."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

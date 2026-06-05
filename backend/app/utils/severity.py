"""Severity scoring helpers shared by AI service and route planner."""

SEVERITY_PENALTY = {"minor": 3, "moderate": 8, "severe": 15}


def compute_road_quality_score(damage_reports: list[dict], route_distance_km: float) -> int:
    """
    Compute a 0-100 road quality score for a route.
    Lower damage density → higher score.
    """
    if route_distance_km < 0.1:
        return 100

    penalty = sum(SEVERITY_PENALTY.get(r.get("severity", "minor"), 3) for r in damage_reports)
    # Scale penalty relative to route length (longer routes can tolerate more damage)
    density_penalty = int(penalty * (10 / max(route_distance_km, 1)))
    return max(0, 100 - density_penalty)


def severity_from_score(score: int) -> str:
    if score >= 75:
        return "minor"
    if score >= 40:
        return "moderate"
    return "severe"


SEVERITY_LABELS = {"minor": "Minor", "moderate": "Moderate", "severe": "Severe"}
SEVERITY_ORDER  = {"minor": 0, "moderate": 1, "severe": 2}


def max_severity(severities: list[str]) -> str:
    """Return the most severe level from a list."""
    if not severities:
        return "minor"
    return max(severities, key=lambda s: SEVERITY_ORDER.get(s, 0))

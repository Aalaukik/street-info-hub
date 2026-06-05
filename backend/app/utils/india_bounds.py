from app.core.config import get_settings

settings = get_settings()


def is_in_india(lat: float, lng: float) -> bool:
    return (
        settings.india_min_lat <= lat <= settings.india_max_lat
        and settings.india_min_lng <= lng <= settings.india_max_lng
    )


def validate_india_coords(lat: float, lng: float) -> None:
    if not is_in_india(lat, lng):
        raise ValueError(
            "Coordinates are outside India. "
            "Street Info Hub only covers Indian roads."
        )


INDIA_CENTER = {"lat": 20.5937, "lng": 78.9629}
INDIA_BOUNDS = {
    "min_lat": settings.india_min_lat,
    "max_lat": settings.india_max_lat,
    "min_lng": settings.india_min_lng,
    "max_lng": settings.india_max_lng,
}

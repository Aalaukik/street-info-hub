"""
Geocoding service — uses Nominatim (OpenStreetMap) for reverse geocoding.
Rate limit: 1 request/second — we cache results in memory.
"""
import httpx
import asyncio
import logging
from functools import lru_cache

logger = logging.getLogger(__name__)

NOMINATIM_URL = "https://nominatim.openstreetmap.org"
HEADERS = {"User-Agent": "StreetInfoHub/1.0 (road-damage-detection)"}

_last_request_time = 0.0


async def reverse_geocode(lat: float, lng: float) -> dict:
    """
    Returns dict with keys: address, state, city, country
    """
    global _last_request_time
    import time

    # Respect 1 req/sec rate limit
    elapsed = time.time() - _last_request_time
    if elapsed < 1.1:
        await asyncio.sleep(1.1 - elapsed)

    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=10) as client:
            resp = await client.get(
                f"{NOMINATIM_URL}/reverse",
                params={
                    "lat": lat,
                    "lon": lng,
                    "format": "jsonv2",
                    "zoom": 16,
                    "addressdetails": 1,
                },
            )
            _last_request_time = time.time()
            data = resp.json()
    except Exception as e:
        logger.warning(f"Geocoding failed for ({lat},{lng}): {e}")
        return {"address": None, "state": None, "city": None}

    addr = data.get("address", {})
    city = (
        addr.get("city")
        or addr.get("town")
        or addr.get("village")
        or addr.get("suburb")
    )
    state = addr.get("state")
    display = data.get("display_name", "")

    return {
        "address": display,
        "state": state,
        "city": city,
        "country": addr.get("country"),
    }


async def forward_geocode(query: str) -> dict | None:
    """
    Returns dict with lat, lng, display_name or None if not found.
    Restricts search to India (countrycodes=in).
    """
    global _last_request_time
    import time

    elapsed = time.time() - _last_request_time
    if elapsed < 1.1:
        await asyncio.sleep(1.1 - elapsed)

    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=10) as client:
            resp = await client.get(
                f"{NOMINATIM_URL}/search",
                params={
                    "q": query,
                    "format": "jsonv2",
                    "limit": 1,
                    "countrycodes": "in",
                },
            )
            _last_request_time = time.time()
            results = resp.json()
    except Exception as e:
        logger.warning(f"Forward geocoding failed for '{query}': {e}")
        return None

    if not results:
        return None

    r = results[0]
    return {
        "lat": float(r["lat"]),
        "lng": float(r["lon"]),
        "display_name": r.get("display_name", query),
    }

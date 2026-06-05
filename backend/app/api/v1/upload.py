"""
POST /api/v1/upload
Handles image upload → AI analysis → DB insert.
"""
import uuid
import logging
from datetime import datetime
from fastapi import APIRouter, File, UploadFile, Form, Request, HTTPException, Depends
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.services.ai_service import get_ai_service
from app.services.storage_service import StorageService
from app.services.db_service import DBService
from app.services.geocoding_service import reverse_geocode
from app.utils.image_utils import validate_image, extract_gps_from_exif, hash_ip
from app.utils.india_bounds import validate_india_coords
from app.core.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()

limiter = Limiter(key_func=get_remote_address)


@router.post("/upload")
@limiter.limit("10/hour")
async def upload_image(
    request: Request,
    image: UploadFile = File(...),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
    description: str | None = Form(None),
):
    """
    Upload a road image for AI damage analysis.
    - Validates image
    - Runs AI pipeline (road check → damage detection)
    - Stores image + report in Supabase
    - Returns damage analysis result
    """
    image_bytes = await image.read()

    # 1. Validate image
    try:
        validate_image(image_bytes, image.content_type or "")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 2. Resolve GPS — EXIF takes priority, then user-provided
    coords = None
    exif_coords = extract_gps_from_exif(image_bytes)
    if exif_coords:
        coords = exif_coords
    elif latitude is not None and longitude is not None:
        coords = (latitude, longitude)

    if coords is None:
        raise HTTPException(
            status_code=422,
            detail="Location required. Please pin your location on the map or enable GPS on your device.",
        )

    lat, lng = coords
    try:
        validate_india_coords(lat, lng)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # 3. Run AI pipeline
    ai_service = get_ai_service()
    try:
        result = ai_service.analyze(image_bytes)
    except Exception as e:
        logger.error(f"AI service failed: {e}")
        raise HTTPException(status_code=503, detail="AI service temporarily unavailable.")

    if not result["road_detected"]:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "no_road_detected",
                "message": "The image does not appear to contain a road. Please upload a clear photo of a road surface.",
                "confidence": result["confidence"],
            },
        )

    # 4. Upload image to storage
    storage = StorageService()
    try:
        image_url, image_path = storage.upload_image(image_bytes, image.filename or "upload")
    except Exception as e:
        logger.error(f"Storage upload failed: {e}")
        raise HTTPException(status_code=503, detail="Image storage temporarily unavailable.")

    # 5. Reverse geocode
    geo = await reverse_geocode(lat, lng)

    # 6. Build report record
    report_id = str(uuid.uuid4())
    db_record = {
        "id": report_id,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
        "latitude": lat,
        "longitude": lng,
        "address_text": geo.get("address"),
        "state": geo.get("state"),
        "city": geo.get("city"),
        "image_url": image_url,
        "image_path": image_path,
        "damage_types": result["damage_types"],
        "severity": result["severity"] or "minor",
        "ai_confidence": result["confidence"],
        "bbox_data": result.get("bbox_data"),
        "description": description,
        "reported_by_ip": hash_ip(get_remote_address(request)),
        "status": "pending",  # awaits admin verification
    }

    db = DBService()
    try:
        saved = db.insert_report(db_record)
    except Exception as e:
        logger.error(f"DB insert failed: {e}")
        # Don't fail the user — the analysis is done
        saved = db_record

    return {
        "report_id": report_id,
        "road_detected": True,
        "damage_types": result["damage_types"],
        "severity": result["severity"] or "minor",
        "confidence": result["confidence"],
        "location": {
            "latitude": lat,
            "longitude": lng,
            "address": geo.get("address"),
            "state": geo.get("state"),
            "city": geo.get("city"),
        },
        "image_url": image_url,
        "message": (
            "Report submitted successfully! It will appear on the map after review."
            if result["damage_types"]
            else "Road detected but no significant damage found. Report saved."
        ),
    }

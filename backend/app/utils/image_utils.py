"""Utility functions for image processing and EXIF extraction."""
import io
import hashlib
import logging
from PIL import Image, ExifTags
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE_BYTES = settings.max_image_size_mb * 1024 * 1024


def validate_image(file_bytes: bytes, content_type: str) -> None:
    """Raise ValueError if image is invalid."""
    if len(file_bytes) > MAX_SIZE_BYTES:
        raise ValueError(
            f"Image too large. Maximum size is {settings.max_image_size_mb}MB."
        )
    # Validate actual content type via Pillow (not just header claim)
    try:
        img = Image.open(io.BytesIO(file_bytes))
        img.verify()
    except Exception:
        raise ValueError("File is not a valid image.")


def extract_gps_from_exif(file_bytes: bytes) -> tuple[float, float] | None:
    """
    Returns (latitude, longitude) from EXIF GPS tags, or None.
    """
    try:
        img = Image.open(io.BytesIO(file_bytes))
        exif_data = img._getexif()
        if not exif_data:
            return None

        exif = {ExifTags.TAGS.get(k, k): v for k, v in exif_data.items()}
        gps_info = exif.get("GPSInfo")
        if not gps_info:
            return None

        gps_tags = {ExifTags.GPSTAGS.get(k, k): v for k, v in gps_info.items()}

        def to_degrees(dms) -> float:
            d, m, s = dms
            return float(d) + float(m) / 60 + float(s) / 3600

        lat_dms = gps_tags.get("GPSLatitude")
        lat_ref = gps_tags.get("GPSLatitudeRef", "N")
        lng_dms = gps_tags.get("GPSLongitude")
        lng_ref = gps_tags.get("GPSLongitudeRef", "E")

        if not lat_dms or not lng_dms:
            return None

        lat = to_degrees(lat_dms)
        lng = to_degrees(lng_dms)

        if lat_ref == "S":
            lat = -lat
        if lng_ref == "W":
            lng = -lng

        return lat, lng
    except Exception as e:
        logger.debug(f"EXIF extraction failed: {e}")
        return None


def hash_ip(ip: str) -> str:
    """One-way hash for IP (privacy)."""
    return hashlib.sha256(ip.encode()).hexdigest()[:16]

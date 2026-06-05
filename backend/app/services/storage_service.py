"""
Storage service — uploads images to Supabase Storage bucket 'road-images'.
"""
import uuid
import logging
from io import BytesIO
from PIL import Image
from supabase import Client
from app.services.db_service import get_supabase

logger = logging.getLogger(__name__)

BUCKET = "road-images"
MAX_DIMENSION = 1280   # Downsample to save storage quota


def _compress_image(image_bytes: bytes) -> tuple[bytes, str]:
    """Resize to max 1280px and convert to JPEG."""
    img = Image.open(BytesIO(image_bytes)).convert("RGB")
    w, h = img.size
    if max(w, h) > MAX_DIMENSION:
        ratio = MAX_DIMENSION / max(w, h)
        img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=85, optimize=True)
    return buf.getvalue(), "image/jpeg"


class StorageService:
    def __init__(self):
        self.sb: Client = get_supabase()

    def upload_image(self, image_bytes: bytes, original_filename: str = "upload") -> tuple[str, str]:
        """
        Upload image to Supabase Storage.
        Returns (public_url, storage_path).
        """
        compressed, mime = _compress_image(image_bytes)
        ext = "jpg"
        file_path = f"reports/{uuid.uuid4()}.{ext}"

        self.sb.storage.from_(BUCKET).upload(
            file_path,
            compressed,
            {"content-type": mime, "upsert": "false"},
        )

        public_url = self.sb.storage.from_(BUCKET).get_public_url(file_path)
        logger.info(f"Uploaded image to {file_path}")
        return public_url, file_path

    def delete_image(self, file_path: str) -> None:
        try:
            self.sb.storage.from_(BUCKET).remove([file_path])
        except Exception as e:
            logger.warning(f"Failed to delete {file_path}: {e}")

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_service_key: str

    # OpenRouteService
    ors_api_key: str

    # Admin
    admin_secret_token: str

    # App
    environment: str = "development"
    allowed_origins: str = "http://localhost:5173"

    # India bounding box
    india_min_lat: float = 6.5546
    india_max_lat: float = 35.6745
    india_min_lng: float = 68.1766
    india_max_lng: float = 97.4025

    # Upload limits
    max_image_size_mb: int = 10
    upload_rate_limit: str = "10/hour"

    # AI thresholds
    road_confidence_threshold: float = 0.55
    damage_confidence_threshold: float = 0.40

    class Config:
        env_file = ".env"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]


@lru_cache()
def get_settings() -> Settings:
    return Settings()

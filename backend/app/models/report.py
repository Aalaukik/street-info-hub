from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum
import uuid


class DamageType(str, Enum):
    POTHOLE = "pothole"
    LONGITUDINAL_CRACK = "longitudinal_crack"
    TRANSVERSE_CRACK = "transverse_crack"
    ALLIGATOR_CRACK = "alligator_crack"
    RUTTING = "rutting"
    EDGE_BREAK = "edge_break"
    UNKNOWN = "unknown"


class SeverityLevel(str, Enum):
    MINOR = "minor"
    MODERATE = "moderate"
    SEVERE = "severe"


class ReportStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    RESOLVED = "resolved"


class LocationData(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None


class BBoxData(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float
    confidence: float
    class_name: str


class DamageReport(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    latitude: float
    longitude: float
    address_text: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None

    image_url: str
    image_path: str

    damage_types: List[str]
    severity: SeverityLevel
    ai_confidence: float
    bbox_data: Optional[List[dict]] = None

    description: Optional[str] = None
    status: ReportStatus = ReportStatus.PENDING
    resolved_at: Optional[datetime] = None
    admin_notes: Optional[str] = None


class UploadResponse(BaseModel):
    report_id: str
    road_detected: bool
    damage_types: List[str]
    severity: str
    confidence: float
    location: LocationData
    image_url: str
    message: str


class ReportListItem(BaseModel):
    id: str
    created_at: datetime
    latitude: float
    longitude: float
    address_text: Optional[str]
    state: Optional[str]
    city: Optional[str]
    image_url: str
    damage_types: List[str]
    severity: str
    ai_confidence: float
    status: str
    description: Optional[str]


class ReportFilters(BaseModel):
    state: Optional[str] = None
    severity: Optional[str] = None
    damage_type: Optional[str] = None
    status: Optional[str] = "verified"
    min_lat: Optional[float] = None
    max_lat: Optional[float] = None
    min_lng: Optional[float] = None
    max_lng: Optional[float] = None
    limit: int = 500
    offset: int = 0


class AdminUpdateReport(BaseModel):
    status: ReportStatus
    admin_notes: Optional[str] = None

"""
Database service — wraps all Supabase PostGIS queries.
"""
import logging
from typing import Optional
from supabase import create_client, Client
from app.core.config import get_settings

logger = logging.getLogger(__name__)


def get_supabase() -> Client:
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_key)


class DBService:
    def __init__(self):
        self.sb = get_supabase()

    # ────────────────────────────────────────────
    # REPORTS
    # ────────────────────────────────────────────

    def insert_report(self, data: dict) -> dict:
        """Insert a new damage report."""
        # Build WKT for PostGIS geography column
        data["location"] = f"POINT({data['longitude']} {data['latitude']})"
        resp = self.sb.table("damage_reports").insert(data).execute()
        return resp.data[0]

    def get_reports(
        self,
        status: str = "verified",
        state: Optional[str] = None,
        severity: Optional[str] = None,
        damage_type: Optional[str] = None,
        min_lat: Optional[float] = None,
        max_lat: Optional[float] = None,
        min_lng: Optional[float] = None,
        max_lng: Optional[float] = None,
        limit: int = 500,
        offset: int = 0,
    ) -> list[dict]:
        query = (
            self.sb.table("damage_reports")
            .select(
                "id, created_at, latitude, longitude, address_text, "
                "state, city, image_url, damage_types, severity, "
                "ai_confidence, status, description"
            )
            .order("created_at", desc=True)
            .limit(limit)
            .offset(offset)
        )

        if status:
            query = query.eq("status", status)
        if state:
            query = query.eq("state", state)
        if severity:
            query = query.eq("severity", severity)
        if damage_type:
            query = query.contains("damage_types", [damage_type])
        if min_lat is not None:
            query = query.gte("latitude", min_lat)
        if max_lat is not None:
            query = query.lte("latitude", max_lat)
        if min_lng is not None:
            query = query.gte("longitude", min_lng)
        if max_lng is not None:
            query = query.lte("longitude", max_lng)

        resp = query.execute()
        return resp.data

    def get_report_by_id(self, report_id: str) -> Optional[dict]:
        resp = (
            self.sb.table("damage_reports")
            .select("*")
            .eq("id", report_id)
            .single()
            .execute()
        )
        return resp.data

    def update_report_status(
        self,
        report_id: str,
        status: str,
        admin_notes: Optional[str] = None,
    ) -> dict:
        update_data: dict = {"status": status}
        if admin_notes:
            update_data["admin_notes"] = admin_notes
        if status == "resolved":
            from datetime import datetime
            update_data["resolved_at"] = datetime.utcnow().isoformat()
        resp = (
            self.sb.table("damage_reports")
            .update(update_data)
            .eq("id", report_id)
            .execute()
        )
        return resp.data[0]

    def get_reports_near_route(
        self,
        geometry_wkt: str,
        buffer_meters: float = 500,
    ) -> list[dict]:
        """
        Find damage reports within `buffer_meters` of a route geometry.
        Uses PostGIS ST_DWithin via RPC.
        """
        resp = self.sb.rpc(
            "reports_near_route",
            {
                "route_wkt": geometry_wkt,
                "buffer_m": buffer_meters,
            },
        ).execute()
        return resp.data or []

    # ────────────────────────────────────────────
    # STATS
    # ────────────────────────────────────────────

    def get_summary_stats(self) -> dict:
        total_resp = (
            self.sb.table("damage_reports")
            .select("id", count="exact")
            .eq("status", "verified")
            .execute()
        )
        severe_resp = (
            self.sb.table("damage_reports")
            .select("id", count="exact")
            .eq("status", "verified")
            .eq("severity", "severe")
            .execute()
        )
        resolved_resp = (
            self.sb.table("damage_reports")
            .select("id", count="exact")
            .eq("status", "resolved")
            .execute()
        )
        return {
            "total_reports": total_resp.count or 0,
            "severe_reports": severe_resp.count or 0,
            "resolved_reports": resolved_resp.count or 0,
        }

    def get_stats_by_state(self) -> list[dict]:
        resp = self.sb.rpc("stats_by_state").execute()
        return resp.data or []

    def get_stats_by_type(self) -> list[dict]:
        resp = self.sb.rpc("stats_by_damage_type").execute()
        return resp.data or []

    def get_recent_reports(self, limit: int = 10) -> list[dict]:
        resp = (
            self.sb.table("damage_reports")
            .select(
                "id, created_at, address_text, state, city, "
                "damage_types, severity, image_url"
            )
            .eq("status", "verified")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return resp.data

    def get_pending_reports(self, limit: int = 50) -> list[dict]:
        resp = (
            self.sb.table("damage_reports")
            .select("*")
            .eq("status", "pending")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return resp.data

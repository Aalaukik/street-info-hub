"""Test configuration for Street Info Hub backend."""
import sys
import os

# Make sure the app module is importable from tests/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Provide minimal env vars so Settings doesn't crash during tests
os.environ.setdefault("SUPABASE_URL",          "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_KEY",  "test-service-key")
os.environ.setdefault("ORS_API_KEY",           "test-ors-key")
os.environ.setdefault("ADMIN_SECRET_TOKEN",    "test-admin-token")

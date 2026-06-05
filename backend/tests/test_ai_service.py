"""
tests/test_ai_service.py
Basic smoke tests for the AI service pipeline.
Run: pytest tests/ -v
"""
import pytest
import os
from pathlib import Path


def test_ai_service_loads():
    """AI service should load without crashing (mock mode if no models)."""
    from app.services.ai_service import get_ai_service
    ai = get_ai_service()
    assert ai is not None


def test_mock_result_structure():
    """Mock result must contain all expected keys."""
    from app.services.ai_service import AIService
    result = AIService._mock_result()
    assert "road_detected" in result
    assert "damage_types" in result
    assert "severity" in result
    assert "confidence" in result
    assert "bbox_data" in result
    assert isinstance(result["damage_types"], list)


def test_mock_analyze_returns_valid_result():
    """Full analyze() call in mock mode should return a valid dict."""
    from app.services.ai_service import AIService

    ai = AIService.__new__(AIService)
    ai._mock_mode = True

    # Minimal 1x1 JPEG bytes
    import io
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (100, 100), color=(100, 100, 100)).save(buf, format="JPEG")
    img_bytes = buf.getvalue()

    result = ai.analyze(img_bytes)
    assert "road_detected" in result
    assert isinstance(result["confidence"], float)
    assert 0.0 <= result["confidence"] <= 1.0


def test_severity_computation():
    """Severity should be one of minor/moderate/severe."""
    from app.services.ai_service import AIService
    import numpy as np

    ai = AIService.__new__(AIService)
    detections = [
        {"x1": 0, "y1": 0, "x2": 200, "y2": 200, "confidence": 0.85, "class_name": "pothole"},
    ]
    severity = ai._compute_severity(detections, img_area=640 * 640)
    assert severity in ("minor", "moderate", "severe")


def test_iou_calculation():
    """IoU between identical boxes should be 1.0."""
    from app.services.ai_service import AIService
    box = {"x1": 0, "y1": 0, "x2": 100, "y2": 100}
    assert AIService._iou(box, box) == pytest.approx(1.0)


def test_india_bounds():
    """Known Indian coordinates should pass validation."""
    from app.utils.india_bounds import is_in_india
    assert is_in_india(18.52, 73.85)   # Pune
    assert is_in_india(28.61, 77.20)   # Delhi
    assert not is_in_india(51.50, -0.12)  # London
    assert not is_in_india(35.68, 139.69) # Tokyo


def test_image_validation_too_large():
    """Images over 10MB should be rejected."""
    from app.utils.image_utils import validate_image
    large_bytes = b"x" * (11 * 1024 * 1024)
    with pytest.raises(ValueError, match="too large"):
        validate_image(large_bytes, "image/jpeg")


def test_severity_utility():
    """max_severity should return the highest severity."""
    from app.utils.severity import max_severity
    assert max_severity(["minor", "severe", "moderate"]) == "severe"
    assert max_severity(["minor", "minor"]) == "minor"
    assert max_severity([]) == "minor"

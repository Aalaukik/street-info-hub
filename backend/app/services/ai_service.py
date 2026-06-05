"""
AI Service — runs two ONNX models:
  1. road_classifier.onnx  → is there a road in this image?
  2. damage_detector.onnx  → YOLO damage detection
"""

import os
import logging
import numpy as np
from pathlib import Path
from PIL import Image
import io

logger = logging.getLogger(__name__)

# Graceful import — models might not exist yet during dev
try:
    import onnxruntime as ort
    ONNX_AVAILABLE = True
except ImportError:
    ONNX_AVAILABLE = False
    logger.warning("onnxruntime not installed — AI service running in MOCK mode")

MODELS_DIR = Path(__file__).parent.parent.parent / "models_bin"

# YOLOv8 damage classes (must match training order)
DAMAGE_CLASSES = [
    "pothole",
    "longitudinal_crack",
    "transverse_crack",
    "alligator_crack",
    "rutting",
    "edge_break",
]

SEVERITY_WEIGHTS = {
    "pothole": 1.5,
    "alligator_crack": 1.3,
    "rutting": 1.2,
    "longitudinal_crack": 1.0,
    "transverse_crack": 1.0,
    "edge_break": 0.9,
}


class AIService:
    _road_classifier_session = None
    _damage_detector_session = None
    _mock_mode = False

    def __init__(self):
        if not ONNX_AVAILABLE:
            self._mock_mode = True
            return
        self._load_models()

    def _load_models(self):
        classifier_path = MODELS_DIR / "road_classifier.onnx"
        detector_path = MODELS_DIR / "damage_detector.onnx"

        opts = ort.SessionOptions()
        opts.intra_op_num_threads = 2
        opts.inter_op_num_threads = 2

        if classifier_path.exists():
            self._road_classifier_session = ort.InferenceSession(
                str(classifier_path),
                sess_options=opts,
                providers=["CPUExecutionProvider"],
            )
            logger.info("Road classifier loaded")
        else:
            logger.warning(f"Road classifier not found at {classifier_path} — using mock")
            self._mock_mode = True

        if detector_path.exists():
            self._damage_detector_session = ort.InferenceSession(
                str(detector_path),
                sess_options=opts,
                providers=["CPUExecutionProvider"],
            )
            logger.info("Damage detector loaded")
        else:
            logger.warning(f"Damage detector not found at {detector_path} — using mock")
            self._mock_mode = True

    # ────────────────────────────────────────────
    # PUBLIC API
    # ────────────────────────────────────────────

    def analyze(self, image_bytes: bytes) -> dict:
        """
        Full pipeline: road check → damage detection.
        Returns dict with:
          road_detected, damage_types, severity, confidence, bbox_data
        """
        if self._mock_mode:
            return self._mock_result()

        try:
            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception as e:
            raise ValueError(f"Cannot decode image: {e}")

        # Stage 1 — road presence
        road_conf = self._classify_road(img)
        if road_conf < 0.55:
            return {
                "road_detected": False,
                "damage_types": [],
                "severity": None,
                "confidence": float(road_conf),
                "bbox_data": [],
            }

        # Stage 2 — damage detection
        detections = self._detect_damage(img)
        if not detections:
            return {
                "road_detected": True,
                "damage_types": [],
                "severity": "minor",
                "confidence": float(road_conf),
                "bbox_data": [],
            }

        damage_types = list({d["class_name"] for d in detections})
        severity = self._compute_severity(detections, img.width * img.height)
        avg_conf = float(np.mean([d["confidence"] for d in detections]))

        return {
            "road_detected": True,
            "damage_types": damage_types,
            "severity": severity,
            "confidence": avg_conf,
            "bbox_data": detections,
        }

    # ────────────────────────────────────────────
    # PRIVATE HELPERS
    # ────────────────────────────────────────────

    def _classify_road(self, img: Image.Image) -> float:
        """MobileNetV3 binary classifier → probability of road."""
        tensor = self._preprocess_classifier(img)
        input_name = self._road_classifier_session.get_inputs()[0].name
        outputs = self._road_classifier_session.run(None, {input_name: tensor})
        logits = outputs[0][0]
        # Assume output [not_road, road] with softmax
        probs = self._softmax(logits)
        return float(probs[1])  # road probability

    def _detect_damage(self, img: Image.Image) -> list[dict]:
        """YOLOv8 ONNX inference → list of detections."""
        tensor, orig_w, orig_h = self._preprocess_yolo(img)
        input_name = self._damage_detector_session.get_inputs()[0].name
        outputs = self._damage_detector_session.run(None, {input_name: tensor})
        return self._postprocess_yolo(outputs[0], orig_w, orig_h)

    def _preprocess_classifier(self, img: Image.Image, size: int = 224) -> np.ndarray:
        img = img.resize((size, size))
        arr = np.array(img, dtype=np.float32) / 255.0
        mean = np.array([0.485, 0.456, 0.406])
        std = np.array([0.229, 0.224, 0.225])
        arr = (arr - mean) / std
        return arr.transpose(2, 0, 1)[np.newaxis].astype(np.float32)

    def _preprocess_yolo(
        self, img: Image.Image, size: int = 640
    ) -> tuple[np.ndarray, int, int]:
        orig_w, orig_h = img.size
        img_resized = img.resize((size, size))
        arr = np.array(img_resized, dtype=np.float32) / 255.0
        tensor = arr.transpose(2, 0, 1)[np.newaxis].astype(np.float32)
        return tensor, orig_w, orig_h

    def _postprocess_yolo(
        self,
        output: np.ndarray,
        orig_w: int,
        orig_h: int,
        conf_thresh: float = 0.40,
        iou_thresh: float = 0.45,
        model_size: int = 640,
    ) -> list[dict]:
        """
        Parse YOLOv8 output tensor [1, num_classes+4, num_anchors].
        Returns list of dicts: {x1,y1,x2,y2,confidence,class_name}
        """
        predictions = output[0].T  # [num_anchors, 4+num_classes]
        boxes_xywh = predictions[:, :4]
        class_scores = predictions[:, 4:]

        confidences = class_scores.max(axis=1)
        class_ids = class_scores.argmax(axis=1)

        mask = confidences > conf_thresh
        boxes_xywh = boxes_xywh[mask]
        confidences = confidences[mask]
        class_ids = class_ids[mask]

        if len(boxes_xywh) == 0:
            return []

        # Convert xywh → xyxy (normalised 0-640 scale back to original)
        scale_x = orig_w / model_size
        scale_y = orig_h / model_size

        detections = []
        for i, (box, conf, cls_id) in enumerate(zip(boxes_xywh, confidences, class_ids)):
            cx, cy, w, h = box
            x1 = (cx - w / 2) * scale_x
            y1 = (cy - h / 2) * scale_y
            x2 = (cx + w / 2) * scale_x
            y2 = (cy + h / 2) * scale_y
            class_name = (
                DAMAGE_CLASSES[int(cls_id)]
                if int(cls_id) < len(DAMAGE_CLASSES)
                else "unknown"
            )
            detections.append(
                {
                    "x1": float(x1),
                    "y1": float(y1),
                    "x2": float(x2),
                    "y2": float(y2),
                    "confidence": float(conf),
                    "class_name": class_name,
                }
            )

        return self._nms(detections, iou_thresh)

    @staticmethod
    def _nms(detections: list[dict], iou_thresh: float) -> list[dict]:
        if not detections:
            return []
        detections = sorted(detections, key=lambda d: d["confidence"], reverse=True)
        keep = []
        for det in detections:
            dominated = False
            for kept in keep:
                if AIService._iou(det, kept) > iou_thresh:
                    dominated = True
                    break
            if not dominated:
                keep.append(det)
        return keep

    @staticmethod
    def _iou(a: dict, b: dict) -> float:
        ix1 = max(a["x1"], b["x1"])
        iy1 = max(a["y1"], b["y1"])
        ix2 = min(a["x2"], b["x2"])
        iy2 = min(a["y2"], b["y2"])
        inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
        area_a = (a["x2"] - a["x1"]) * (a["y2"] - a["y1"])
        area_b = (b["x2"] - b["x1"]) * (b["y2"] - b["y1"])
        union = area_a + area_b - inter
        return inter / union if union > 0 else 0

    @staticmethod
    def _softmax(x: np.ndarray) -> np.ndarray:
        e = np.exp(x - x.max())
        return e / e.sum()

    def _compute_severity(self, detections: list[dict], img_area: int) -> str:
        scores = []
        for d in detections:
            bbox_area = (d["x2"] - d["x1"]) * (d["y2"] - d["y1"])
            ratio = bbox_area / img_area
            weight = SEVERITY_WEIGHTS.get(d["class_name"], 1.0)
            scores.append(ratio * weight * d["confidence"])

        avg_score = np.mean(scores)
        if avg_score > 0.08:
            return "severe"
        elif avg_score > 0.025:
            return "moderate"
        return "minor"

    # ────────────────────────────────────────────
    # MOCK MODE (development without models)
    # ────────────────────────────────────────────

    @staticmethod
    def _mock_result() -> dict:
        import random
        road_detected = random.random() > 0.15
        if not road_detected:
            return {
                "road_detected": False,
                "damage_types": [],
                "severity": None,
                "confidence": 0.3,
                "bbox_data": [],
            }
        damage_types = random.choices(
            ["pothole", "longitudinal_crack", "transverse_crack", "alligator_crack"],
            k=random.randint(1, 2),
        )
        return {
            "road_detected": True,
            "damage_types": list(set(damage_types)),
            "severity": random.choice(["minor", "moderate", "severe"]),
            "confidence": round(random.uniform(0.60, 0.95), 3),
            "bbox_data": [
                {
                    "x1": 100,
                    "y1": 200,
                    "x2": 300,
                    "y2": 350,
                    "confidence": 0.82,
                    "class_name": damage_types[0],
                }
            ],
        }


# Singleton
_ai_service: AIService | None = None


def get_ai_service() -> AIService:
    global _ai_service
    if _ai_service is None:
        _ai_service = AIService()
    return _ai_service

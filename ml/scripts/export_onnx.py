"""
export_onnx.py
──────────────
Exports a trained YOLOv8 .pt model to ONNX and verifies
it matches the backend's ai_service.py expectations.

Usage:
    # Export damage detector:
    python ml/scripts/export_onnx.py \\
        --model runs/train/damage_detector/weights/best.pt \\
        --output backend/models_bin/damage_detector.onnx \\
        --type detector

    # Export road classifier:
    python ml/scripts/export_onnx.py \\
        --model road_classifier_best.pth \\
        --output backend/models_bin/road_classifier.onnx \\
        --type classifier
"""

import argparse
import os
import sys
from pathlib import Path


def export_yolo(model_path: str, output_path: str) -> None:
    try:
        from ultralytics import YOLO
    except ImportError:
        raise ImportError("Run: pip install ultralytics")

    model = YOLO(model_path)
    onnx_export = model.export(
        format="onnx",
        imgsz=640,
        opset=17,
        simplify=True,
        dynamic=False,
    )
    # Move to desired output path
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    Path(str(onnx_export)).replace(output_path)
    print(f"✓ YOLOv8 ONNX exported → {output_path}")


def export_classifier(model_path: str, output_path: str) -> None:
    try:
        import torch
        import torchvision.models as models
    except ImportError:
        raise ImportError("Run: pip install torch torchvision")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model  = models.mobilenet_v3_small()
    in_f   = model.classifier[-1].in_features

    import torch.nn as nn
    model.classifier[-1] = nn.Linear(in_f, 2)
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.eval().to(device)

    dummy = torch.randn(1, 3, 224, 224).to(device)
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    torch.onnx.export(
        model, dummy, output_path,
        export_params=True,
        opset_version=17,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}},
        do_constant_folding=True,
    )
    print(f"✓ Classifier ONNX exported → {output_path}")


def verify_onnx(path: str, model_type: str) -> None:
    try:
        import onnx
        import onnxruntime as ort
        import numpy as np
    except ImportError:
        raise ImportError("Run: pip install onnx onnxruntime numpy")

    # 1 — ONNX structural check
    model = onnx.load(path)
    onnx.checker.check_model(model)
    print("✓ ONNX structure valid")

    # 2 — Runtime inference check
    session    = ort.InferenceSession(path, providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name

    if model_type == "classifier":
        dummy  = np.random.randn(1, 3, 224, 224).astype(np.float32)
        output = session.run(None, {input_name: dummy})
        assert output[0].shape == (1, 2), f"Expected (1,2), got {output[0].shape}"
        print(f"✓ Classifier output shape: {output[0].shape}  (1 sample, 2 classes)")
    else:
        dummy  = np.random.randn(1, 3, 640, 640).astype(np.float32)
        output = session.run(None, {input_name: dummy})
        print(f"✓ Detector output shape:   {output[0].shape}  (1 sample, detections)")

    size_mb = os.path.getsize(path) / 1024 / 1024
    print(f"✓ Model size: {size_mb:.1f} MB")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export trained model to ONNX")
    parser.add_argument("--model",  required=True, help="Path to .pt or .pth file")
    parser.add_argument("--output", required=True, help="Output .onnx path")
    parser.add_argument("--type",   required=True, choices=["detector", "classifier"])
    args = parser.parse_args()

    print(f"\nExporting {args.type}: {args.model}")
    print("─" * 50)

    if args.type == "detector":
        export_yolo(args.model, args.output)
    else:
        export_classifier(args.model, args.output)

    print("\nVerifying ONNX model …")
    verify_onnx(args.output, args.type)

    print("\n✅ Export complete!")
    print(f"   Place the file at: backend/models_bin/{Path(args.output).name}")

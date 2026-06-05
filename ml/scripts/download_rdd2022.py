"""
download_rdd2022.py
───────────────────
Downloads the Road Damage Dataset 2022 via Roboflow
and organises it into YOLOv8 format.

Usage:
    python ml/scripts/download_rdd2022.py --api-key YOUR_ROBOFLOW_KEY
"""

import argparse
import os
import shutil
import yaml
from pathlib import Path


def download(api_key: str, output_dir: str = "ml/data/rdd2022") -> str:
    try:
        from roboflow import Roboflow
    except ImportError:
        raise ImportError("Run: pip install roboflow")

    rf      = Roboflow(api_key=api_key)
    project = rf.workspace("roboflow-universe-projects").project(
        "road-damage-detection-ivgtg"
    )
    dataset = project.version(1).download("yolov8", location=output_dir)
    print(f"✓ Dataset downloaded → {dataset.location}")
    return dataset.location


def remap_classes(dataset_dir: str) -> None:
    """
    Remap RDD2022 class IDs to Street Info Hub naming:
      D00 (0) → longitudinal_crack
      D10 (1) → transverse_crack
      D20 (2) → alligator_crack
      D40 (3) → pothole
    """
    CLASS_MAP = {
        "D00": "longitudinal_crack",
        "D10": "transverse_crack",
        "D20": "alligator_crack",
        "D40": "pothole",
    }

    yaml_path = Path(dataset_dir) / "data.yaml"
    with open(yaml_path) as f:
        cfg = yaml.safe_load(f)

    original = cfg.get("names", [])
    cfg["names"] = [CLASS_MAP.get(n, n.lower().replace(" ", "_")) for n in original]
    cfg["nc"]    = len(cfg["names"])

    with open(yaml_path, "w") as f:
        yaml.dump(cfg, f, default_flow_style=False)

    print(f"✓ Class names remapped: {cfg['names']}")


def print_stats(dataset_dir: str) -> None:
    base = Path(dataset_dir)
    for split in ["train", "valid", "test"]:
        imgs = list((base / split / "images").glob("*.jpg"))
        lbls = list((base / split / "labels").glob("*.txt"))
        print(f"  {split:6s}: {len(imgs):5d} images, {len(lbls):5d} labels")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download RDD2022 dataset via Roboflow")
    parser.add_argument("--api-key",    required=True, help="Roboflow API key")
    parser.add_argument("--output-dir", default="ml/data/rdd2022", help="Where to save dataset")
    args = parser.parse_args()

    print("Downloading RDD2022 dataset …")
    loc = download(args.api_key, args.output_dir)

    print("Remapping class names …")
    remap_classes(loc)

    print("\nDataset statistics:")
    print_stats(loc)

    print(f"\n✅ Done! Dataset ready at: {loc}")
    print(f"   Use this path in training: --data {loc}/data.yaml")

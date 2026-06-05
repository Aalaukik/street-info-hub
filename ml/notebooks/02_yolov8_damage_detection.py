# ============================================================
# Street Info Hub — YOLOv8 Damage Detector Training
# Stage 2: Multi-class road damage detection
# Run on Google Colab (free T4 GPU)
#
# Classes: pothole, longitudinal_crack, transverse_crack,
#          alligator_crack   (mapped from D40, D00, D10, D20)
#
# Dataset: RDD2022 downloaded from dataset-ninja.com
#
# ── BEFORE RUNNING ──────────────────────────────────────────
# 1. Go to https://datasetninja.com/rdd2022
# 2. Download in  YOLOv8 / YOLOv5  format  (as a .zip)
# 3. Upload the zip to Google Drive at:
#      MyDrive/StreetInfoHub/datasets/RDD2022.zip
#    (or extract it and upload the folder as RDD2022/)
# ============================================================


# ── Cell 1: Install dependencies ────────────────────────────
"""
!pip install -q ultralytics onnx onnxruntime
!pip install -q matplotlib seaborn pyyaml

from ultralytics import YOLO
import torch
print(f"PyTorch  : {torch.__version__}")
print(f"CUDA     : {torch.cuda.is_available()}")
print(f"GPU      : {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'N/A'}")
"""


# ── Cell 2: Mount Drive & configure paths ───────────────────
"""
from google.colab import drive
drive.mount('/content/drive')

import os

DATASETS_DIR = '/content/drive/MyDrive/StreetInfoHub/datasets'
SAVE_DIR     = '/content/drive/MyDrive/StreetInfoHub/models'

# ── Set whichever filename your downloaded file has ──────────
#    Common dataset-ninja filenames:
DRIVE_TAR    = f'{DATASETS_DIR}/rdd2022.tar'          # .tar
DRIVE_TAR_GZ = f'{DATASETS_DIR}/rdd2022.tar.gz'       # .tar.gz
DRIVE_ZIP    = f'{DATASETS_DIR}/RDD2022.zip'           # .zip (fallback)

WORK_DIR = '/content/RDD2022'
os.makedirs(SAVE_DIR, exist_ok=True)

# Auto-detect which file exists
import os as _os
_found = None
for _path in [DRIVE_TAR, DRIVE_TAR_GZ, DRIVE_ZIP]:
    if _os.path.exists(_path):
        size_gb = _os.path.getsize(_path) / 1024**3
        print(f"✓ Found dataset: {_path}  ({size_gb:.2f} GB)")
        _found = _path
        break

if _found is None:
    print("✗ No dataset archive found. Looked for:")
    for p in [DRIVE_TAR, DRIVE_TAR_GZ, DRIVE_ZIP]:
        print(f"    {p}")
    print("\\nUpdate the paths above to match your actual filename on Drive.")
else:
    DATASET_ARCHIVE = _found
    print(f"Save dir: {SAVE_DIR}")
"""


# ── Cell 3: Extract dataset into Colab working directory ────
"""
import os, shutil, zipfile, tarfile
from pathlib import Path

WORK = Path(WORK_DIR)

if WORK.exists():
    shutil.rmtree(WORK)
WORK.mkdir(parents=True)

archive = DATASET_ARCHIVE
print(f"Extracting {archive} …  (may take 2–5 min)")

if archive.endswith('.tar.gz') or archive.endswith('.tgz'):
    with tarfile.open(archive, 'r:gz') as t:
        t.extractall('/content/')
elif archive.endswith('.tar'):
    with tarfile.open(archive, 'r:') as t:
        t.extractall('/content/')
elif archive.endswith('.zip'):
    with zipfile.ZipFile(archive, 'r') as z:
        z.extractall('/content/')
else:
    raise ValueError(f"Unsupported archive format: {archive}")

print("Extraction complete ✓")

# ── Auto-detect where the actual dataset root landed ─────────
# dataset-ninja tars often extract into a named subfolder.
# We look for the folder that contains train/images or train/ + valid/.
dataset_root = None
for dirpath, dirnames, _ in os.walk('/content'):
    if 'drive' in dirpath:
        continue
    has_train = 'train' in dirnames
    has_val   = 'valid' in dirnames or 'val' in dirnames
    if has_train and has_val:
        dataset_root = Path(dirpath)
        break

if dataset_root is None:
    print("Could not auto-detect dataset root. Top-level /content contents:")
    for item in Path('/content').iterdir():
        print(" ", item)
    raise FileNotFoundError(
        "No folder with both 'train' and 'valid'/'val' found.\\n"
        "Check the printed directory listing above and set WORK_DIR manually."
    )

# If dataset landed somewhere other than WORK_DIR, move it
if dataset_root != WORK:
    if WORK.exists():
        shutil.rmtree(WORK)
    dataset_root.rename(WORK)
    print(f"Moved {dataset_root} → {WORK}")

print(f"\\nDataset ready at: {WORK}")

# Show structure
print("\\nTop-level contents:")
for item in sorted(WORK.iterdir()):
    if item.is_dir():
        n_imgs = len(list((item / 'images').glob('*.[jJpP][pPnN][gG]'))) if (item / 'images').exists() else 0
        print(f"  {item.name}/  ({n_imgs} images)")
    else:
        print(f"  {item.name}")
"""


# ── Cell 4: Inspect existing data.yaml & remap classes ──────
"""
import yaml
from pathlib import Path

WORK = Path(WORK_DIR)

# Locate data.yaml (could be in root or a subdirectory)
yaml_files = list(WORK.rglob('data.yaml')) + list(WORK.rglob('*.yaml'))
if not yaml_files:
    raise FileNotFoundError("No .yaml file found inside the dataset. Check extraction.")

yaml_path = yaml_files[0]
print(f"Found YAML: {yaml_path}")

with open(yaml_path) as f:
    orig_cfg = yaml.safe_load(f)

print("\\nOriginal config:")
print(yaml.dump(orig_cfg, default_flow_style=False))

# ── Class name mapping ───────────────────────────────────────
# Maps whatever dataset-ninja used → our app's class names
# Covers D-code names, full English names, and common variants.
# Edit this dict if your YAML uses different source names.

CLASS_REMAP = {
    # D-code style (most common in RDD2022 YOLO exports)
    'D00' : 'longitudinal_crack',
    'D10' : 'transverse_crack',
    'D20' : 'alligator_crack',
    'D30' : 'alligator_crack',   # grid crack — merge with alligator
    'D40' : 'pothole',
    'D43' : 'pothole',            # pothole variant
    'D44' : 'pothole',            # pothole variant
    # Full-name style (sometimes used in dataset-ninja exports)
    'longitudinal crack'  : 'longitudinal_crack',
    'transverse crack'    : 'transverse_crack',
    'alligator crack'     : 'alligator_crack',
    'mesh crack'          : 'alligator_crack',
    'fatigue crack'       : 'alligator_crack',
    'pothole'             : 'pothole',
    'wheel mark linear'   : 'longitudinal_crack',
}

original_names = orig_cfg.get('names', [])
print(f"\\nOriginal class names: {original_names}")

# Remap
new_names = []
for name in original_names:
    key    = str(name).strip()
    mapped = CLASS_REMAP.get(key, CLASS_REMAP.get(key.lower(), key.lower().replace(' ', '_')))
    new_names.append(mapped)
    print(f"  {key:30s}  →  {mapped}")

print(f"\\nMapped class names: {new_names}")
"""


# ── Cell 5: Fix data paths & write custom data.yaml ─────────
"""
import yaml, os
from pathlib import Path

WORK = Path(WORK_DIR)

# Detect split directories (dataset-ninja may use 'valid' or 'val')
def find_split(base, names):
    for name in names:
        p = base / name
        if p.exists():
            return str(p / 'images')
    return None

train_path = find_split(WORK, ['train'])
val_path   = find_split(WORK, ['valid', 'val', 'validation'])
test_path  = find_split(WORK, ['test'])

print(f"Train  : {train_path}")
print(f"Val    : {val_path}")
print(f"Test   : {test_path}")

if train_path is None:
    raise FileNotFoundError("'train' folder not found in dataset. Check your extraction.")
if val_path is None:
    raise FileNotFoundError("'valid' / 'val' folder not found. Check your extraction.")

# Build new yaml
custom_cfg = {
    'path'  : str(WORK),
    'train' : train_path,
    'val'   : val_path,
    'nc'    : len(new_names),
    'names' : new_names,
}
if test_path:
    custom_cfg['test'] = test_path

CUSTOM_YAML = '/content/damage_detection.yaml'
with open(CUSTOM_YAML, 'w') as f:
    yaml.dump(custom_cfg, f, default_flow_style=False)

print("\\nCustom data.yaml written:")
print(yaml.dump(custom_cfg, default_flow_style=False))

# Count images
for split, path in [('train', train_path), ('val', val_path)]:
    if path and os.path.isdir(path):
        n = len([f for f in os.listdir(path) if f.lower().endswith(('.jpg', '.png'))])
        print(f"  {split:6s}: {n} images")
"""


# ── Cell 6: Train YOLOv8s ───────────────────────────────────
"""
from ultralytics import YOLO

model = YOLO('yolov8s.pt')   # auto-downloads pretrained COCO weights (~22 MB)

results = model.train(
    data         = CUSTOM_YAML,
    epochs       = 60,
    imgsz        = 640,
    batch        = 16,        # reduce to 8 if you hit OOM
    device       = 0,
    workers      = 2,
    name         = 'damage_detector',
    project      = '/content/runs',
    patience     = 15,        # early stopping — stops if no improvement for 15 epochs
    optimizer    = 'AdamW',
    lr0          = 0.001,
    lrf          = 0.01,
    momentum     = 0.937,
    weight_decay = 0.0005,
    warmup_epochs= 3.0,
    # Augmentation
    hsv_h    = 0.015,
    hsv_s    = 0.7,
    hsv_v    = 0.4,
    degrees  = 5.0,
    translate= 0.1,
    scale    = 0.5,
    fliplr   = 0.5,
    mosaic   = 1.0,
    # Logging
    save        = True,
    save_period = 10,
    val         = True,
    plots       = True,
    verbose     = True,
)

best_pt = f'{results.save_dir}/weights/best.pt'
print(f"\\nTraining complete!")
print(f"Best model  : {best_pt}")
print(f"Results dir : {results.save_dir}")
"""


# ── Cell 7: Evaluate on validation / test set ───────────────
"""
from ultralytics import YOLO

best_pt = '/content/runs/damage_detector/weights/best.pt'
model   = YOLO(best_pt)

# Validate on val split
metrics = model.val(data=CUSTOM_YAML, split='val', verbose=True)

print("\\n========== EVALUATION RESULTS ==========")
print(f"mAP@0.5      : {metrics.box.map50:.4f}")
print(f"mAP@0.5:0.95 : {metrics.box.map:.4f}")
print(f"Precision    : {metrics.box.mp:.4f}")
print(f"Recall       : {metrics.box.mr:.4f}")
print("\\nPer-class mAP@0.5:")
for name, ap in zip(metrics.names.values(), metrics.box.ap50):
    print(f"  {name:30s}: {ap:.4f}")
"""


# ── Cell 8: Visual inference on sample images ───────────────
"""
import cv2, glob
import matplotlib.pyplot as plt
from pathlib import Path

model = YOLO('/content/runs/damage_detector/weights/best.pt')

# Grab up to 6 val images for a visual check
val_img_dir = Path(WORK_DIR) / 'valid' / 'images'
if not val_img_dir.exists():
    val_img_dir = Path(WORK_DIR) / 'val' / 'images'

sample_imgs = sorted(val_img_dir.glob('*.jpg'))[:6]

fig, axes = plt.subplots(2, 3, figsize=(15, 10))
axes = axes.flatten()

for i, img_path in enumerate(sample_imgs):
    res       = model.predict(str(img_path), conf=0.35, iou=0.45, verbose=False)
    annotated = res[0].plot()
    axes[i].imshow(cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB))
    boxes = len(res[0].boxes)
    axes[i].set_title(f"Image {i+1}  ({boxes} detections)", fontsize=9)
    axes[i].axis('off')

for j in range(i+1, 6):
    axes[j].axis('off')

plt.tight_layout()
plt.savefig('/content/sample_detections.png', dpi=150, bbox_inches='tight')
plt.show()
print("Sample detections saved: /content/sample_detections.png")
"""


# ── Cell 9: Export to ONNX ───────────────────────────────────
"""
from ultralytics import YOLO
import onnxruntime as ort
import numpy as np, os, shutil

model = YOLO('/content/runs/damage_detector/weights/best.pt')

onnx_path = model.export(
    format   = 'onnx',
    imgsz    = 640,
    opset    = 17,
    simplify = True,    # smaller file + faster inference
    dynamic  = False,   # fixed batch=1 for production inference
)

print(f"ONNX exported: {onnx_path}")
size_mb = os.path.getsize(str(onnx_path)) / 1024 / 1024
print(f"Model size   : {size_mb:.1f} MB")

# Verify with ORT
session = ort.InferenceSession(str(onnx_path), providers=['CPUExecutionProvider'])
dummy   = np.random.randn(1, 3, 640, 640).astype(np.float32)
out     = session.run(None, {session.get_inputs()[0].name: dummy})
print(f"ORT output shape: {out[0].shape}  ✓")

# Copy to Drive
shutil.copy(str(onnx_path), f'{SAVE_DIR}/damage_detector.onnx')

print(f"\\n✅ Both models ready in Drive:")
print(f"   {SAVE_DIR}/road_classifier.onnx")
print(f"   {SAVE_DIR}/damage_detector.onnx")
print("\\nPlace both files in: backend/models_bin/")
"""


# ── Cell 10: (Optional) Direct download ─────────────────────
"""
# Skip if you already saved to Drive above
from google.colab import files
files.download('/content/road_classifier.onnx')
files.download('/content/runs/damage_detector/weights/best.onnx')
print("Downloads started — place files in backend/models_bin/")
"""

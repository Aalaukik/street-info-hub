# ============================================================
# Street Info Hub — Road Classifier Training
# Stage 1: Binary classifier — road vs no_road
# Run on Google Colab (free T4 GPU)
#
# Dataset: Your own dataset with two folders:
#            road/      ← road surface images
#            no_road/   ← non-road images
#
# Upload dataset to Google Drive before running:
#   MyDrive/StreetInfoHub/datasets/road_classifier/
#       road/
#       no_road/
# ============================================================


# ── Cell 1: Install dependencies ────────────────────────────
"""
!pip install -q torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
!pip install -q timm onnx onnxruntime matplotlib seaborn scikit-learn

import torch
print(f"PyTorch  : {torch.__version__}")
print(f"CUDA     : {torch.cuda.is_available()}")
print(f"GPU      : {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'N/A'}")
"""


# ── Cell 2: Mount Google Drive & configure paths ────────────
"""
from google.colab import drive
drive.mount('/content/drive')

import os

# ── Path to your zip on Drive ────────────────────────────────
# The zip should be at: MyDrive/StreetInfoHub/datasets/road_classifier.zip
DRIVE_ZIP = '/content/drive/MyDrive/StreetInfoHub/datasets/road_classifier.zip'
SAVE_DIR  = '/content/drive/MyDrive/StreetInfoHub/models'

os.makedirs(SAVE_DIR, exist_ok=True)

if os.path.exists(DRIVE_ZIP):
    size_gb = os.path.getsize(DRIVE_ZIP) / 1024**3
    print(f"✓ Found zip: {DRIVE_ZIP}  ({size_gb:.2f} GB)")
else:
    print(f"✗ Zip not found at: {DRIVE_ZIP}")
    print("  Check the path and filename on your Drive.")
"""


# ── Cell 3: Extract zip & create train / val split ──────────
"""
import os, shutil, random, zipfile
from pathlib import Path

EXTRACT_DIR = Path('/content/road_classifier_raw')   # extracted here (fast local SSD)
WORK_DIR    = Path('/content/road_classifier_data')   # final train/val structure
CLASSES     = ['road', 'no_road']
VAL_SPLIT   = 0.15
SEED        = 42
random.seed(SEED)

# ── Step 1: Extract zip ──────────────────────────────────────
if EXTRACT_DIR.exists():
    shutil.rmtree(EXTRACT_DIR)

print(f"Extracting {DRIVE_ZIP} …  (this takes 1–3 min for large datasets)")
with zipfile.ZipFile(DRIVE_ZIP, 'r') as z:
    z.extractall(EXTRACT_DIR)
print("Extraction complete ✓")

# ── Step 2: Find where road/ and no_road/ actually live ──────
# The zip may or may not contain a top-level folder.
# We search recursively for the first directory named 'road'.
dataset_root = None
for dirpath, dirnames, _ in os.walk(EXTRACT_DIR):
    if 'road' in dirnames and 'no_road' in dirnames:
        dataset_root = Path(dirpath)
        break

if dataset_root is None:
    # Print what was found to help debug
    print("Could not auto-detect dataset root. Found top-level contents:")
    for item in sorted(EXTRACT_DIR.rglob('*'))[:30]:
        print(" ", item.relative_to(EXTRACT_DIR))
    raise FileNotFoundError(
        "Neither 'road' nor 'no_road' folder found inside the zip.\\n"
        "Check that your zip contains these two folders."
    )

print(f"Dataset root found: {dataset_root}")

# Verify images exist
for cls in CLASSES:
    n = len(list((dataset_root / cls).glob('*.[jJpP][pPnN][gG]')))
    print(f"  {cls:10s}: {n} images  ✓")

# ── Step 3: Create train / val split ─────────────────────────
if WORK_DIR.exists():
    shutil.rmtree(WORK_DIR)

for split in ['train', 'val']:
    for cls in CLASSES:
        (WORK_DIR / split / cls).mkdir(parents=True, exist_ok=True)

print("\\nSplitting …")
for cls in CLASSES:
    imgs = sorted((dataset_root / cls).glob('*.[jJpP][pPnN][gG]'))
    if not imgs:   # try .jpeg too
        imgs = sorted((dataset_root / cls).glob('*.jpeg'))
    random.shuffle(imgs)

    n_val      = max(1, int(len(imgs) * VAL_SPLIT))
    train_imgs = imgs[n_val:]
    val_imgs   = imgs[:n_val]

    for p in train_imgs:
        shutil.copy(p, WORK_DIR / 'train' / cls / p.name)
    for p in val_imgs:
        shutil.copy(p, WORK_DIR / 'val' / cls / p.name)

    print(f"  {cls:10s}: {len(imgs):5d} total  →  {len(train_imgs):5d} train  /  {len(val_imgs):4d} val")

print(f"\\nWorking directory: {WORK_DIR}  ✓")
"""


# ── Cell 4: Dataset & DataLoaders ───────────────────────────
"""
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms, models

IMG_SIZE    = 224
BATCH       = 32        # reduce to 16 if you hit OOM
NUM_WORKERS = 2

train_transforms = transforms.Compose([
    transforms.RandomResizedCrop(IMG_SIZE, scale=(0.7, 1.0)),
    transforms.RandomHorizontalFlip(),
    transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2, hue=0.05),
    transforms.RandomRotation(10),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])
val_transforms = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(IMG_SIZE),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

train_ds = datasets.ImageFolder(str(WORK_DIR / 'train'), transform=train_transforms)
val_ds   = datasets.ImageFolder(str(WORK_DIR / 'val'),   transform=val_transforms)

train_loader = DataLoader(train_ds, batch_size=BATCH, shuffle=True,
                          num_workers=NUM_WORKERS, pin_memory=True)
val_loader   = DataLoader(val_ds,   batch_size=BATCH, shuffle=False,
                          num_workers=NUM_WORKERS, pin_memory=True)

print(f"Classes  : {train_ds.classes}")       # ['no_road', 'road'] — alphabetical
print(f"Class map: {train_ds.class_to_idx}")  # {'no_road': 0, 'road': 1}
print(f"Train    : {len(train_ds)} images")
print(f"Val      : {len(val_ds)} images")

# Save class mapping for inference
import json
CLASS_MAP = {v: k for k, v in train_ds.class_to_idx.items()}   # {0: 'no_road', 1: 'road'}
print(f"\nIndex→class map: {CLASS_MAP}")
"""


# ── Cell 5: Build model ──────────────────────────────────────
"""
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Device: {device}")

# MobileNetV3-Small — lightweight & fast for mobile/CPU inference
model = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)

# Replace the classification head with a 2-class head
in_features = model.classifier[-1].in_features
model.classifier[-1] = nn.Linear(in_features, 2)   # [no_road, road]

model = model.to(device)
total_params = sum(p.numel() for p in model.parameters())
print(f"Total parameters: {total_params:,}")
print(f"Output classes  : {train_ds.classes}")
"""


# ── Cell 6: Train ────────────────────────────────────────────
"""
import torch.optim as optim
from torch.optim.lr_scheduler import OneCycleLR

EPOCHS = 20
LR     = 1e-3

criterion = nn.CrossEntropyLoss()
optimizer = optim.AdamW(model.parameters(), lr=LR, weight_decay=1e-4)
scheduler = OneCycleLR(optimizer, max_lr=LR,
                       steps_per_epoch=len(train_loader), epochs=EPOCHS)

best_val_acc = 0.0
history = {'train_loss': [], 'val_acc': []}

for epoch in range(EPOCHS):
    # ── Train phase ──────────────────────────────────────────
    model.train()
    running_loss = 0.0
    for imgs, labels in train_loader:
        imgs, labels = imgs.to(device), labels.to(device)
        optimizer.zero_grad()
        loss = criterion(model(imgs), labels)
        loss.backward()
        optimizer.step()
        scheduler.step()
        running_loss += loss.item()

    # ── Validation phase ─────────────────────────────────────
    model.eval()
    correct = total = 0
    with torch.no_grad():
        for imgs, labels in val_loader:
            imgs, labels = imgs.to(device), labels.to(device)
            preds    = model(imgs).argmax(dim=1)
            correct += (preds == labels).sum().item()
            total   += labels.size(0)

    val_acc  = correct / total
    avg_loss = running_loss / len(train_loader)
    history['train_loss'].append(avg_loss)
    history['val_acc'].append(val_acc)

    print(f"Epoch {epoch+1:02d}/{EPOCHS}  |  Loss: {avg_loss:.4f}  |  Val Acc: {val_acc:.4f}")

    if val_acc > best_val_acc:
        best_val_acc = val_acc
        torch.save(model.state_dict(), '/content/road_classifier_best.pth')
        print(f"  ✓ New best model saved  (acc = {val_acc:.4f})")

print(f"\nTraining complete.  Best val accuracy: {best_val_acc:.4f}")
"""


# ── Cell 7: Plot training curves ────────────────────────────
"""
import matplotlib.pyplot as plt

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))

ax1.plot(history['train_loss'], marker='o', markersize=3)
ax1.set_title('Training Loss')
ax1.set_xlabel('Epoch'); ax1.set_ylabel('Loss')
ax1.grid(True, alpha=0.3)

ax2.plot(history['val_acc'], marker='o', color='green', markersize=3)
ax2.axhline(best_val_acc, color='red', linestyle='--', label=f'Best: {best_val_acc:.4f}')
ax2.set_title('Validation Accuracy')
ax2.set_xlabel('Epoch'); ax2.set_ylabel('Accuracy')
ax2.legend(); ax2.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('/content/training_curves.png', dpi=150)
plt.show()
print("Saved: /content/training_curves.png")
"""


# ── Cell 8: Evaluation & confusion matrix ───────────────────
"""
from sklearn.metrics import confusion_matrix, classification_report
import seaborn as sns
import matplotlib.pyplot as plt
import numpy as np

model.load_state_dict(torch.load('/content/road_classifier_best.pth'))
model.eval()

all_preds, all_labels = [], []
with torch.no_grad():
    for imgs, labels in val_loader:
        imgs   = imgs.to(device)
        preds  = model(imgs).argmax(dim=1).cpu().numpy()
        all_preds.extend(preds)
        all_labels.extend(labels.numpy())

print(classification_report(all_labels, all_preds, target_names=train_ds.classes))

cm = confusion_matrix(all_labels, all_preds)
plt.figure(figsize=(5, 4))
sns.heatmap(cm, annot=True, fmt='d',
            xticklabels=train_ds.classes,
            yticklabels=train_ds.classes,
            cmap='Blues', linewidths=1)
plt.title('Road Classifier — Confusion Matrix')
plt.ylabel('True label'); plt.xlabel('Predicted label')
plt.tight_layout()
plt.savefig('/content/confusion_matrix.png', dpi=150)
plt.show()
"""


# ── Cell 9: Export to ONNX ───────────────────────────────────
"""
import onnx
import onnxruntime as ort
import numpy as np, os

model.load_state_dict(torch.load('/content/road_classifier_best.pth'))
model.eval()

dummy_input = torch.randn(1, 3, 224, 224).to(device)
onnx_path   = '/content/road_classifier.onnx'

torch.onnx.export(
    model,
    dummy_input,
    onnx_path,
    export_params        = True,
    opset_version        = 17,
    input_names          = ['input'],
    output_names         = ['output'],
    dynamic_axes         = {'input': {0: 'batch_size'}, 'output': {0: 'batch_size'}},
    do_constant_folding  = True,
)

# Validate
onnx_model = onnx.load(onnx_path)
onnx.checker.check_model(onnx_model)
print("✓ ONNX model is valid")

# Verify with ORT
ort_session = ort.InferenceSession(onnx_path, providers=['CPUExecutionProvider'])
test_input  = dummy_input.cpu().numpy()
out         = ort_session.run(None, {'input': test_input})
print(f"✓ ORT output shape: {out[0].shape}")

size_mb = os.path.getsize(onnx_path) / 1024 / 1024
print(f"  Model size: {size_mb:.1f} MB")

# Save to Drive
import shutil
shutil.copy(onnx_path, f'{SAVE_DIR}/road_classifier.onnx')
print(f"\n✅ Saved to: {SAVE_DIR}/road_classifier.onnx")
print(f"   Place this file in: backend/models_bin/road_classifier.onnx")
"""


# ── Cell 10: (Optional) Download directly ───────────────────
"""
# Skip this if you already have Drive set up
from google.colab import files
files.download('/content/road_classifier.onnx')
"""

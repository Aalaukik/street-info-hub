"""
convert_to_ipynb.py
───────────────────
Converts the .py training scripts in ml/notebooks/ into real
Jupyter .ipynb notebooks that can be opened directly in Google Colab.

Each triple-quoted string  \"\"\"...\"\"\"  in the .py file becomes one notebook cell.
Lines starting with # become Markdown cells.

Usage:
    pip install nbformat
    python ml/scripts/convert_to_ipynb.py
"""

import re
import json
from pathlib import Path
import nbformat

NOTEBOOKS_DIR = Path(__file__).parent.parent / "notebooks"

SOURCE_FILES = [
    ("01_road_classifier_training.py",  "01_road_classifier_training.ipynb"),
    ("02_yolov8_damage_detection.py",   "02_yolov8_damage_detection.ipynb"),
]


def parse_cells(py_text: str) -> list[dict]:
    """
    Extract cells from the .py script format:
    - Lines starting with # ── ... are markdown section headers
    - Triple-quoted blocks are code cells
    - Regular # comments before a block become markdown cells
    """
    cells = []
    lines = py_text.splitlines()

    i = 0
    pending_markdown: list[str] = []

    while i < len(lines):
        line = lines[i]

        # Section header comment → markdown
        if re.match(r"^# ──", line) or re.match(r"^# ={4,}", line):
            pending_markdown.append(line.lstrip("# ").strip())
            i += 1
            continue

        # Regular comment line → accumulate markdown
        if line.startswith("# ") and not line.startswith("#!"):
            pending_markdown.append(line[2:])
            i += 1
            continue

        # Start of a triple-quoted code block
        if line.strip() == '"""':
            # Flush any pending markdown
            if pending_markdown:
                md_src = "\n".join(pending_markdown)
                cells.append(
                    nbformat.v4.new_markdown_cell(md_src)
                )
                pending_markdown = []

            # Collect lines until closing """
            code_lines = []
            i += 1
            while i < len(lines) and lines[i].strip() != '"""':
                code_lines.append(lines[i])
                i += 1
            i += 1  # skip closing """

            code = "\n".join(code_lines).strip()
            if code:
                cells.append(nbformat.v4.new_code_cell(code))
            continue

        i += 1

    # Flush trailing markdown
    if pending_markdown:
        cells.append(nbformat.v4.new_markdown_cell("\n".join(pending_markdown)))

    return cells


def convert_file(src_name: str, dst_name: str) -> None:
    src_path = NOTEBOOKS_DIR / src_name
    dst_path = NOTEBOOKS_DIR / dst_name

    if not src_path.exists():
        print(f"  SKIP (not found): {src_path}")
        return

    text  = src_path.read_text(encoding="utf-8")
    cells = parse_cells(text)

    nb = nbformat.v4.new_notebook()
    nb.metadata["kernelspec"] = {
        "display_name": "Python 3",
        "language": "python",
        "name": "python3",
    }
    nb.metadata["language_info"] = {"name": "python", "version": "3.10.0"}
    nb.metadata["colab"] = {
        "provenance": [],
        "gpuType": "T4",
    }
    nb.metadata["accelerator"] = "GPU"
    nb.cells = cells

    nbformat.write(nb, dst_path)
    print(f"  ✓ {src_name} → {dst_name}  ({len(cells)} cells)")


def main():
    print("Converting .py notebooks to .ipynb …\n")
    try:
        import nbformat
    except ImportError:
        print("ERROR: Run  pip install nbformat  first.")
        return

    for src, dst in SOURCE_FILES:
        convert_file(src, dst)

    print("\nDone! Upload the .ipynb files to Google Colab:")
    print("  Colab → File → Upload notebook → select .ipynb")


if __name__ == "__main__":
    main()

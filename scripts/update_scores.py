# pip install openpyxl --break-system-packages
#
# Usage:
#   python3 scripts/update_scores.py            # update in place
#   python3 scripts/update_scores.py --dry-run  # preview changes only

import json
import sys
import os

try:
    import openpyxl
except ImportError:
    print("ERROR: openpyxl is not installed.")
    print("       Run: pip install openpyxl --break-system-packages")
    sys.exit(1)

# ── Paths ──────────────────────────────────────────────────────────────────────
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
XLSX_PATH    = os.path.join(PROJECT_ROOT, "src", "data", "project_scores_v2.xlsx")
JSON_PATH    = os.path.join(PROJECT_ROOT, "src", "data", "projects.json")

# ── Score field mapping (column index → JSON key) ─────────────────────────────
# Columns D–H are indices 3–7 (0-based)
SCORE_COLUMNS = {
    3: "computationalDesign",
    4: "artifactsInterfaces",
    5: "publicRealm",
    6: "architecture",
    7: "futures",
}

DRY_RUN = "--dry-run" in sys.argv


def parse_presets(cell_value):
    """Parse a comma-separated preset string into a list, or return None."""
    if cell_value is None:
        return None
    s = str(cell_value).strip()
    if not s:
        return None
    parts = [p.strip().upper() for p in s.split(",") if p.strip()]
    return parts if parts else None


def validate_score(value, project_id, field):
    """Return the score as int if valid (0-100), else print a warning and return None."""
    if value is None:
        return None
    try:
        n = int(float(value))
    except (TypeError, ValueError):
        print(f"  WARNING [{project_id}] {field}: non-numeric value {value!r} — skipped")
        return None
    if not (0 <= n <= 100):
        print(f"  WARNING [{project_id}] {field}: {n} out of range (0–100) — skipped")
        return None
    return n


def validate_priority(value, project_id):
    """Return priority as int if valid (0-5), else print a warning and return None."""
    if value is None:
        return None
    try:
        n = int(float(value))
    except (TypeError, ValueError):
        print(f"  WARNING [{project_id}] priority: non-numeric value {value!r} — skipped")
        return None
    if not (0 <= n <= 5):
        print(f"  WARNING [{project_id}] priority: {n} out of range (0–5) — skipped")
        return None
    return n


def main():
    # ── Load spreadsheet ────────────────────────────────────────────────────────
    if not os.path.exists(XLSX_PATH):
        print(f"ERROR: Spreadsheet not found at {XLSX_PATH}")
        sys.exit(1)

    wb = openpyxl.load_workbook(XLSX_PATH, data_only=True)
    ws = wb.active  # Sheet 1

    # ── Load JSON ───────────────────────────────────────────────────────────────
    if not os.path.exists(JSON_PATH):
        print(f"ERROR: projects.json not found at {JSON_PATH}")
        sys.exit(1)

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Build a lookup: project ID → project dict
    projects_by_id = {p["id"]: p for p in data.get("projects", [])}
    json_ids  = set(projects_by_id.keys())
    sheet_ids = set()

    # ── Process rows (skip row 1 header + row 2 instructions) ──────────────────
    changes = []  # list of (project_id, field_path, old_value, new_value)

    for row in ws.iter_rows(min_row=3, values_only=True):
        project_id = row[0]
        if project_id is None:
            continue  # blank row

        project_id = str(project_id).strip()
        if not project_id:
            continue

        sheet_ids.add(project_id)

        if project_id not in projects_by_id:
            print(f"  WARNING: Project ID {project_id!r} not found in projects.json — skipped")
            continue

        proj = projects_by_id[project_id]

        # ── Category scores ────────────────────────────────────────────────────
        for col_idx, field_name in SCORE_COLUMNS.items():
            raw = row[col_idx] if col_idx < len(row) else None
            score = validate_score(raw, project_id, field_name)
            if score is None:
                continue
            old = proj.get("categoryScores", {}).get(field_name)
            if old != score:
                changes.append((project_id, f"categoryScores.{field_name}", old, score))
            if not DRY_RUN:
                proj.setdefault("categoryScores", {})[field_name] = score

        # ── Priority ───────────────────────────────────────────────────────────
        raw_priority = row[8] if len(row) > 8 else None
        priority = validate_priority(raw_priority, project_id)
        if priority is not None:
            old = proj.get("priority")
            if old != priority:
                changes.append((project_id, "priority", old, priority))
            if not DRY_RUN:
                proj["priority"] = priority

        # ── Presets ────────────────────────────────────────────────────────────
        raw_presets = row[9] if len(row) > 9 else None
        presets = parse_presets(raw_presets)
        old_presets = proj.get("presets")
        if old_presets != presets:
            changes.append((project_id, "presets", old_presets, presets))
        if not DRY_RUN:
            proj["presets"] = presets

    # ── Write updated JSON ──────────────────────────────────────────────────────
    if not DRY_RUN:
        with open(JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write("\n")

    # ── Summary ────────────────────────────────────────────────────────────────
    updated_ids = {pid for pid, *_ in changes}
    not_in_json  = sheet_ids - json_ids
    not_in_sheet = json_ids - sheet_ids

    print()
    if DRY_RUN:
        print("── DRY RUN — no files were modified ──────────────────────────────────────────")
        if changes:
            for pid, field, old, new in changes:
                print(f"  {pid:8s}  {field:40s}  {str(old):>12} → {new}")
        else:
            print("  (no changes)")
        print()

    print(f"Projects updated:         {len(updated_ids)}")
    print(f"Total field changes:      {len(changes)}")

    if not_in_json:
        print(f"\nWARNING — in spreadsheet but NOT in JSON ({len(not_in_json)}):")
        for pid in sorted(not_in_json):
            print(f"  {pid}")

    if not_in_sheet:
        print(f"\nWARNING — in JSON but NOT in spreadsheet ({len(not_in_sheet)}):")
        for pid in sorted(not_in_sheet):
            print(f"  {pid}")

    if not DRY_RUN and changes:
        print(f"\nWrote updated projects.json  ({len(data.get('projects', []))} projects)")


if __name__ == "__main__":
    main()

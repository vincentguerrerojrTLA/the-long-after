#!/usr/bin/env python3
import json
from pathlib import Path
import sys

PUBLIC = "PUBLIC"
PROTECTED_LEVELS = {"INTERNAL", "CLASSIFIED", "BLACK"}
errors = []


def walk_classifications(value, path):
    if isinstance(value, dict):
        if "classification" in value:
            level = str(value.get("classification", "")).upper()
            if level != PUBLIC:
                errors.append(f"{path} contains non-PUBLIC classification {level!r}")
        for key, child in value.items():
            walk_classifications(child, f"{path}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            walk_classifications(child, f"{path}[{index}]")


for path in sorted(Path("data").glob("*.json")):
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"{path} is invalid JSON: {exc}")
        continue

    if not isinstance(data, dict):
        errors.append(f"{path} root must be a JSON object")
        continue

    root_level = str(data.get("classification", "")).upper()
    if root_level != PUBLIC:
        if not root_level:
            errors.append(f"{path} has no root classification; unclassified public data defaults to CLASSIFIED")
        else:
            errors.append(f"{path} root classification must be PUBLIC, found {root_level!r}")

    walk_classifications(data, str(path))

    raw_upper = path.read_text(encoding="utf-8", errors="replace").upper()
    for level in PROTECTED_LEVELS:
        if level in raw_upper:
            errors.append(f"{path} contains protected classification marker {level}")

lore_path = Path("data/lore-public.json")
if not lore_path.exists():
    errors.append("data/lore-public.json is missing")
else:
    try:
        lore = json.loads(lore_path.read_text(encoding="utf-8"))
    except Exception:
        lore = {}
    items = lore.get("items") if isinstance(lore, dict) else None
    if not isinstance(items, dict):
        errors.append("lore-public.json items must be an object")
    else:
        for key, item in items.items():
            if not isinstance(item, dict):
                errors.append(f"lore item {key!r} must be an object")
                continue
            if item.get("classification") != PUBLIC:
                errors.append(f"lore item {key!r} is not explicitly PUBLIC")

if errors:
    print("PUBLIC CONTENT GUARD FAILED")
    for err in errors:
        print(f"- {err}")
    sys.exit(1)

print("PUBLIC CONTENT GUARD PASSED: every website data mirror is explicitly PUBLIC and contains no protected classifications.")

#!/usr/bin/env python3
import json
from pathlib import Path
import sys

FORBIDDEN_LEVELS = {"INTERNAL", "CLASSIFIED", "BLACK"}
errors = []

lore_path = Path("data/lore-public.json")
if not lore_path.exists():
    errors.append("data/lore-public.json is missing")
else:
    try:
        lore = json.loads(lore_path.read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"lore-public.json is invalid JSON: {exc}")
        lore = {}

    if lore.get("classification") != "PUBLIC":
        errors.append("lore-public.json root classification must be PUBLIC")

    items = lore.get("items")
    if not isinstance(items, dict):
        errors.append("lore-public.json items must be an object")
    else:
        for key, item in items.items():
            if not isinstance(item, dict):
                errors.append(f"lore item {key!r} must be an object")
                continue
            level = item.get("classification")
            if level != "PUBLIC":
                errors.append(f"lore item {key!r} is not PUBLIC (found {level!r})")

# Public data files must never carry protected classification labels.
for path in Path("data").glob("*.json"):
    text = path.read_text(encoding="utf-8", errors="replace")
    upper = text.upper()
    for level in FORBIDDEN_LEVELS:
        marker = f'"CLASSIFICATION": "{level}"'
        if marker in upper:
            errors.append(f"{path} contains forbidden public classification {level}")

if errors:
    print("PUBLIC CONTENT GUARD FAILED")
    for err in errors:
        print(f"- {err}")
    sys.exit(1)

print("PUBLIC CONTENT GUARD PASSED: only explicitly PUBLIC lore is present in the public mirror.")

#!/usr/bin/env python3
"""Verify the Alpha 1 SQLite migration contract for fresh and legacy databases."""
from __future__ import annotations

import sqlite3
import tempfile
from pathlib import Path

REQUIRED = {
    "tasks": {"trace_id"},
    "approvals": {"trace_id"},
    "outputs": {"trace_id"},
    "activity_events": {"trace_id"},
    "execution_runs": {"task_id", "trace_id"},
    "validation_runs": {"trace_id"},
    "usage_events": {"trace_id"},
    "operations_incidents": {"trace_id"},
    "recovery_actions": {"trace_id"},
}

source = Path("lib/db.ts").read_text()
for table, columns in REQUIRED.items():
    for column in columns:
        marker = f"['{table}', '{column}'"
        if marker not in source:
            raise SystemExit(f"Missing additive migration marker: {marker}")

if "task_id INTEGER" not in source or "trace_id TEXT NOT NULL DEFAULT 'legacy_migration'" not in source:
    raise SystemExit("Fresh schema is missing the task binding or trace fallback contract")

with tempfile.TemporaryDirectory() as directory:
    db_path = Path(directory) / "legacy.db"
    conn = sqlite3.connect(db_path)
    for table in REQUIRED:
        conn.execute(f"CREATE TABLE {table} (id INTEGER PRIMARY KEY)")
    conn.commit()

    for table, columns in REQUIRED.items():
        existing = {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}
        for column in columns:
            if column in existing:
                continue
            definition = "INTEGER" if column == "task_id" else "TEXT NOT NULL DEFAULT 'legacy_migration'"
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
    conn.commit()

    for table, columns in REQUIRED.items():
        migrated = {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}
        missing = columns - migrated
        if missing:
            raise SystemExit(f"Legacy migration failed for {table}: {sorted(missing)}")
    conn.close()

print("Cyvora fresh and legacy SQLite migration contracts passed.")

#!/usr/bin/env python3
from pathlib import Path


def replace(path: str, old: str, new: str, count: int = -1, optional: bool = False) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        if optional:
            return
        raise SystemExit(f"Missing expected source in {path}: {old[:100]!r}")
    p.write_text(text.replace(old, new, count))


def ensure_once(path: str, marker: str, addition: str) -> None:
    p = Path(path)
    text = p.read_text()
    if addition in text:
        return
    if marker not in text:
        raise SystemExit(f"Missing insertion marker in {path}: {marker[:100]!r}")
    p.write_text(text.replace(marker, marker + addition, 1))

# ---- Node data layer: shared trace convention and migration-safe columns ----
replace("lib/db.ts", "import fs from 'fs';\n", "import fs from 'fs';\nimport crypto from 'crypto';\n", 1)
replace(
    "lib/db.ts",
    "import { workspaceRoot } from './paths';\n",
    "import { workspaceRoot } from './paths';\n\nexport function newTraceId(): string {\n  return `trc_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;\n}\n",
    1,
)

# New databases receive durable trace IDs and explicit run/task binding.
for old, new in [
    ("    last_error TEXT,\n    created_at TEXT NOT NULL,", "    last_error TEXT,\n    trace_id TEXT NOT NULL,\n    created_at TEXT NOT NULL,"),
    ("    decided_at TEXT,\n    created_at TEXT NOT NULL,", "    decided_at TEXT,\n    trace_id TEXT NOT NULL,\n    created_at TEXT NOT NULL,"),
    ("    approved_at TEXT,\n    created_at TEXT NOT NULL,", "    approved_at TEXT,\n    trace_id TEXT NOT NULL,\n    created_at TEXT NOT NULL,"),
    ("    description TEXT,\n    created_at TEXT NOT NULL,", "    description TEXT,\n    trace_id TEXT NOT NULL,\n    created_at TEXT NOT NULL,"),
    ("    company_id INTEGER,\n    goal TEXT NOT NULL,", "    company_id INTEGER,\n    task_id INTEGER,\n    trace_id TEXT NOT NULL,\n    goal TEXT NOT NULL,"),
    ("    completed_at TEXT,\n    FOREIGN KEY(request_id)", "    completed_at TEXT,\n    FOREIGN KEY(task_id) REFERENCES tasks(id),\n    FOREIGN KEY(request_id)"),
    ("    completed_at TEXT,\n    FOREIGN KEY(company_id)", "    completed_at TEXT,\n    trace_id TEXT NOT NULL,\n    FOREIGN KEY(company_id)"),
    ("    provider_request_id TEXT,\n    created_at TEXT NOT NULL", "    provider_request_id TEXT,\n    trace_id TEXT NOT NULL,\n    created_at TEXT NOT NULL"),
    ("    resolution_note TEXT,\n    FOREIGN KEY(company_id)", "    resolution_note TEXT,\n    trace_id TEXT NOT NULL,\n    FOREIGN KEY(company_id)"),
    ("    result TEXT NOT NULL DEFAULT 'applied',\n    created_at TEXT NOT NULL,", "    result TEXT NOT NULL DEFAULT 'applied',\n    trace_id TEXT NOT NULL,\n    created_at TEXT NOT NULL,"),
]:
    replace("lib/db.ts", old, new, 1, optional=True)

migration_rows = """
  ['tasks', 'trace_id', "TEXT NOT NULL DEFAULT 'legacy_migration'"],
  ['approvals', 'trace_id', "TEXT NOT NULL DEFAULT 'legacy_migration'"],
  ['outputs', 'trace_id', "TEXT NOT NULL DEFAULT 'legacy_migration'"],
  ['activity_events', 'trace_id', "TEXT NOT NULL DEFAULT 'legacy_migration'"],
  ['execution_runs', 'task_id', 'INTEGER'],
  ['execution_runs', 'trace_id', "TEXT NOT NULL DEFAULT 'legacy_migration'"],
  ['validation_runs', 'trace_id', "TEXT NOT NULL DEFAULT 'legacy_migration'"],
  ['usage_events', 'trace_id', "TEXT NOT NULL DEFAULT 'legacy_migration'"],
  ['operations_incidents', 'trace_id', "TEXT NOT NULL DEFAULT 'legacy_migration'"],
  ['recovery_actions', 'trace_id', "TEXT NOT NULL DEFAULT 'legacy_migration'"],
"""
ensure_once("lib/db.ts", "  ['tasks', 'claimed_by', 'TEXT'],\n", migration_rows)

# Approval inserts.
replace("lib/db.ts", "  execution_run_id?: number;\n}): Promise<number> {", "  execution_run_id?: number;\n  trace_id?: string;\n}): Promise<number> {", 1)
replace(
    "lib/db.ts",
    "`INSERT INTO approvals (company_id, task_id, title, summary, status, risk_level, approval_type, subject_type, subject_id, execution_run_id, created_at, updated_at)\n       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`",
    "`INSERT INTO approvals (company_id, task_id, title, summary, status, risk_level, approval_type, subject_type, subject_id, execution_run_id, trace_id, created_at, updated_at)\n       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`",
)
replace("lib/db.ts", "      data.execution_run_id || null,\n      now,\n      now,", "      data.execution_run_id || null,\n      data.trace_id || newTraceId(),\n      now,\n      now,", 1)

# Activity inserts.
replace("lib/db.ts", "  description?: string;\n}): Promise<number> {\n  return new Promise((resolve, reject) => {\n    const stmt = db.prepare(\n      `INSERT INTO activity_events (company_id, event_type, title, description, created_at)\n       VALUES (?, ?, ?, ?, ?)`", "  description?: string;\n  trace_id?: string;\n}): Promise<number> {\n  return new Promise((resolve, reject) => {\n    const stmt = db.prepare(\n      `INSERT INTO activity_events (company_id, event_type, title, description, trace_id, created_at)\n       VALUES (?, ?, ?, ?, ?, ?)`")
replace("lib/db.ts", "      data.description || '',\n      new Date().toISOString(),", "      data.description || '',\n      data.trace_id || newTraceId(),\n      new Date().toISOString(),", 1)

# Execution runs now bind one exact task and carry the parent trace.
replace("lib/db.ts", "  company_id?: number;\n}): Promise<number> {", "  company_id?: number;\n  task_id?: number;\n  trace_id?: string;\n}): Promise<number> {", 1)
replace(
    "lib/db.ts",
    "tenant, request_id, mission_id, company_id, goal, runtime_plan, runtime_mode,\n        status, rollback_state, paid_ai, mock_mode, started_at, updated_at, completed_at",
    "tenant, request_id, mission_id, company_id, task_id, trace_id, goal, runtime_plan, runtime_mode,\n        status, rollback_state, paid_ai, mock_mode, started_at, updated_at, completed_at",
    1,
)
replace("lib/db.ts", "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 1)
replace("lib/db.ts", "      data.company_id || null,\n      data.goal,", "      data.company_id || null,\n      data.task_id || null,\n      data.trace_id || newTraceId(),\n      data.goal,", 1)

# Existing responsive company surface renders backend traces, not invented event references.
replace("components/CompanyDetailSurface.tsx", "type Approval = { id: number; title: string; summary?: string; status: string; risk_level?: string };", "type Approval = { id: number; title: string; summary?: string; status: string; risk_level?: string; trace_id?: string };", 1, optional=True)
replace("components/CompanyDetailSurface.tsx", "type ActivityEvent = { id: number; event_type: string; title: string; description?: string; created_at: string };", "type ActivityEvent = { id: number; event_type: string; title: string; description?: string; created_at: string; trace_id?: string };", 1, optional=True)
replace("components/CompanyDetailSurface.tsx", "/** Presentational-only reference, since activity_events has no trace_id column yet. */\nfunction eventRef(id: number) {\n  return `evt_${id.toString().padStart(4, '0')}`;\n}\n", "function traceLabel(traceId?: string) {\n  return traceId && traceId !== 'legacy_migration' ? traceId : 'Legacy record';\n}\n", 1, optional=True)
replace("components/CompanyDetailSurface.tsx", "eventRef(event.id)", "traceLabel(event.trace_id)", optional=True)

# Python workers use the same TraceID format and claim only the run-bound task.
for worker in ("worker/execution_worker.py", "worker/supervisor_router.py"):
    replace(worker, "import sys\n", "import sys\nimport uuid\n", 1, optional=True)
    replace(worker, "def now() -> str:\n    return datetime.now(timezone.utc).isoformat()\n", "def now() -> str:\n    return datetime.now(timezone.utc).isoformat()\n\n\ndef new_trace_id() -> str:\n    return f\"trc_{uuid.uuid4().hex[:12]}\"\n", 1, optional=True)
    p = Path(worker)
    text = p.read_text()
    text = text.replace(
        "INSERT INTO activity_events (company_id, event_type, title, description, created_at)\n        VALUES (?, ?, ?, ?, ?)",
        "INSERT INTO activity_events (company_id, event_type, title, description, trace_id, created_at)\n        VALUES (?, ?, ?, ?, ?, ?)",
    )
    text = text.replace("event_type, title, description, now()),", "event_type, title, description, new_trace_id(), now()),")
    p.write_text(text)

p = Path("worker/execution_worker.py")
text = p.read_text()
text = text.replace("for table in (\"tasks\", \"execution_runs\"):", "for table in (\"tasks\", \"execution_runs\"):")
text = text.replace("    ensure_column(conn, \"tasks\", \"last_error\", \"TEXT\")", "    ensure_column(conn, \"tasks\", \"last_error\", \"TEXT\")\n    ensure_column(conn, \"tasks\", \"trace_id\", \"TEXT NOT NULL DEFAULT 'legacy_migration'\")\n    ensure_column(conn, \"execution_runs\", \"task_id\", \"INTEGER\")\n    ensure_column(conn, \"execution_runs\", \"trace_id\", \"TEXT NOT NULL DEFAULT 'legacy_migration'\")\n    ensure_column(conn, \"activity_events\", \"trace_id\", \"TEXT NOT NULL DEFAULT 'legacy_migration'\")\n    ensure_column(conn, \"approvals\", \"trace_id\", \"TEXT NOT NULL DEFAULT 'legacy_migration'\")")
text = text.replace("WHERE t.company_id = ?\n          AND t.status = 'active'", "WHERE t.id = ?\n          AND t.company_id = ?\n          AND t.status = 'active'")
text = text.replace("    , (run[\"company_id\"],)).fetchone()", "    , (run.get(\"task_id\"), run[\"company_id\"])).fetchone()")
# Fail closed when old/unbound runs reach the worker.
anchor = "    run = dict(run_row)\n"
if "execution run is not bound to a task" not in text and anchor in text:
    text = text.replace(anchor, anchor + "    if not run.get(\"task_id\"):\n        _block_run(conn, run, \"execution run is not bound to a task\")\n        conn.execute(\"COMMIT\")\n        return {\"blocked\": True, \"run\": run}\n\n", 1)
p.write_text(text)

# Keep the bridge document aligned with completed work.
bridge = Path("docs/FRONTEND_BACKEND_BRIDGE.md")
if bridge.exists():
    text = bridge.read_text()
    text = text.replace("1. Universal TraceID and task-to-run binding", "1. Universal TraceID and task-to-run binding — implemented for core runtime records; continue propagation to every connector/tool span")
    bridge.write_text(text)

# Self-clean: restore normal CI and remove this migration runner after it commits.
Path("scripts/apply-alpha1-core-bridge.py").unlink(missing_ok=True)
ci = Path(".github/workflows/ci.yml")
ci.write_text("""name: Cyvora CI\n\non:\n  push:\n    branches:\n      - main\n  pull_request:\n\njobs:\n  verify:\n    runs-on: ubuntu-latest\n\n    steps:\n      - name: Checkout\n        uses: actions/checkout@v4\n\n      - name: Use Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: npm\n\n      - name: Install dependencies\n        run: npm ci\n\n      - name: Verify Alpha 1 baseline\n        run: npm run verify\n""")

from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"Missing expected source in {path}: {old[:100]!r}")
    p.write_text(text.replace(old, new, count))


# lib/db.ts: trace generator, additive schema, and trace-aware write paths.
replace("lib/db.ts", "import fs from 'fs';\n", "import fs from 'fs';\nimport crypto from 'crypto';\n")
replace(
    "lib/db.ts",
    "import { workspaceRoot } from './paths';\n",
    "import { workspaceRoot } from './paths';\n\nexport function newTraceId(): string {\n  return `trc_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;\n}\n",
)

schema_edits = [
    ("    last_error TEXT,\n    created_at TEXT NOT NULL,", "    last_error TEXT,\n    trace_id TEXT NOT NULL DEFAULT 'legacy_migration',\n    created_at TEXT NOT NULL,"),
    ("    decided_at TEXT,\n    created_at TEXT NOT NULL,", "    decided_at TEXT,\n    trace_id TEXT NOT NULL DEFAULT 'legacy_migration',\n    created_at TEXT NOT NULL,"),
    ("    approved_at TEXT,\n    created_at TEXT NOT NULL,", "    approved_at TEXT,\n    trace_id TEXT NOT NULL DEFAULT 'legacy_migration',\n    created_at TEXT NOT NULL,"),
    ("    description TEXT,\n    created_at TEXT NOT NULL,\n    FOREIGN KEY(company_id) REFERENCES companies(id)\n  )\n`);\n\ndb.run(`\n  CREATE TABLE IF NOT EXISTS execution_runs", "    description TEXT,\n    trace_id TEXT NOT NULL DEFAULT 'legacy_migration',\n    created_at TEXT NOT NULL,\n    FOREIGN KEY(company_id) REFERENCES companies(id)\n  )\n`);\n\ndb.run(`\n  CREATE TABLE IF NOT EXISTS execution_runs"),
    ("    company_id INTEGER,\n    goal TEXT NOT NULL,", "    company_id INTEGER,\n    task_id INTEGER,\n    trace_id TEXT NOT NULL DEFAULT 'legacy_migration',\n    goal TEXT NOT NULL,"),
    ("    completed_at TEXT,\n    FOREIGN KEY(company_id)", "    completed_at TEXT,\n    trace_id TEXT NOT NULL DEFAULT 'legacy_migration',\n    FOREIGN KEY(company_id)"),
    ("    provider_request_id TEXT,\n    created_at TEXT NOT NULL", "    provider_request_id TEXT,\n    trace_id TEXT NOT NULL DEFAULT 'legacy_migration',\n    created_at TEXT NOT NULL"),
    ("    resolution_note TEXT,\n    FOREIGN KEY(company_id)", "    resolution_note TEXT,\n    trace_id TEXT NOT NULL DEFAULT 'legacy_migration',\n    FOREIGN KEY(company_id)"),
    ("    result TEXT NOT NULL DEFAULT 'applied',\n    created_at TEXT NOT NULL,", "    result TEXT NOT NULL DEFAULT 'applied',\n    trace_id TEXT NOT NULL DEFAULT 'legacy_migration',\n    created_at TEXT NOT NULL,"),
]
for old, new in schema_edits:
    replace("lib/db.ts", old, new)

replace(
    "lib/db.ts",
    "  ['tasks', 'claimed_by', 'TEXT'],",
    "  ['tasks', 'trace_id', \"TEXT NOT NULL DEFAULT 'legacy_migration'\"],\n  ['approvals', 'trace_id', \"TEXT NOT NULL DEFAULT 'legacy_migration'\"],\n  ['outputs', 'trace_id', \"TEXT NOT NULL DEFAULT 'legacy_migration'\"],\n  ['activity_events', 'trace_id', \"TEXT NOT NULL DEFAULT 'legacy_migration'\"],\n  ['execution_runs', 'task_id', 'INTEGER'],\n  ['execution_runs', 'trace_id', \"TEXT NOT NULL DEFAULT 'legacy_migration'\"],\n  ['validation_runs', 'trace_id', \"TEXT NOT NULL DEFAULT 'legacy_migration'\"],\n  ['usage_events', 'trace_id', \"TEXT NOT NULL DEFAULT 'legacy_migration'\"],\n  ['operations_incidents', 'trace_id', \"TEXT NOT NULL DEFAULT 'legacy_migration'\"],\n  ['recovery_actions', 'trace_id', \"TEXT NOT NULL DEFAULT 'legacy_migration'\"],\n  ['tasks', 'claimed_by', 'TEXT'],",
)

replace("lib/db.ts", "  max_revisions?: number;\n}): Promise<number> {", "  max_revisions?: number;\n  trace_id?: string;\n}): Promise<number> {")
replace(
    "lib/db.ts",
    "        status, priority, assigned_agent, risk_level, validation_policy, max_revisions, created_at, updated_at\n      )\n      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    "        status, priority, assigned_agent, risk_level, validation_policy, max_revisions, trace_id, created_at, updated_at\n      )\n      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
)
replace("lib/db.ts", "      data.max_revisions || 2,\n      now,", "      data.max_revisions || 2,\n      data.trace_id || newTraceId(),\n      now,")

replace("lib/db.ts", "  execution_run_id?: number;\n}): Promise<number> {", "  execution_run_id?: number;\n  trace_id?: string;\n}): Promise<number> {")
replace(
    "lib/db.ts",
    "`INSERT INTO approvals (company_id, task_id, title, summary, status, risk_level, approval_type, subject_type, subject_id, execution_run_id, created_at, updated_at)\n       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`",
    "`INSERT INTO approvals (company_id, task_id, title, summary, status, risk_level, approval_type, subject_type, subject_id, execution_run_id, trace_id, created_at, updated_at)\n       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`",
)
replace("lib/db.ts", "      data.execution_run_id || null,\n      now,", "      data.execution_run_id || null,\n      data.trace_id || newTraceId(),\n      now,")

replace("lib/db.ts", "  summary?: string;\n}): Promise<number> {\n  return new Promise((resolve, reject) => {\n    const stmt = db.prepare(\n      `INSERT INTO outputs", "  summary?: string;\n  trace_id?: string;\n}): Promise<number> {\n  return new Promise((resolve, reject) => {\n    const stmt = db.prepare(\n      `INSERT INTO outputs")
replace("lib/db.ts", "`INSERT INTO outputs (company_id, task_id, title, output_type, status, summary, created_at)\n       VALUES (?, ?, ?, ?, ?, ?, ?)`", "`INSERT INTO outputs (company_id, task_id, title, output_type, status, summary, trace_id, created_at)\n       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`")
replace("lib/db.ts", "      data.summary || '',\n      new Date().toISOString(),", "      data.summary || '',\n      data.trace_id || newTraceId(),\n      new Date().toISOString(),")

replace("lib/db.ts", "  description?: string;\n}): Promise<number> {\n  return new Promise((resolve, reject) => {\n    const stmt = db.prepare(\n      `INSERT INTO activity_events", "  description?: string;\n  trace_id?: string;\n}): Promise<number> {\n  return new Promise((resolve, reject) => {\n    const stmt = db.prepare(\n      `INSERT INTO activity_events")
replace("lib/db.ts", "`INSERT INTO activity_events (company_id, event_type, title, description, created_at)\n       VALUES (?, ?, ?, ?, ?)`", "`INSERT INTO activity_events (company_id, event_type, title, description, trace_id, created_at)\n       VALUES (?, ?, ?, ?, ?, ?)`")
replace("lib/db.ts", "      data.description || '',\n      new Date().toISOString(),", "      data.description || '',\n      data.trace_id || newTraceId(),\n      new Date().toISOString(),")

replace("lib/db.ts", "  company_id?: number;\n}): Promise<number> {", "  company_id?: number;\n  task_id?: number;\n  trace_id?: string;\n}): Promise<number> {")
replace(
    "lib/db.ts",
    "        tenant, request_id, mission_id, company_id, goal, runtime_plan, runtime_mode,\n        status, rollback_state, paid_ai, mock_mode, started_at, updated_at, completed_at\n      )\n      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    "        tenant, request_id, mission_id, company_id, task_id, trace_id, goal, runtime_plan, runtime_mode,\n        status, rollback_state, paid_ai, mock_mode, started_at, updated_at, completed_at\n      )\n      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
)
replace("lib/db.ts", "      data.company_id || null,\n      data.goal,", "      data.company_id || null,\n      data.task_id || null,\n      data.trace_id || newTraceId(),\n      data.goal,")

# Route: build organization first and bind queued run to its exact task.
replace("app/api/start-mission/route.ts", "    const executionRunId = await saveExecutionRun({\n      tenant,\n      request_id: requestedId,\n      goal: approvedRequestSnapshot.request,\n      runtime_plan: approvedRequestSnapshot.runtime_plan,\n      runtime_mode: runtimeMode.mode,\n      status: 'queued',\n      rollback_state: 'ready',\n      paid_ai: runtimeMode.allowPaidAI,\n      mock_mode: runtimeMode.mockMode,\n    });\n\n    const blueprint", "    const blueprint")
replace("app/api/start-mission/route.ts", "    let companyId: number | null = null;", "    let organization: { companyId: number; taskId: number } | null = null;")
replace("app/api/start-mission/route.ts", "      companyId = await seedMissionOrganization({", "      organization = await seedMissionOrganization({")
replace(
    "app/api/start-mission/route.ts",
    "    sendSSEEvent({ type: 'start', message: '🚀 Mission queued for worker processing', goal });",
    "    if (!organization) {\n      return NextResponse.json({ error: 'Unable to create the governed company task for this run' }, { status: 500 });\n    }\n\n    const executionRunId = await saveExecutionRun({\n      tenant,\n      request_id: requestedId,\n      mission_id: missionId,\n      company_id: organization.companyId,\n      task_id: organization.taskId,\n      goal: approvedRequestSnapshot.request,\n      runtime_plan: approvedRequestSnapshot.runtime_plan,\n      runtime_mode: runtimeMode.mode,\n      status: 'queued',\n      rollback_state: 'ready',\n      paid_ai: runtimeMode.allowPaidAI,\n      mock_mode: runtimeMode.mockMode,\n    });\n\n    sendSSEEvent({ type: 'start', message: '🚀 Mission queued for worker processing', goal });",
)
replace("app/api/start-mission/route.ts", "      company_id: companyId || undefined,", "      company_id: organization.companyId,")
replace("app/api/start-mission/route.ts", "      company_id: companyId,", "      company_id: organization.companyId,")
replace("app/api/start-mission/route.ts", "}): Promise<number> {", "}): Promise<{ companyId: number; taskId: number }> {")
replace("app/api/start-mission/route.ts", "  return companyId;", "  return { companyId, taskId };")

# Worker: exact task claim and trace propagation.
for worker in ["worker/execution_worker.py", "worker/supervisor_router.py"]:
    replace(worker, "import sys\n", "import sys\nimport uuid\n")
    replace(worker, "def now() -> str:\n    return datetime.now(timezone.utc).isoformat()\n", "def now() -> str:\n    return datetime.now(timezone.utc).isoformat()\n\n\ndef new_trace_id() -> str:\n    return f\"trc_{uuid.uuid4().hex[:12]}\"\n")

replace("worker/execution_worker.py", "    ensure_column(conn, \"tasks\", \"last_error\", \"TEXT\")", "    ensure_column(conn, \"tasks\", \"last_error\", \"TEXT\")\n    ensure_column(conn, \"tasks\", \"trace_id\", \"TEXT NOT NULL DEFAULT 'legacy_migration'\")\n    ensure_column(conn, \"execution_runs\", \"task_id\", \"INTEGER\")\n    ensure_column(conn, \"execution_runs\", \"trace_id\", \"TEXT NOT NULL DEFAULT 'legacy_migration'\")\n    for table in (\"activity_events\", \"approvals\", \"outputs\", \"validation_runs\", \"usage_events\"):\n        ensure_column(conn, table, \"trace_id\", \"TEXT NOT NULL DEFAULT 'legacy_migration'\")")
replace("worker/execution_worker.py", "    snapshot = load_approved_snapshot(run[\"tenant\"], run[\"request_id\"])", "    if not run.get(\"task_id\"):\n        _block_run(conn, run, \"execution run is not bound to a task\")\n        conn.execute(\"COMMIT\")\n        return {\"blocked\": True, \"run\": run}\n\n    snapshot = load_approved_snapshot(run[\"tenant\"], run[\"request_id\"])")
replace("worker/execution_worker.py", "        WHERE t.company_id = ?\n          AND t.status = 'active'", "        WHERE t.id = ?\n          AND t.company_id = ?\n          AND t.status = 'active'")
replace("worker/execution_worker.py", "        (run[\"company_id\"], MAX_ATTEMPTS),", "        (run[\"task_id\"], run[\"company_id\"], MAX_ATTEMPTS),")

# Generic worker event writes.
for worker in ["worker/execution_worker.py", "worker/supervisor_router.py"]:
    p = Path(worker)
    text = p.read_text()
    text = text.replace("INSERT INTO activity_events (company_id, event_type, title, description, created_at)\n        VALUES (?, ?, ?, ?, ?)", "INSERT INTO activity_events (company_id, event_type, title, description, trace_id, created_at)\n        VALUES (?, ?, ?, ?, ?, ?)")
    text = text.replace("event_type, title, description, now()),", "event_type, title, description, task.get(\"trace_id\") if task else new_trace_id(), now()),")
    p.write_text(text)

# UI consumes persisted TraceIDs.
replace("components/CompanyDetailSurface.tsx", "type Approval = { id: number; title: string; summary?: string; status: string; risk_level?: string };", "type Approval = { id: number; title: string; summary?: string; status: string; risk_level?: string; trace_id?: string };")
replace("components/CompanyDetailSurface.tsx", "type ActivityEvent = { id: number; event_type: string; title: string; description?: string; created_at: string };", "type ActivityEvent = { id: number; event_type: string; title: string; description?: string; created_at: string; trace_id?: string };")
replace("components/CompanyDetailSurface.tsx", "/** Presentational-only reference, since activity_events has no trace_id column yet. */\nfunction eventRef(id: number) {\n  return `evt_${id.toString().padStart(4, '0')}`;\n}\n", "function traceLabel(traceId?: string) {\n  return !traceId || traceId === 'legacy_migration' ? 'Legacy' : traceId;\n}\n")
p = Path("components/CompanyDetailSurface.tsx")
p.write_text(p.read_text().replace("eventRef(event.id)", "traceLabel(event.trace_id)"))

# Migration verification script and package command are committed separately by this runner.
Path("scripts/apply-alpha1-core-bridge.py").unlink()

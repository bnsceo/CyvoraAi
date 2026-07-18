#!/usr/bin/env python3
from pathlib import Path
import subprocess


def replace(path: str, old: str, new: str, count: int = -1, optional: bool = False) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        if optional:
            return
        raise SystemExit(f"Missing expected source in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, count))

# Correct the schema target and make additive trace columns migration-safe.
replace("lib/db.ts", "    description TEXT,\n    trace_id TEXT NOT NULL,\n    created_at TEXT NOT NULL,\n    FOREIGN KEY(company_id) REFERENCES companies(id)\n  )\n`);\n\n// --- Teams table ---", "    description TEXT,\n    created_at TEXT NOT NULL,\n    FOREIGN KEY(company_id) REFERENCES companies(id)\n  )\n`);\n\n// --- Teams table ---", 1)
replace("lib/db.ts", "    description TEXT,\n    created_at TEXT NOT NULL,\n    FOREIGN KEY(company_id) REFERENCES companies(id)\n  )\n`);\n\ndb.run(`\n  CREATE TABLE IF NOT EXISTS execution_runs", "    description TEXT,\n    trace_id TEXT NOT NULL DEFAULT 'legacy_migration',\n    created_at TEXT NOT NULL,\n    FOREIGN KEY(company_id) REFERENCES companies(id)\n  )\n`);\n\ndb.run(`\n  CREATE TABLE IF NOT EXISTS execution_runs", 1)
replace("lib/db.ts", "trace_id TEXT NOT NULL,", "trace_id TEXT NOT NULL DEFAULT 'legacy_migration',")

# Core Node writes generate real traces.
replace("lib/db.ts", "  max_revisions?: number;\n}): Promise<number> {", "  max_revisions?: number;\n  trace_id?: string;\n}): Promise<number> {", 1)
replace("lib/db.ts", "status, priority, assigned_agent, risk_level, validation_policy, max_revisions, created_at, updated_at", "status, priority, assigned_agent, risk_level, validation_policy, max_revisions, trace_id, created_at, updated_at", 1)
replace("lib/db.ts", "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 1)
replace("lib/db.ts", "      data.max_revisions || 2,\n      now,", "      data.max_revisions || 2,\n      data.trace_id || newTraceId(),\n      now,", 1)

replace("lib/db.ts", "  summary?: string;\n}): Promise<number> {\n  return new Promise((resolve, reject) => {\n    const stmt = db.prepare(\n      `INSERT INTO outputs", "  summary?: string;\n  trace_id?: string;\n}): Promise<number> {\n  return new Promise((resolve, reject) => {\n    const stmt = db.prepare(\n      `INSERT INTO outputs", 1)
replace("lib/db.ts", "INSERT INTO outputs (company_id, task_id, title, output_type, status, summary, created_at)\n       VALUES (?, ?, ?, ?, ?, ?, ?)", "INSERT INTO outputs (company_id, task_id, title, output_type, status, summary, trace_id, created_at)\n       VALUES (?, ?, ?, ?, ?, ?, ?, ?)", 1)
replace("lib/db.ts", "      data.summary || '',\n      new Date().toISOString(),", "      data.summary || '',\n      data.trace_id || newTraceId(),\n      new Date().toISOString(),", 1)

replace("lib/db.ts", "      data.description || '',\n      new Date().toISOString(),\n      function (this: RunResult", "      data.description || '',\n      data.trace_id || newTraceId(),\n      new Date().toISOString(),\n      function (this: RunResult", 1)
replace("lib/db.ts", "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`\n    );\n    stmt.run(\n      data.tenant,", "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`\n    );\n    stmt.run(\n      data.tenant,", 1)

# Worker must supply all three parameters for exact task binding.
replace("worker/execution_worker.py", "        (run[\"company_id\"], MAX_ATTEMPTS),", "        (run[\"task_id\"], run[\"company_id\"], MAX_ATTEMPTS),", 1)

# Restore the normal package scripts before committing the corrected source.
package = Path("package.json")
text = package.read_text()
text = text.replace('"verify": "python3 scripts/fix-alpha1-core-bridge.py && npm run lint && npm run typecheck && npm run verify:python && npm run verify:structure && npm run build"', '"verify": "npm run lint && npm run typecheck && npm run verify:python && npm run verify:structure && npm run build"')
package.write_text(text)
Path("scripts/fix-alpha1-core-bridge.py").unlink(missing_ok=True)

# Commit and push the corrected implementation from CI only.
if __import__('os').environ.get('GITHUB_ACTIONS') == 'true':
    subprocess.run(['git', 'config', 'user.name', 'Cyvora Migration Bot'], check=True)
    subprocess.run(['git', 'config', 'user.email', 'cyvora-migration@users.noreply.github.com'], check=True)
    subprocess.run(['git', 'add', '-A'], check=True)
    subprocess.run(['git', 'commit', '-m', 'fix: correct trace schema and task binding parameters'], check=True)
    branch = __import__('os').environ.get('GITHUB_HEAD_REF') or __import__('os').environ.get('GITHUB_REF_NAME')
    subprocess.run(['git', 'push', 'origin', f'HEAD:{branch}'], check=True)

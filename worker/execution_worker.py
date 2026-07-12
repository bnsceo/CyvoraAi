#!/usr/bin/env python3
"""
execution_worker.py — deterministic execution worker for Cyvora.

Scope:
  1. Claim one queued execution run.
  2. Verify the exact approved harness snapshot for that run.
  3. Claim one approved task under the run's company.
  4. Resolve one persona, call one model, validate one JSON response.
  5. Write one output, one task result, and one execution-run result.
  6. Stop on any mismatch.

Exit codes:
  0  task executed and committed
  1  no eligible work found
  2  execution blocked before task claim
  3  model call failed
  4  schema validation failed
  5  unexpected/internal error
"""

from __future__ import annotations

import json
import os
import re
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

WORKSPACE_ROOT = Path(os.environ.get("JARVIS_WORKSPACE_ROOT", "/app"))
DB_PATH = Path(os.environ.get("MISSIONS_DB_PATH", WORKSPACE_ROOT / "data" / "missions.db"))
TENANTS_ROOT = Path(os.environ.get("TENANTS_ROOT", WORKSPACE_ROOT / "tenants"))
PERSONAS_DIR = Path(os.environ.get("AGENCY_AGENTS_DIR", WORKSPACE_ROOT / "personas"))
MOCK_MODE = os.environ.get("MOCK_MODE", "true").lower() in {"1", "true", "yes", "on"}
MODEL = os.environ.get("SUPERVISOR_MODEL", "claude-sonnet-5")
MAX_TOKENS = int(os.environ.get("SUPERVISOR_MAX_TOKENS", "1500"))

REQUIRED_FIELDS = {
    "summary": str,
    "deliverable": str,
    "status": str,
    "confidence": (int, float),
    "next_action": (str, type(None)),
}
ALLOWED_STATUS = {"completed", "blocked"}


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def open_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout=10000;")
    return conn


def snapshot_path(tenant: str, request_id: int) -> Path:
    return TENANTS_ROOT / tenant / "briefings" / f"harness_approval_{request_id}.json"


def load_approved_snapshot(tenant: str, request_id: int) -> dict[str, Any] | None:
    file_path = snapshot_path(tenant, request_id)
    if not file_path.exists():
        return None
    try:
        with file_path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except Exception:
        return None


def canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")


def resolve_persona(agent_name: str) -> Path:
    if not agent_name:
        raise LookupError("task has no assigned agent")

    target = slugify(agent_name)
    if not PERSONAS_DIR.exists():
        raise LookupError(f"persona directory not found: {PERSONAS_DIR}")

    hits = [path for path in PERSONAS_DIR.rglob("*.md") if path.stem == target]
    if len(hits) == 1:
        return hits[0]
    if len(hits) > 1:
        raise LookupError(f"ambiguous persona match for '{agent_name}': {[str(path) for path in hits]}")

    fallback = PERSONAS_DIR / "executive-ai.md"
    if fallback.exists():
        return fallback

    raise LookupError(f"no persona file matches agent '{agent_name}' (slug: {target})")


def claim_bundle(conn: sqlite3.Connection) -> dict[str, Any] | None:
    conn.execute("BEGIN IMMEDIATE")
    run_row = conn.execute(
        """
        SELECT *
        FROM execution_runs
        WHERE status = 'queued'
        ORDER BY started_at ASC, id ASC
        LIMIT 1
        """
    ).fetchone()

    if run_row is None:
        conn.execute("ROLLBACK")
        return None

    run = dict(run_row)
    snapshot = load_approved_snapshot(run["tenant"], run["request_id"])
    if snapshot is None:
        _block_run(conn, run, f"approved snapshot missing for request {run['request_id']}")
        conn.execute("COMMIT")
        return {"blocked": True, "run": run}

    if snapshot.get("approval_state") != "approved":
        _block_run(conn, run, "approved snapshot is not marked approved")
        conn.execute("COMMIT")
        return {"blocked": True, "run": run}

    if canonical_json(snapshot.get("runtime_plan")) != canonical_json(json.loads(run["runtime_plan"] or "{}")):
        _block_run(conn, run, "approved runtime plan does not match the queued execution run")
        conn.execute("COMMIT")
        return {"blocked": True, "run": run}

    task_row = conn.execute(
        """
        SELECT t.*, a.id AS approval_id
        FROM tasks t
        JOIN approvals a ON a.task_id = t.id
        WHERE t.company_id = ?
          AND t.status = 'active'
          AND a.status = 'approved'
        ORDER BY t.id ASC
        LIMIT 1
        """,
        (run["company_id"],),
    ).fetchone()

    if task_row is None:
        conn.execute("ROLLBACK")
        return None

    task = dict(task_row)

    run_claimed = conn.execute(
        "UPDATE execution_runs SET status = 'in_progress', updated_at = ? WHERE id = ? AND status = 'queued'",
        (now(), run["id"]),
    ).rowcount
    if run_claimed != 1:
        conn.execute("ROLLBACK")
        return None

    task_claimed = conn.execute(
        "UPDATE tasks SET status = 'in_progress', updated_at = ? WHERE id = ? AND status = 'active'",
        (now(), task["id"]),
    ).rowcount
    if task_claimed != 1:
        conn.execute("ROLLBACK")
        return None

    conn.execute("COMMIT")
    return {"run": run, "task": task, "snapshot": snapshot}


def _block_run(conn: sqlite3.Connection, run: dict[str, Any], reason: str) -> None:
    conn.execute(
        """
        UPDATE execution_runs
        SET status = 'blocked',
            rollback_state = 'required',
            error_message = ?,
            updated_at = ?,
            completed_at = COALESCE(completed_at, ?)
        WHERE id = ?
        """,
        (reason, now(), now(), run["id"]),
    )
    if run.get("company_id") is not None:
        record_event(
            conn,
            run.get("company_id"),
            "execution_blocked",
            f"Execution run #{run['id']} blocked",
            reason,
        )


def release_task(conn: sqlite3.Connection, task_id: int, status: str) -> None:
    conn.execute(
        "UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?",
        (status, now(), task_id),
    )


def write_output(conn: sqlite3.Connection, task: dict[str, Any], status: str, summary: str, deliverable: str) -> None:
    title = f"{task['title']} result"
    body = f"{summary}\n\n{deliverable}".strip()
    existing = conn.execute("SELECT id FROM outputs WHERE task_id = ? LIMIT 1", (task["id"],)).fetchone()
    if existing:
        conn.execute(
            "UPDATE outputs SET status = ?, summary = ? WHERE id = ?",
            (status, body, existing["id"]),
        )
        return

    conn.execute(
        """
        INSERT INTO outputs (company_id, task_id, title, output_type, status, summary, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (task["company_id"], task["id"], title, "result", status, body, now()),
    )


def record_event(conn: sqlite3.Connection, company_id: int | None, event_type: str, title: str, description: str) -> None:
    conn.execute(
        """
        INSERT INTO activity_events (company_id, event_type, title, description, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (company_id, event_type, title, description, now()),
    )


RESPONSE_CONTRACT = """
Respond with ONLY a single JSON object. No markdown fences, no prose.
The object must have exactly these fields:

{
  "summary": "<= 2 sentences describing what you did>",
  "deliverable": "<the actual work product, in plain text or markdown>",
  "status": "completed" | "blocked",
  "confidence": <number between 0 and 1>,
  "next_action": "<a short follow-up recommendation, or null>"
}

If you cannot complete the task, set "status" to "blocked", explain why in
"summary", and leave "deliverable" as an empty string.
""".strip()


def build_messages(persona_text: str, task: dict[str, Any]) -> tuple[str, str]:
    system = f"{persona_text}\n\n---\n\n{RESPONSE_CONTRACT}"
    user = (
        f"Task: {task['title']}\n"
        f"Workflow stage: {task['workflow_stage']}\n\n"
        f"Description:\n{task['description'] or '(none provided)'}"
    )
    return system, user


def call_model(system: str, user: str) -> str:
    if MOCK_MODE:
        return json.dumps(
            {
                "summary": "Mock run completed deterministically.",
                "deliverable": "Mock-mode deliverable produced by the Cyvora execution worker.",
                "status": "completed",
                "confidence": 0.5,
                "next_action": None,
            }
        )

    try:
        import anthropic
    except ImportError as exc:
        raise RuntimeError("anthropic package not installed") from exc

    client = anthropic.Anthropic()
    response = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    text_blocks = [block.text for block in response.content if block.type == "text"]
    if not text_blocks:
        raise RuntimeError("model returned no text content")
    return "".join(text_blocks)


def validate_result(raw_text: str) -> dict[str, Any]:
    try:
        obj = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise ValueError(f"response is not valid JSON: {exc}")

    if not isinstance(obj, dict):
        raise ValueError("response JSON is not an object")

    for field, expected_type in REQUIRED_FIELDS.items():
        if field not in obj:
            raise ValueError(f"missing required field: {field}")
        if not isinstance(obj[field], expected_type):
            raise ValueError(f"field '{field}' has wrong type: {type(obj[field]).__name__}")

    if obj["status"] not in ALLOWED_STATUS:
        raise ValueError(f"field 'status' must be one of {sorted(ALLOWED_STATUS)}")

    confidence = float(obj["confidence"])
    if not 0 <= confidence <= 1:
        raise ValueError(f"field 'confidence' must be between 0 and 1, got {obj['confidence']}")

    return obj


def commit_result(
    conn: sqlite3.Connection,
    run: dict[str, Any],
    task: dict[str, Any],
    result: dict[str, Any],
) -> None:
    status = "completed" if result["status"] == "completed" else "blocked"
    rollback_state = "complete" if status == "completed" else "required"
    summary = result["summary"]
    deliverable = result["deliverable"]

    write_output(conn, task, "final" if status == "completed" else "blocked", summary, deliverable)
    conn.execute(
        "UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?",
        (status, now(), task["id"]),
    )
    conn.execute(
        """
        UPDATE execution_runs
        SET status = ?,
            rollback_state = ?,
            error_message = CASE WHEN ? = 'completed' THEN NULL ELSE ? END,
            completed_at = ?,
            updated_at = ?
        WHERE id = ?
        """,
        (status, rollback_state, status, None if status == "completed" else summary, now(), now(), run["id"]),
    )
    record_event(
        conn,
        task["company_id"],
        "task_executed",
        f"Task #{task['id']} {status}",
        summary,
    )


def block_bundle(
    conn: sqlite3.Connection,
    run: dict[str, Any],
    task: dict[str, Any] | None,
    reason: str,
) -> None:
    if task is not None:
        write_output(conn, task, "blocked", reason, "")
        conn.execute(
            "UPDATE tasks SET status = 'blocked', updated_at = ? WHERE id = ?",
            (now(), task["id"]),
        )

    conn.execute(
        """
        UPDATE execution_runs
        SET status = 'blocked',
            rollback_state = 'required',
            error_message = ?,
            completed_at = ?,
            updated_at = ?
        WHERE id = ?
        """,
        (reason, now(), now(), run["id"]),
    )
    record_event(
        conn,
        task["company_id"] if task is not None else run.get("company_id"),
        "task_execution_blocked",
        f"Execution blocked for run #{run['id']}",
        reason,
    )


def main() -> int:
    conn = open_connection()
    bundle: dict[str, Any] | None = None
    try:
        bundle = claim_bundle(conn)
        if bundle is None:
            print("No eligible queued execution run found. Nothing to do.")
            return 1

        run = bundle["run"]
        if bundle.get("blocked"):
            print(f"BLOCKED — execution run #{run['id']} could not be claimed", file=sys.stderr)
            return 2

        task = bundle["task"]
        print(f"Claimed execution run #{run['id']} and task #{task['id']}: {task['title']}")

        try:
            persona_path = resolve_persona(task["assigned_agent"])
        except LookupError as exc:
            reason = f"persona resolution failed: {exc}"
            print(f"BLOCKED — {reason}", file=sys.stderr)
            conn.execute("BEGIN IMMEDIATE")
            block_bundle(conn, run, task, reason)
            conn.commit()
            return 2

        persona_text = persona_path.read_text(encoding="utf-8")
        system, user = build_messages(persona_text, task)

        try:
            raw_response = call_model(system, user)
        except Exception as exc:
            reason = f"model call failed: {exc}"
            print(f"BLOCKED — {reason}", file=sys.stderr)
            conn.execute("BEGIN IMMEDIATE")
            block_bundle(conn, run, task, reason)
            conn.commit()
            return 3

        try:
            result = validate_result(raw_response)
        except ValueError as exc:
            reason = f"schema validation failed: {exc}"
            print(f"BLOCKED — {reason}", file=sys.stderr)
            print(f"Raw response was:\n{raw_response}", file=sys.stderr)
            conn.execute("BEGIN IMMEDIATE")
            block_bundle(conn, run, task, reason)
            conn.commit()
            return 4

        conn.execute("BEGIN IMMEDIATE")
        commit_result(conn, run, task, result)
        conn.commit()

        print(f"Execution run #{run['id']} committed with status '{result['status']}'.")
        return 0

    except Exception as exc:  # noqa: BLE001
        print(f"BLOCKED — unexpected error: {exc}", file=sys.stderr)
        if bundle is not None:
            try:
                run = bundle["run"]
                task = bundle.get("task")
                conn.execute("BEGIN IMMEDIATE")
                block_bundle(conn, run, task, f"unexpected error: {exc}")
                conn.commit()
            except Exception:
                conn.rollback()
        return 5
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())

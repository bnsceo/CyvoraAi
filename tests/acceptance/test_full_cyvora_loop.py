import hashlib
import json
import sqlite3
import unittest
import uuid


def canonical_json(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def digest(value):
    return hashlib.sha256(canonical_json(value).encode()).hexdigest()


SCHEMA = """
CREATE TABLE objectives(id INTEGER PRIMARY KEY, tenant TEXT, trace_id TEXT, objective TEXT);
CREATE TABLE research_runs(id INTEGER PRIMARY KEY, tenant TEXT, trace_id TEXT, status TEXT, evidence_json TEXT, confidence REAL);
CREATE TABLE blueprints(id INTEGER PRIMARY KEY, tenant TEXT, trace_id TEXT, research_run_id INTEGER, payload_json TEXT, blueprint_hash TEXT);
CREATE TABLE approvals(id INTEGER PRIMARY KEY, tenant TEXT, trace_id TEXT, subject_type TEXT, subject_id INTEGER, subject_hash TEXT, status TEXT, actor TEXT, reason TEXT);
CREATE TABLE companies(id INTEGER PRIMARY KEY, tenant TEXT, trace_id TEXT, blueprint_id INTEGER, name TEXT);
CREATE TABLE tasks(id INTEGER PRIMARY KEY, tenant TEXT, trace_id TEXT, company_id INTEGER, title TEXT, status TEXT);
CREATE TABLE execution_runs(id INTEGER PRIMARY KEY, tenant TEXT, trace_id TEXT, task_id INTEGER, runtime_plan_json TEXT, runtime_plan_hash TEXT, status TEXT, idempotency_key TEXT UNIQUE);
CREATE TABLE policy_decisions(id INTEGER PRIMARY KEY, tenant TEXT, trace_id TEXT, execution_run_id INTEGER, decision TEXT, reason TEXT);
CREATE TABLE outputs(id INTEGER PRIMARY KEY, tenant TEXT, trace_id TEXT, execution_run_id INTEGER, task_id INTEGER, payload_json TEXT, status TEXT);
CREATE TABLE validation_runs(id INTEGER PRIMARY KEY, tenant TEXT, trace_id TEXT, output_id INTEGER, status TEXT, decision TEXT);
CREATE TABLE activity_events(id INTEGER PRIMARY KEY, tenant TEXT, trace_id TEXT, event_type TEXT, subject_id INTEGER);
"""


class MockOperatingLoop:
    def __init__(self):
        self.db = sqlite3.connect(":memory:")
        self.db.row_factory = sqlite3.Row
        self.db.executescript(SCHEMA)

    def event(self, tenant, trace, event_type, subject_id):
        self.db.execute(
            "INSERT INTO activity_events(tenant,trace_id,event_type,subject_id) VALUES(?,?,?,?)",
            (tenant, trace, event_type, subject_id),
        )

    def objective(self, tenant, text):
        trace = str(uuid.uuid4())
        row = self.db.execute(
            "INSERT INTO objectives(tenant,trace_id,objective) VALUES(?,?,?)",
            (tenant, trace, text),
        )
        self.event(tenant, trace, "objective_created", row.lastrowid)
        self.db.commit()
        return trace

    def research(self, tenant, trace):
        evidence = {
            "trends": ["rising demand"],
            "operators": ["proven acquisition and retention pattern"],
            "gaps": ["trust and governance gap"],
            "provenance": "mock-seed",
        }
        row = self.db.execute(
            "INSERT INTO research_runs(tenant,trace_id,status,evidence_json,confidence) VALUES(?,?,?,?,?)",
            (tenant, trace, "completed", canonical_json(evidence), 0.72),
        )
        self.event(tenant, trace, "research_completed", row.lastrowid)
        self.db.commit()
        return row.lastrowid

    def blueprint(self, tenant, trace, research_id):
        research = self.db.execute(
            "SELECT * FROM research_runs WHERE id=? AND tenant=? AND trace_id=?",
            (research_id, tenant, trace),
        ).fetchone()
        if not research or research["status"] != "completed":
            raise ValueError("completed research is required")
        payload = {
            "company": "Evidence-led Studio",
            "departments": ["Research", "Operations", "Governance"],
            "research_run_id": research_id,
        }
        blueprint_hash = digest(payload)
        row = self.db.execute(
            "INSERT INTO blueprints(tenant,trace_id,research_run_id,payload_json,blueprint_hash) VALUES(?,?,?,?,?)",
            (tenant, trace, research_id, canonical_json(payload), blueprint_hash),
        )
        self.event(tenant, trace, "blueprint_created", row.lastrowid)
        self.db.commit()
        return row.lastrowid, blueprint_hash

    def approve_blueprint(self, tenant, trace, blueprint_id, expected_hash):
        blueprint = self.db.execute(
            "SELECT * FROM blueprints WHERE id=? AND tenant=? AND trace_id=?",
            (blueprint_id, tenant, trace),
        ).fetchone()
        if not blueprint or blueprint["blueprint_hash"] != expected_hash:
            raise ValueError("blueprint hash mismatch")
        row = self.db.execute(
            "INSERT INTO approvals(tenant,trace_id,subject_type,subject_id,subject_hash,status,actor,reason) VALUES(?,?,?,?,?,'approved',?,?)",
            (tenant, trace, "blueprint", blueprint_id, expected_hash, "founder", "Approved for controlled beta"),
        )
        self.event(tenant, trace, "blueprint_approved", row.lastrowid)
        self.db.commit()

    def instantiate(self, tenant, trace, blueprint_id):
        approval = self.db.execute(
            "SELECT 1 FROM approvals WHERE tenant=? AND trace_id=? AND subject_type='blueprint' AND subject_id=? AND status='approved'",
            (tenant, trace, blueprint_id),
        ).fetchone()
        if not approval:
            raise PermissionError("approved blueprint required")
        company = self.db.execute(
            "INSERT INTO companies(tenant,trace_id,blueprint_id,name) VALUES(?,?,?,?)",
            (tenant, trace, blueprint_id, "Evidence-led Studio"),
        )
        task = self.db.execute(
            "INSERT INTO tasks(tenant,trace_id,company_id,title,status) VALUES(?,?,?,?,?)",
            (tenant, trace, company.lastrowid, "Produce first market brief", "approved"),
        )
        self.event(tenant, trace, "company_instantiated", company.lastrowid)
        self.event(tenant, trace, "task_approved", task.lastrowid)
        self.db.commit()
        return task.lastrowid

    def queue(self, tenant, trace, task_id, runtime_plan):
        task = self.db.execute(
            "SELECT * FROM tasks WHERE id=? AND tenant=? AND trace_id=? AND status='approved'",
            (task_id, tenant, trace),
        ).fetchone()
        if not task:
            raise PermissionError("approved task required")
        plan_hash = digest(runtime_plan)
        key = f"{tenant}:{task_id}:{plan_hash}"
        row = self.db.execute(
            "INSERT INTO execution_runs(tenant,trace_id,task_id,runtime_plan_json,runtime_plan_hash,status,idempotency_key) VALUES(?,?,?,?,?,'queued',?)",
            (tenant, trace, task_id, canonical_json(runtime_plan), plan_hash, key),
        )
        self.event(tenant, trace, "execution_queued", row.lastrowid)
        self.db.commit()
        return row.lastrowid, plan_hash

    def execute(self, tenant, trace, run_id, expected_plan_hash):
        run = self.db.execute(
            "SELECT * FROM execution_runs WHERE id=? AND tenant=? AND trace_id=? AND status='queued'",
            (run_id, tenant, trace),
        ).fetchone()
        if not run or run["runtime_plan_hash"] != expected_plan_hash:
            raise PermissionError("approved runtime plan mismatch")
        policy = self.db.execute(
            "INSERT INTO policy_decisions(tenant,trace_id,execution_run_id,decision,reason) VALUES(?,?,?,'allow','mock provider, no external side effects')",
            (tenant, trace, run_id),
        )
        self.event(tenant, trace, "policy_allowed", policy.lastrowid)
        claimed = self.db.execute(
            "UPDATE execution_runs SET status='in_progress' WHERE id=? AND status='queued'",
            (run_id,),
        ).rowcount
        if claimed != 1:
            raise RuntimeError("run could not be claimed exactly once")
        result = {"summary": "Research brief produced", "deliverable": "Mock evidence-backed brief", "status": "completed", "confidence": 0.91, "next_action": None}
        output = self.db.execute(
            "INSERT INTO outputs(tenant,trace_id,execution_run_id,task_id,payload_json,status) VALUES(?,?,?,?,?,'candidate')",
            (tenant, trace, run_id, run["task_id"], canonical_json(result)),
        )
        validation = self.db.execute(
            "INSERT INTO validation_runs(tenant,trace_id,output_id,status,decision) VALUES(?,?,?,'passed','contract and provenance checks passed')",
            (tenant, trace, output.lastrowid),
        )
        self.db.execute("UPDATE outputs SET status='final' WHERE id=?", (output.lastrowid,))
        self.db.execute("UPDATE tasks SET status='completed' WHERE id=?", (run["task_id"],))
        self.db.execute("UPDATE execution_runs SET status='completed' WHERE id=?", (run_id,))
        self.event(tenant, trace, "worker_claimed", run_id)
        self.event(tenant, trace, "output_created", output.lastrowid)
        self.event(tenant, trace, "validation_passed", validation.lastrowid)
        self.event(tenant, trace, "execution_completed", run_id)
        self.db.commit()
        return output.lastrowid


class FullCyvoraLoopAcceptanceTest(unittest.TestCase):
    def setUp(self):
        self.loop = MockOperatingLoop()
        self.tenant = "founder-beta"

    def test_objective_to_validated_history(self):
        trace = self.loop.objective(self.tenant, "Launch a governed AI-native media company")
        research_id = self.loop.research(self.tenant, trace)
        blueprint_id, blueprint_hash = self.loop.blueprint(self.tenant, trace, research_id)
        self.loop.approve_blueprint(self.tenant, trace, blueprint_id, blueprint_hash)
        task_id = self.loop.instantiate(self.tenant, trace, blueprint_id)
        runtime_plan = {"provider": "mock", "connector_mode": "mock", "cost_ceiling_usd": 0}
        run_id, plan_hash = self.loop.queue(self.tenant, trace, task_id, runtime_plan)
        output_id = self.loop.execute(self.tenant, trace, run_id, plan_hash)

        output = self.loop.db.execute("SELECT * FROM outputs WHERE id=?", (output_id,)).fetchone()
        self.assertEqual(output["status"], "final")
        validation = self.loop.db.execute("SELECT * FROM validation_runs WHERE output_id=?", (output_id,)).fetchone()
        self.assertEqual(validation["status"], "passed")
        events = [row[0] for row in self.loop.db.execute(
            "SELECT event_type FROM activity_events WHERE tenant=? AND trace_id=? ORDER BY id",
            (self.tenant, trace),
        )]
        self.assertEqual(events, [
            "objective_created", "research_completed", "blueprint_created", "blueprint_approved",
            "company_instantiated", "task_approved", "execution_queued", "policy_allowed",
            "worker_claimed", "output_created", "validation_passed", "execution_completed",
        ])

    def test_changed_blueprint_is_rejected(self):
        trace = self.loop.objective(self.tenant, "Build a software company")
        research_id = self.loop.research(self.tenant, trace)
        blueprint_id, _ = self.loop.blueprint(self.tenant, trace, research_id)
        with self.assertRaises(ValueError):
            self.loop.approve_blueprint(self.tenant, trace, blueprint_id, "tampered")

    def test_runtime_plan_mismatch_is_rejected(self):
        trace = self.loop.objective(self.tenant, "Build a content company")
        research_id = self.loop.research(self.tenant, trace)
        blueprint_id, blueprint_hash = self.loop.blueprint(self.tenant, trace, research_id)
        self.loop.approve_blueprint(self.tenant, trace, blueprint_id, blueprint_hash)
        task_id = self.loop.instantiate(self.tenant, trace, blueprint_id)
        run_id, _ = self.loop.queue(self.tenant, trace, task_id, {"provider": "mock"})
        with self.assertRaises(PermissionError):
            self.loop.execute(self.tenant, trace, run_id, "changed-plan")

    def test_duplicate_queue_is_blocked_by_idempotency(self):
        trace = self.loop.objective(self.tenant, "Build a research company")
        research_id = self.loop.research(self.tenant, trace)
        blueprint_id, blueprint_hash = self.loop.blueprint(self.tenant, trace, research_id)
        self.loop.approve_blueprint(self.tenant, trace, blueprint_id, blueprint_hash)
        task_id = self.loop.instantiate(self.tenant, trace, blueprint_id)
        plan = {"provider": "mock"}
        self.loop.queue(self.tenant, trace, task_id, plan)
        with self.assertRaises(sqlite3.IntegrityError):
            self.loop.queue(self.tenant, trace, task_id, plan)

    def test_tenant_isolation(self):
        trace = self.loop.objective(self.tenant, "Build a service company")
        research_id = self.loop.research(self.tenant, trace)
        with self.assertRaises(ValueError):
            self.loop.blueprint("other-tenant", trace, research_id)


if __name__ == "__main__":
    unittest.main()

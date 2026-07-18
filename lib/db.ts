import sqlite3, { type Database, type RunResult } from 'sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { workspaceRoot } from './paths';

export function newTraceId(): string {
  return `trc_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

const DB_PATH = path.join(/*turbopackIgnore: true*/ workspaceRoot, 'data', 'missions.db');
const SKIP_DB_INIT = process.env.CYVORA_SKIP_DB_INIT === '1';

function createBuildDatabaseStub(): Database {
  const stub: any = {};
  const invoke = (args: any[], value?: unknown) => {
    const callback = args.findLast((item) => typeof item === 'function');
    if (callback) queueMicrotask(() => callback(null, value));
  };
  stub.run = (...args: any[]) => { invoke(args); return stub; };
  stub.all = (...args: any[]) => { invoke(args, []); return stub; };
  stub.get = (...args: any[]) => { invoke(args, undefined); return stub; };
  stub.prepare = () => ({
    run: (...args: any[]) => { invoke(args); return stub; },
    finalize: (callback?: (error?: Error | null) => void) => { if (callback) queueMicrotask(() => callback(null)); },
  });
  stub.close = (callback?: (error?: Error | null) => void) => { if (callback) queueMicrotask(() => callback(null)); };
  stub.serialize = (fn?: () => void) => { if (fn) fn(); };
  return stub as Database;
}

if (!SKIP_DB_INIT) {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

const sqliteModule = SKIP_DB_INIT ? null : sqlite3;
const db: Database = SKIP_DB_INIT ? createBuildDatabaseStub() : new sqliteModule!.Database(DB_PATH);

// All schema DDL (CREATE TABLE + column migrations) must run inside a single
// db.serialize() block. Without this, node-sqlite3 does not guarantee that
// CREATE TABLE statements complete before dependent ALTER TABLE / PRAGMA
// calls run, which produced intermittent "no such table" / "no such column"
// 500s the first time a fresh database file was created (cold start).
db.serialize(() => {

// --- Missions table (existing) ---
db.run(`
  CREATE TABLE IF NOT EXISTS missions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    objective TEXT NOT NULL,
    agents TEXT NOT NULL,
    status TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    briefing_file TEXT
  )
`);

// --- Companies table ---
db.run(`
  CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    brand_color TEXT,
    created_at TEXT NOT NULL,
    status TEXT DEFAULT 'active'
  )
`);

// --- Departments table ---
db.run(`
  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    trace_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(company_id) REFERENCES companies(id)
  )
`);

// --- Teams table ---
db.run(`
  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    department_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(department_id) REFERENCES departments(id)
  )
`);

// --- Agent Assignments table ---
db.run(`
  CREATE TABLE IF NOT EXISTS agent_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    agent_name TEXT NOT NULL,
    task_type TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(team_id) REFERENCES teams(id)
  )
`);

// --- Connector table ---
db.run(`
  CREATE TABLE IF NOT EXISTS connectors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    department_id INTEGER,
    team_id INTEGER,
    name TEXT NOT NULL,
    connector_type TEXT NOT NULL,
    status TEXT NOT NULL,
    summary TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(company_id) REFERENCES companies(id),
    FOREIGN KEY(department_id) REFERENCES departments(id),
    FOREIGN KEY(team_id) REFERENCES teams(id)
  )
`);

// --- Harness Engineering Requests table ---
db.run(`
  CREATE TABLE IF NOT EXISTS self_coding_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant TEXT NOT NULL,
    request TEXT NOT NULL,
    status TEXT NOT NULL,
    stage TEXT NOT NULL,
    approval_state TEXT NOT NULL,
    assigned_agents TEXT NOT NULL,
    qa_confidence INTEGER NOT NULL,
    qa_summary TEXT,
    dissent TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

// --- Operating layer tables ---
db.run(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    department_id INTEGER,
    team_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    workflow_stage TEXT NOT NULL,
    status TEXT NOT NULL,
    priority TEXT NOT NULL,
    assigned_agent TEXT,
    risk_level TEXT NOT NULL DEFAULT 'medium',
    validation_policy TEXT NOT NULL DEFAULT 'schema',
    revision_count INTEGER NOT NULL DEFAULT 0,
    max_revisions INTEGER NOT NULL DEFAULT 2,
    claimed_by TEXT,
    claimed_at TEXT,
    lease_expires_at TEXT,
    heartbeat_at TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    last_error TEXT,
    trace_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(company_id) REFERENCES companies(id),
    FOREIGN KEY(department_id) REFERENCES departments(id),
    FOREIGN KEY(team_id) REFERENCES teams(id)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    task_id INTEGER,
    title TEXT NOT NULL,
    summary TEXT,
    status TEXT NOT NULL,
    risk_level TEXT NOT NULL,
    approval_type TEXT NOT NULL DEFAULT 'task_execution',
    subject_type TEXT,
    subject_id INTEGER,
    execution_run_id INTEGER,
    decision_reason TEXT,
    decided_at TEXT,
    trace_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(company_id) REFERENCES companies(id),
    FOREIGN KEY(task_id) REFERENCES tasks(id)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS outputs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    task_id INTEGER,
    title TEXT NOT NULL,
    output_type TEXT NOT NULL,
    status TEXT NOT NULL,
    summary TEXT,
    execution_run_id INTEGER,
    candidate_version INTEGER NOT NULL DEFAULT 1,
    agent_confidence REAL,
    review_status TEXT NOT NULL DEFAULT 'unreviewed',
    finalized_at TEXT,
    approved_at TEXT,
    trace_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(company_id) REFERENCES companies(id),
    FOREIGN KEY(task_id) REFERENCES tasks(id)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS activity_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER,
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(company_id) REFERENCES companies(id)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS execution_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant TEXT NOT NULL,
    request_id INTEGER NOT NULL,
    mission_id INTEGER,
    company_id INTEGER,
    task_id INTEGER,
    trace_id TEXT NOT NULL,
    goal TEXT NOT NULL,
    runtime_plan TEXT NOT NULL,
    runtime_mode TEXT NOT NULL,
    status TEXT NOT NULL,
    rollback_state TEXT NOT NULL,
    paid_ai INTEGER NOT NULL,
    mock_mode INTEGER NOT NULL,
    error_message TEXT,
    claimed_by TEXT,
    claimed_at TEXT,
    lease_expires_at TEXT,
    heartbeat_at TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    started_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT,
    FOREIGN KEY(task_id) REFERENCES tasks(id),
    FOREIGN KEY(request_id) REFERENCES self_coding_requests(id),
    FOREIGN KEY(mission_id) REFERENCES missions(id),
    FOREIGN KEY(company_id) REFERENCES companies(id)
  )
`);



db.run(`
  CREATE TABLE IF NOT EXISTS validation_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant TEXT NOT NULL,
    company_id INTEGER NOT NULL,
    task_id INTEGER NOT NULL,
    output_id INTEGER NOT NULL,
    execution_run_id INTEGER,
    validator_type TEXT NOT NULL,
    provider TEXT NOT NULL,
    protocol TEXT NOT NULL,
    status TEXT NOT NULL,
    confidence REAL,
    decision TEXT,
    findings_json TEXT NOT NULL DEFAULT '[]',
    blocking_findings_json TEXT NOT NULL DEFAULT '[]',
    dissent_json TEXT NOT NULL DEFAULT '[]',
    requires_human_approval INTEGER NOT NULL DEFAULT 0,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    estimated_cost_usd REAL NOT NULL DEFAULT 0,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    trace_id TEXT NOT NULL,
    FOREIGN KEY(company_id) REFERENCES companies(id),
    FOREIGN KEY(task_id) REFERENCES tasks(id),
    FOREIGN KEY(output_id) REFERENCES outputs(id),
    FOREIGN KEY(execution_run_id) REFERENCES execution_runs(id)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS usage_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant TEXT NOT NULL,
    company_id INTEGER,
    task_id INTEGER,
    execution_run_id INTEGER,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    estimated_cost_usd REAL NOT NULL DEFAULT 0,
    provider_request_id TEXT,
    trace_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`);


db.run(`
  CREATE TABLE IF NOT EXISTS worker_heartbeats (
    worker_id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    current_run_id INTEGER,
    current_task_id INTEGER,
    hostname TEXT,
    process_id INTEGER,
    version TEXT,
    started_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    details TEXT
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS operations_incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant TEXT NOT NULL,
    company_id INTEGER,
    fingerprint TEXT NOT NULL,
    category TEXT NOT NULL,
    severity TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    source_type TEXT NOT NULL,
    source_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    remediation TEXT,
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    acknowledged_at TEXT,
    resolved_at TEXT,
    resolution_note TEXT,
    trace_id TEXT NOT NULL,
    FOREIGN KEY(company_id) REFERENCES companies(id)
  )
`);

db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_incidents_fingerprint ON operations_incidents (tenant, fingerprint)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_incidents_status ON operations_incidents (tenant, status)`);

db.run(`
  CREATE TABLE IF NOT EXISTS recovery_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant TEXT NOT NULL,
    incident_id INTEGER,
    company_id INTEGER,
    action_type TEXT NOT NULL,
    target_type TEXT,
    target_id INTEGER,
    actor TEXT NOT NULL DEFAULT 'founder',
    notes TEXT,
    result TEXT NOT NULL DEFAULT 'applied',
    trace_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(incident_id) REFERENCES operations_incidents(id),
    FOREIGN KEY(company_id) REFERENCES companies(id)
  )
`);

db.run(`CREATE INDEX IF NOT EXISTS idx_recovery_actions_chrono ON recovery_actions (tenant, created_at)`);

function ensureColumn(table: string, column: string, definition: string): void {
  db.all(`PRAGMA table_info(${table})`, (err, rows: any[]) => {
    if (err) {
      console.error(`[db] unable to inspect ${table}.${column}:`, err);
      return;
    }
    if (rows.some((row) => row.name === column)) return;
    db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, (alterErr) => {
      if (alterErr) console.error(`[db] unable to add ${table}.${column}:`, alterErr);
    });
  });
}

[
  ['tasks', 'claimed_by', 'TEXT'],

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
  ['tasks', 'claimed_at', 'TEXT'],
  ['tasks', 'lease_expires_at', 'TEXT'],
  ['tasks', 'heartbeat_at', 'TEXT'],
  ['tasks', 'attempt_count', 'INTEGER NOT NULL DEFAULT 0'],
  ['tasks', 'max_attempts', 'INTEGER NOT NULL DEFAULT 3'],
  ['tasks', 'last_error', 'TEXT'],
  ['tasks', 'risk_level', "TEXT NOT NULL DEFAULT 'medium'"],
  ['tasks', 'validation_policy', "TEXT NOT NULL DEFAULT 'schema'"],
  ['tasks', 'revision_count', 'INTEGER NOT NULL DEFAULT 0'],
  ['tasks', 'max_revisions', 'INTEGER NOT NULL DEFAULT 2'],
  ['approvals', 'approval_type', "TEXT NOT NULL DEFAULT 'task_execution'"],
  ['approvals', 'subject_type', 'TEXT'],
  ['approvals', 'subject_id', 'INTEGER'],
  ['approvals', 'execution_run_id', 'INTEGER'],
  ['approvals', 'decision_reason', 'TEXT'],
  ['approvals', 'decided_at', 'TEXT'],
  ['outputs', 'execution_run_id', 'INTEGER'],
  ['outputs', 'candidate_version', 'INTEGER NOT NULL DEFAULT 1'],
  ['outputs', 'agent_confidence', 'REAL'],
  ['outputs', 'review_status', "TEXT NOT NULL DEFAULT 'unreviewed'"],
  ['outputs', 'finalized_at', 'TEXT'],
  ['outputs', 'approved_at', 'TEXT'],
  ['execution_runs', 'claimed_by', 'TEXT'],
  ['execution_runs', 'claimed_at', 'TEXT'],
  ['execution_runs', 'lease_expires_at', 'TEXT'],
  ['execution_runs', 'heartbeat_at', 'TEXT'],
  ['execution_runs', 'attempt_count', 'INTEGER NOT NULL DEFAULT 0'],
  ['execution_runs', 'max_attempts', 'INTEGER NOT NULL DEFAULT 3'],
].forEach(([table, column, definition]) => ensureColumn(table, column, definition));

}); // end db.serialize() schema-init block

// --- Mission functions ---
export function saveMission(data: {
  objective: string;
  agents: any[];
  status: string;
  timestamp: string;
  briefing_file?: string;
}): Promise<number> {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(
      `INSERT INTO missions (objective, agents, status, timestamp, briefing_file)
       VALUES (?, ?, ?, ?, ?)`
    );
    stmt.run(
      data.objective,
      JSON.stringify(data.agents),
      data.status,
      data.timestamp,
      data.briefing_file || null,
      function (this: RunResult, err: Error | null) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
    stmt.finalize();
  });
}

export function getAllMissions(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM missions ORDER BY timestamp DESC`, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export function getMission(id: number): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM missions WHERE id = ?`, [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function searchMissions(query: string, status?: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    let sql = `SELECT * FROM missions WHERE objective LIKE ?`;
    const params = [`%${query}%`];
    if (status && status !== 'all') {
      sql += ` AND status = ?`;
      params.push(status);
    }
    sql += ` ORDER BY timestamp DESC`;
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export function updateMissionStatus(id: number, status: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(`UPDATE missions SET status = ? WHERE id = ?`, [status, id], function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

// --- Company functions ---
export function saveCompany(data: {
  tenant: string;
  name: string;
  description?: string;
  brand_color?: string;
}): Promise<number> {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(
      `INSERT INTO companies (tenant, name, description, brand_color, created_at, status)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    stmt.run(
      data.tenant,
      data.name,
      data.description || '',
      data.brand_color || '#6366f1',
      new Date().toISOString(),
      'active',
      function (this: RunResult, err: Error | null) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
    stmt.finalize();
  });
}

export function getCompanies(tenant: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM companies WHERE tenant = ? ORDER BY created_at DESC`, [tenant], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export function getCompany(id: number): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM companies WHERE id = ?`, [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// --- Department functions ---
export function saveDepartment(data: {
  company_id: number;
  name: string;
  description?: string;
}): Promise<number> {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(
      `INSERT INTO departments (company_id, name, description, created_at)
       VALUES (?, ?, ?, ?)`
    );
    stmt.run(
      data.company_id,
      data.name,
      data.description || '',
      data.trace_id || newTraceId(),
      new Date().toISOString(),
      function (this: RunResult, err: Error | null) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
    stmt.finalize();
  });
}

export function getDepartments(company_id: number): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM departments WHERE company_id = ? ORDER BY created_at ASC`, [company_id], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// --- Team functions ---
export function saveTeam(data: {
  department_id: number;
  name: string;
  description?: string;
}): Promise<number> {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(
      `INSERT INTO teams (department_id, name, description, created_at)
       VALUES (?, ?, ?, ?)`
    );
    stmt.run(
      data.department_id,
      data.name,
      data.description || '',
      new Date().toISOString(),
      function (this: RunResult, err: Error | null) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
    stmt.finalize();
  });
}

export function getTeams(department_id: number): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM teams WHERE department_id = ? ORDER BY created_at ASC`, [department_id], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// --- Agent Assignment functions ---
export function saveAgentAssignment(data: {
  team_id: number;
  agent_name: string;
  task_type?: string;
}): Promise<number> {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(
      `INSERT INTO agent_assignments (team_id, agent_name, task_type, created_at)
       VALUES (?, ?, ?, ?)`
    );
    stmt.run(
      data.team_id,
      data.agent_name,
      data.task_type || '',
      new Date().toISOString(),
      function (this: RunResult, err: Error | null) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
    stmt.finalize();
  });
}

export function getAgentAssignments(team_id: number): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM agent_assignments WHERE team_id = ? ORDER BY created_at ASC`, [team_id], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// --- Harness Engineering Request functions ---
export function saveSelfCodingRequest(data: {
  tenant: string;
  request: string;
  status: string;
  stage: string;
  approval_state: string;
  assigned_agents: any[];
  qa_confidence: number;
  qa_summary?: string;
  dissent?: string;
}): Promise<number> {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    const stmt = db.prepare(
      `INSERT INTO self_coding_requests (
        tenant, request, status, stage, approval_state, assigned_agents,
        qa_confidence, qa_summary, dissent, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    stmt.run(
      data.tenant,
      data.request,
      data.status,
      data.stage,
      data.approval_state,
      JSON.stringify(data.assigned_agents),
      data.qa_confidence,
      data.qa_summary || '',
      data.dissent || '',
      now,
      now,
      function (this: RunResult, err: Error | null) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
    stmt.finalize();
  });
}

export function getSelfCodingRequests(tenant: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM self_coding_requests WHERE tenant = ? ORDER BY created_at DESC`,
      [tenant],
      (err, rows) => {
        if (err) reject(err);
        else {
          resolve(rows.map((row: any) => ({
            ...row,
            assigned_agents: JSON.parse(row.assigned_agents || '[]'),
          })));
        }
      }
    );
  });
}

export function updateSelfCodingApproval(data: {
  id: number;
  tenant: string;
  approval_state: string;
  status: string;
  stage: string;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE self_coding_requests
       SET approval_state = ?, status = ?, stage = ?, updated_at = ?
       WHERE id = ? AND tenant = ?`,
      [
        data.approval_state,
        data.status,
        data.stage,
        new Date().toISOString(),
        data.id,
        data.tenant,
      ],
      function (this: RunResult, err: Error | null) {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

// --- Operating layer functions ---
export function saveTask(data: {
  company_id: number;
  department_id?: number;
  team_id?: number;
  title: string;
  description?: string;
  workflow_stage: string;
  status: string;
  priority: string;
  assigned_agent?: string;
  risk_level?: string;
  validation_policy?: string;
  max_revisions?: number;
}): Promise<number> {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    const stmt = db.prepare(
      `INSERT INTO tasks (
        company_id, department_id, team_id, title, description, workflow_stage,
        status, priority, assigned_agent, risk_level, validation_policy, max_revisions, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    stmt.run(
      data.company_id,
      data.department_id || null,
      data.team_id || null,
      data.title,
      data.description || '',
      data.workflow_stage,
      data.status,
      data.priority,
      data.assigned_agent || '',
      data.risk_level || 'medium',
      data.validation_policy || 'schema',
      data.max_revisions || 2,
      now,
      now,
      function (this: RunResult, err: Error | null) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
    stmt.finalize();
  });
}

export function getTasks(company_id: number): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM tasks WHERE company_id = ? ORDER BY created_at DESC`, [company_id], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export function saveConnector(data: {
  company_id: number;
  department_id?: number;
  team_id?: number;
  name: string;
  connector_type: string;
  status: string;
  summary?: string;
}): Promise<number> {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    const stmt = db.prepare(
      `INSERT INTO connectors (
        company_id, department_id, team_id, name, connector_type, status, summary, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    stmt.run(
      data.company_id,
      data.department_id || null,
      data.team_id || null,
      data.name,
      data.connector_type,
      data.status,
      data.summary || '',
      now,
      now,
      function (this: RunResult, err: Error | null) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
    stmt.finalize();
  });
}

export function getConnectors(company_id: number): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM connectors WHERE company_id = ? ORDER BY created_at DESC`, [company_id], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export function saveApproval(data: {
  company_id: number;
  task_id?: number;
  title: string;
  summary?: string;
  status: string;
  risk_level: string;
  approval_type?: string;
  subject_type?: string;
  subject_id?: number;
  execution_run_id?: number;
  trace_id?: string;
}): Promise<number> {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    const stmt = db.prepare(
      `INSERT INTO approvals (company_id, task_id, title, summary, status, risk_level, approval_type, subject_type, subject_id, execution_run_id, trace_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    stmt.run(
      data.company_id,
      data.task_id || null,
      data.title,
      data.summary || '',
      data.status,
      data.risk_level,
      data.approval_type || 'task_execution',
      data.subject_type || null,
      data.subject_id || null,
      data.execution_run_id || null,
      data.trace_id || newTraceId(),
      now,
      now,
      function (this: RunResult, err: Error | null) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
    stmt.finalize();
  });
}

export function getApprovals(company_id: number): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM approvals WHERE company_id = ? ORDER BY created_at DESC`, [company_id], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export function getApprovalById(id: number, tenant: string): Promise<any | null> {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT a.* FROM approvals a JOIN companies c ON c.id = a.company_id WHERE a.id = ? AND c.tenant = ? LIMIT 1`,
      [id, tenant],
      (err, row) => { if (err) reject(err); else resolve(row || null); }
    );
  });
}

export function updateApprovalStatus(data: {
  id: number;
  company_id: number;
  status: string;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE approvals
       SET status = ?, decided_at = ?, updated_at = ?
       WHERE id = ? AND company_id = ?`,
      [data.status, new Date().toISOString(), new Date().toISOString(), data.id, data.company_id],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

export function saveOutput(data: {
  company_id: number;
  task_id?: number;
  title: string;
  output_type: string;
  status: string;
  summary?: string;
}): Promise<number> {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(
      `INSERT INTO outputs (company_id, task_id, title, output_type, status, summary, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    stmt.run(
      data.company_id,
      data.task_id || null,
      data.title,
      data.output_type,
      data.status,
      data.summary || '',
      new Date().toISOString(),
      function (this: RunResult, err: Error | null) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
    stmt.finalize();
  });
}

export function getOutputs(company_id: number): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM outputs WHERE company_id = ? ORDER BY created_at DESC`, [company_id], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export function saveActivityEvent(data: {
  company_id?: number;
  event_type: string;
  title: string;
  description?: string;
  trace_id?: string;
}): Promise<number> {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(
      `INSERT INTO activity_events (company_id, event_type, title, description, trace_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    stmt.run(
      data.company_id || null,
      data.event_type,
      data.title,
      data.description || '',
      new Date().toISOString(),
      function (this: RunResult, err: Error | null) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
    stmt.finalize();
  });
}

export function getActivityEvents(company_id?: number): Promise<any[]> {
  return new Promise((resolve, reject) => {
    if (company_id) {
      db.all(`SELECT * FROM activity_events WHERE company_id = ? ORDER BY created_at DESC LIMIT 20`, [company_id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
      return;
    }
    db.all(`SELECT * FROM activity_events ORDER BY created_at DESC LIMIT 30`, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export function saveExecutionRun(data: {
  tenant: string;
  request_id: number;
  goal: string;
  runtime_plan: any;
  runtime_mode: string;
  status: string;
  rollback_state: string;
  paid_ai: boolean;
  mock_mode: boolean;
  mission_id?: number;
  company_id?: number;
  task_id?: number;
  trace_id?: string;
}): Promise<number> {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    const stmt = db.prepare(
      `INSERT INTO execution_runs (
        tenant, request_id, mission_id, company_id, task_id, trace_id, goal, runtime_plan, runtime_mode,
        status, rollback_state, paid_ai, mock_mode, started_at, updated_at, completed_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    stmt.run(
      data.tenant,
      data.request_id,
      data.mission_id || null,
      data.company_id || null,
      data.task_id || null,
      data.trace_id || newTraceId(),
      data.goal,
      JSON.stringify(data.runtime_plan),
      data.runtime_mode,
      data.status,
      data.rollback_state,
      data.paid_ai ? 1 : 0,
      data.mock_mode ? 1 : 0,
      now,
      now,
      null,
      function (this: RunResult, err: Error | null) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
    stmt.finalize();
  });
}

export function updateExecutionRun(data: {
  id: number;
  status: string;
  rollback_state?: string;
  error_message?: string;
  mission_id?: number;
  company_id?: number;
  completed?: boolean;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    db.run(
      `UPDATE execution_runs
       SET status = ?,
           rollback_state = COALESCE(?, rollback_state),
           error_message = COALESCE(?, error_message),
           mission_id = COALESCE(?, mission_id),
           company_id = COALESCE(?, company_id),
           completed_at = COALESCE(?, completed_at),
           updated_at = ?
       WHERE id = ?`,
      [
        data.status,
        data.rollback_state || null,
        data.error_message || null,
        data.mission_id || null,
        data.company_id || null,
        data.completed ? now : null,
        now,
        data.id,
      ],
      function (this: RunResult, err: Error | null) {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

export function getExecutionRuns(tenant?: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const sql = tenant
      ? `SELECT * FROM execution_runs WHERE tenant = ? ORDER BY started_at DESC LIMIT 20`
      : `SELECT * FROM execution_runs ORDER BY started_at DESC LIMIT 20`;
    const params = tenant ? [tenant] : [];
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else {
        resolve(
          rows.map((row: any) => ({
            ...row,
            runtime_plan: JSON.parse(row.runtime_plan || '{}'),
            paid_ai: row.paid_ai === 1,
            mock_mode: row.mock_mode === 1,
          }))
        );
      }
    });
  });
}

export function getExecutionRunById(id: number, tenant?: string): Promise<any | null> {
  return new Promise((resolve, reject) => {
    const sql = tenant
      ? `SELECT * FROM execution_runs WHERE id = ? AND tenant = ? LIMIT 1`
      : `SELECT * FROM execution_runs WHERE id = ? LIMIT 1`;
    const params = tenant ? [id, tenant] : [id];
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      if (!row) {
        resolve(null);
        return;
      }
      resolve({
        ...row,
        runtime_plan: JSON.parse((row as any).runtime_plan || '{}'),
        paid_ai: (row as any).paid_ai === 1,
        mock_mode: (row as any).mock_mode === 1,
      });
    });
  });
}

async function runDelete(sql: string, params: unknown[] = []): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    db.run(sql, params, (err) => (err ? reject(err) : resolve()));
  });
}

export async function clearDemoTenantData(tenant: string): Promise<void> {
  const companies = await getCompanies(tenant);
  for (const company of companies) {
    await runDelete(`DELETE FROM activity_events WHERE company_id = ?`, [company.id]);
    await runDelete(`DELETE FROM outputs WHERE company_id = ?`, [company.id]);
    await runDelete(`DELETE FROM approvals WHERE company_id = ?`, [company.id]);
    await runDelete(`DELETE FROM tasks WHERE company_id = ?`, [company.id]);
    await runDelete(`DELETE FROM connectors WHERE company_id = ?`, [company.id]);

    const departments = await getDepartments(company.id);
    for (const department of departments) {
      const teams = await getTeams(department.id);
      for (const team of teams) {
        await runDelete(`DELETE FROM agent_assignments WHERE team_id = ?`, [team.id]);
      }
      await runDelete(`DELETE FROM teams WHERE department_id = ?`, [department.id]);
    }

    await runDelete(`DELETE FROM departments WHERE company_id = ?`, [company.id]);
  }

  await runDelete(`DELETE FROM companies WHERE tenant = ?`, [tenant]);
  await runDelete(`DELETE FROM self_coding_requests WHERE tenant = ?`, [tenant]);
  await runDelete(`DELETE FROM execution_runs WHERE tenant = ?`, [tenant]);
}

export function clearDemoMissions(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM missions WHERE objective LIKE '[DEMO] %'`, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}


export function finalizeApprovedResult(data: { approval_id: number; company_id: number; task_id?: number; output_id?: number; execution_run_id?: number }): Promise<void> {
  return new Promise((resolve, reject) => {
    const timestamp = new Date().toISOString();
    db.serialize(() => {
      db.run('BEGIN IMMEDIATE');
      if (data.output_id) db.run(`UPDATE outputs SET status = 'final', review_status = 'approved', approved_at = ?, finalized_at = ? WHERE id = ? AND company_id = ?`, [timestamp, timestamp, data.output_id, data.company_id]);
      if (data.task_id) db.run(`UPDATE tasks SET status = 'completed', updated_at = ? WHERE id = ? AND company_id = ?`, [timestamp, data.task_id, data.company_id]);
      if (data.execution_run_id) db.run(`UPDATE execution_runs SET status = 'completed', rollback_state = 'complete', completed_at = ?, updated_at = ? WHERE id = ? AND company_id = ?`, [timestamp, timestamp, data.execution_run_id, data.company_id]);
      db.run(`INSERT INTO activity_events (company_id, event_type, title, description, created_at) VALUES (?, 'result_approved', ?, ?, ?)`, [data.company_id, `Result approval #${data.approval_id} completed`, 'Candidate output was accepted and finalized by the founder approval flow.', timestamp], (err) => {
        if (err) { db.run('ROLLBACK'); reject(err); return; }
        db.run('COMMIT', (commitErr) => commitErr ? reject(commitErr) : resolve());
      });
    });
  });
}

// --- War Room: worker fleet ---
export function getWorkerHeartbeats(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM worker_heartbeats ORDER BY last_seen_at DESC`, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// --- War Room: incidents ---
export type IncidentCondition = {
  fingerprint: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  source_type: string;
  source_id?: number | null;
  company_id?: number | null;
  title: string;
  description?: string;
  remediation?: string;
};

export function upsertIncident(tenant: string, condition: IncidentCondition): Promise<number> {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    db.get(
      `SELECT id, status FROM operations_incidents WHERE tenant = ? AND fingerprint = ?`,
      [tenant, condition.fingerprint],
      (err, row: any) => {
        if (err) { reject(err); return; }
        if (row) {
          const nextStatus = row.status === 'resolved' ? 'open' : row.status;
          db.run(
            `UPDATE operations_incidents
             SET last_seen_at = ?, status = ?, severity = ?, title = ?, description = ?, remediation = ?,
                 resolved_at = CASE WHEN ? = 'open' THEN NULL ELSE resolved_at END
             WHERE id = ?`,
            [now, nextStatus, condition.severity, condition.title, condition.description || '', condition.remediation || '', nextStatus, row.id],
            (updateErr) => (updateErr ? reject(updateErr) : resolve(row.id))
          );
          return;
        }
        const stmt = db.prepare(
          `INSERT INTO operations_incidents (
            tenant, company_id, fingerprint, category, severity, status, source_type, source_id,
            title, description, remediation, first_seen_at, last_seen_at
          ) VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?)`
        );
        stmt.run(
          tenant,
          condition.company_id ?? null,
          condition.fingerprint,
          condition.category,
          condition.severity,
          condition.source_type,
          condition.source_id ?? null,
          condition.title,
          condition.description || '',
          condition.remediation || '',
          now,
          now,
          function (this: RunResult, insertErr: Error | null) {
            if (insertErr) reject(insertErr);
            else resolve(this.lastID);
          }
        );
        stmt.finalize();
      }
    );
  });
}

export function autoResolveStaleIncidents(tenant: string, activeFingerprints: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    const placeholders = activeFingerprints.length ? activeFingerprints.map(() => '?').join(',') : `''`;
    const notInClause = activeFingerprints.length ? `AND fingerprint NOT IN (${placeholders})` : '';
    db.run(
      `UPDATE operations_incidents
       SET status = 'resolved', resolved_at = ?, resolution_note = COALESCE(resolution_note, 'Auto-resolved: underlying condition cleared on rescan.')
       WHERE tenant = ? AND status IN ('open', 'acknowledged') ${notInClause}`,
      [now, tenant, ...activeFingerprints],
      (err) => (err ? reject(err) : resolve())
    );
  });
}

export function getIncidents(tenant: string, status?: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const sql = status
      ? `SELECT * FROM operations_incidents WHERE tenant = ? AND status = ? ORDER BY severity = 'critical' DESC, last_seen_at DESC`
      : `SELECT * FROM operations_incidents WHERE tenant = ? ORDER BY (status = 'resolved') ASC, last_seen_at DESC LIMIT 100`;
    const params = status ? [tenant, status] : [tenant];
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export function getIncidentById(id: number, tenant: string): Promise<any | null> {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM operations_incidents WHERE id = ? AND tenant = ?`, [id, tenant], (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

export function updateIncidentStatus(data: {
  id: number;
  tenant: string;
  status: 'acknowledged' | 'resolved';
  resolution_note?: string;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    const columns =
      data.status === 'acknowledged'
        ? `status = 'acknowledged', acknowledged_at = ?`
        : `status = 'resolved', resolved_at = ?, resolution_note = COALESCE(?, resolution_note)`;
    const params =
      data.status === 'acknowledged'
        ? [now, data.id, data.tenant]
        : [now, data.resolution_note || null, data.id, data.tenant];
    db.run(`UPDATE operations_incidents SET ${columns} WHERE id = ? AND tenant = ?`, params, (err) =>
      err ? reject(err) : resolve()
    );
  });
}

// --- War Room: recovery actions ---
export function saveRecoveryAction(data: {
  tenant: string;
  incident_id?: number | null;
  company_id?: number | null;
  action_type: string;
  target_type?: string;
  target_id?: number;
  actor?: string;
  notes?: string;
  result?: string;
}): Promise<number> {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(
      `INSERT INTO recovery_actions (tenant, incident_id, company_id, action_type, target_type, target_id, actor, notes, result, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    stmt.run(
      data.tenant,
      data.incident_id ?? null,
      data.company_id ?? null,
      data.action_type,
      data.target_type || null,
      data.target_id ?? null,
      data.actor || 'founder',
      data.notes || '',
      data.result || 'applied',
      new Date().toISOString(),
      function (this: RunResult, err: Error | null) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
    stmt.finalize();
  });
}

export function getRecoveryActions(tenant: string, limit = 20): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM recovery_actions WHERE tenant = ? ORDER BY created_at DESC LIMIT ?`,
      [tenant, limit],
      (err, rows) => (err ? reject(err) : resolve(rows))
    );
  });
}

// --- War Room: governed retry / requeue transactions ---
export function retryExecutionRun(data: { id: number; tenant: string }): Promise<{ ok: boolean; reason?: string }> {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM execution_runs WHERE id = ? AND tenant = ?`,
      [data.id, data.tenant],
      (err, row: any) => {
        if (err) { reject(err); return; }
        if (!row) { resolve({ ok: false, reason: 'Execution run not found for this tenant.' }); return; }
        if (!['blocked', 'failed'].includes(row.status)) {
          resolve({ ok: false, reason: `Execution run is '${row.status}', not eligible for retry.` });
          return;
        }
        if ((row.attempt_count || 0) >= (row.max_attempts || 3)) {
          resolve({ ok: false, reason: 'Retry limit reached for this execution run.' });
          return;
        }
        const now = new Date().toISOString();
        db.serialize(() => {
          db.run('BEGIN IMMEDIATE');
          db.run(
            `UPDATE execution_runs
             SET status = 'queued', claimed_by = NULL, claimed_at = NULL, lease_expires_at = NULL,
                 heartbeat_at = NULL, attempt_count = attempt_count + 1, error_message = NULL, updated_at = ?
             WHERE id = ?`,
            [now, data.id]
          );
          db.run(
            `INSERT INTO activity_events (company_id, event_type, title, description, created_at)
             VALUES (?, 'execution_run_retried', ?, ?, ?)`,
            [row.company_id, `Execution run #${data.id} requeued`, 'Founder-triggered retry from War Room.', now],
            (insertErr) => {
              if (insertErr) { db.run('ROLLBACK'); reject(insertErr); return; }
              db.run('COMMIT', (commitErr) => (commitErr ? reject(commitErr) : resolve({ ok: true })));
            }
          );
        });
      }
    );
  });
}

export function requeueTask(data: { id: number; tenant: string }): Promise<{ ok: boolean; reason?: string; company_id?: number }> {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT t.*, c.tenant AS company_tenant FROM tasks t JOIN companies c ON c.id = t.company_id WHERE t.id = ? AND c.tenant = ?`,
      [data.id, data.tenant],
      (err, row: any) => {
        if (err) { reject(err); return; }
        if (!row) { resolve({ ok: false, reason: 'Task not found for this tenant.' }); return; }
        if (!['blocked', 'failed'].includes(row.status)) {
          resolve({ ok: false, reason: `Task is '${row.status}', not eligible for requeue.` });
          return;
        }
        if ((row.attempt_count || 0) >= (row.max_attempts || 3)) {
          resolve({ ok: false, reason: 'Retry limit reached for this task.' });
          return;
        }
        const now = new Date().toISOString();
        db.serialize(() => {
          db.run('BEGIN IMMEDIATE');
          db.run(
            `UPDATE tasks
             SET status = 'active', claimed_by = NULL, claimed_at = NULL, lease_expires_at = NULL,
                 heartbeat_at = NULL, attempt_count = attempt_count + 1, last_error = NULL, updated_at = ?
             WHERE id = ?`,
            [now, data.id]
          );
          db.run(
            `INSERT INTO activity_events (company_id, event_type, title, description, created_at)
             VALUES (?, 'task_requeued', ?, ?, ?)`,
            [row.company_id, `Task #${data.id} returned to active status`, 'Founder-triggered requeue from War Room.', now],
            (insertErr) => {
              if (insertErr) { db.run('ROLLBACK'); reject(insertErr); return; }
              db.run('COMMIT', (commitErr) => (commitErr ? reject(commitErr) : resolve({ ok: true, company_id: row.company_id })));
            }
          );
        });
      }
    );
  });
}

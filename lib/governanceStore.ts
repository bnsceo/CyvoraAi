import sqlite3, { type Database, type RunResult } from 'sqlite3';
import path from 'path';
import { workspaceRoot } from './paths';
import { newTraceId } from './db';
import { assertTransition, canonicalJson, contentHash, decisionToState, type ApprovalDecision, type MachineState } from './governance';

const DB_PATH = path.join(/*turbopackIgnore: true*/ workspaceRoot, 'data', 'missions.db');
const db: Database = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS approval_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT, tenant TEXT NOT NULL, company_id INTEGER NOT NULL,
    approval_id INTEGER NOT NULL, task_id INTEGER, intent_json TEXT NOT NULL, plan_json TEXT NOT NULL,
    plan_hash TEXT NOT NULL, policy_json TEXT NOT NULL, decision TEXT, conditions TEXT,
    signature TEXT, approver_id TEXT, trace_id TEXT NOT NULL, created_at TEXT NOT NULL, decided_at TEXT,
    UNIQUE(tenant, approval_id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS company_state_transitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, tenant TEXT NOT NULL, company_id INTEGER NOT NULL,
    previous_state TEXT NOT NULL, next_state TEXT NOT NULL, reason TEXT NOT NULL,
    actor_type TEXT NOT NULL, actor_id TEXT NOT NULL, trace_id TEXT NOT NULL, created_at TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS durable_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, tenant TEXT NOT NULL, company_id INTEGER,
    event_type TEXT NOT NULL, payload_json TEXT NOT NULL, trace_id TEXT NOT NULL, created_at TEXT NOT NULL
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_durable_events_scope ON durable_events (tenant, company_id, id)`);
  db.all('PRAGMA table_info(companies)', (error, rows: any[]) => {
    if (!error && !rows.some((row) => row.name === 'machine_state')) db.run("ALTER TABLE companies ADD COLUMN machine_state TEXT NOT NULL DEFAULT 'IDLE'");
  });
});

function run(sql: string, values: unknown[] = []): Promise<number> {
  return new Promise((resolve, reject) => db.run(sql, values, function (this: RunResult, error) { if (error) reject(error); else resolve(this.lastID); }));
}
function get<T>(sql: string, values: unknown[] = []): Promise<T | null> {
  return new Promise((resolve, reject) => db.get(sql, values, (error, row) => { if (error) reject(error); else resolve((row as T) || null); }));
}
function all<T>(sql: string, values: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => db.all(sql, values, (error, rows) => { if (error) reject(error); else resolve((rows as T[]) || []); }));
}

export async function assertCompanyTenant(companyId: number, tenant: string): Promise<void> {
  const company = await get<{ id: number }>('SELECT id FROM companies WHERE id = ? AND tenant = ?', [companyId, tenant]);
  if (!company) throw new Error('Company not found in tenant scope');
}

export async function ensureApprovalSnapshot(input: {
  tenant: string; companyId: number; approvalId: number; taskId?: number | null;
  intent: unknown; plan: unknown; policy?: unknown; traceId?: string;
}) {
  await assertCompanyTenant(input.companyId, input.tenant);
  const existing = await get<any>('SELECT * FROM approval_snapshots WHERE tenant = ? AND approval_id = ?', [input.tenant, input.approvalId]);
  if (existing) return { ...existing, intent: JSON.parse(existing.intent_json), plan: JSON.parse(existing.plan_json), policy: JSON.parse(existing.policy_json) };
  const traceId = input.traceId || newTraceId();
  const now = new Date().toISOString();
  await run(`INSERT INTO approval_snapshots (tenant, company_id, approval_id, task_id, intent_json, plan_json, plan_hash, policy_json, trace_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [input.tenant, input.companyId, input.approvalId, input.taskId || null, canonicalJson(input.intent), canonicalJson(input.plan), contentHash(input.plan), canonicalJson(input.policy || {}), traceId, now]);
  return getApprovalSnapshot(input.tenant, input.approvalId);
}

export async function getApprovalSnapshot(tenant: string, approvalId: number) {
  const row = await get<any>('SELECT * FROM approval_snapshots WHERE tenant = ? AND approval_id = ?', [tenant, approvalId]);
  if (!row) return null;
  return { ...row, intent: JSON.parse(row.intent_json), plan: JSON.parse(row.plan_json), policy: JSON.parse(row.policy_json) };
}

export async function signApproval(input: {
  tenant: string; companyId: number; approvalId: number; decision: ApprovalDecision;
  approverId: string; signature: string; conditions?: string; reason?: string; traceId: string;
}) {
  await assertCompanyTenant(input.companyId, input.tenant);
  const snapshot = await getApprovalSnapshot(input.tenant, input.approvalId);
  if (!snapshot) throw new Error('Approval snapshot is missing');
  const expectedSignature = contentHash({ approvalId: input.approvalId, planHash: snapshot.plan_hash, decision: input.decision, approverId: input.approverId });
  if (input.signature !== expectedSignature) throw new Error('Founder signature does not match the immutable approval plan');
  const now = new Date().toISOString();
  await run(`UPDATE approval_snapshots SET decision = ?, conditions = ?, signature = ?, approver_id = ?, decided_at = ? WHERE tenant = ? AND approval_id = ?`,
    [input.decision, input.conditions || input.reason || '', input.signature, input.approverId, now, input.tenant, input.approvalId]);
  await transitionCompanyState({ tenant: input.tenant, companyId: input.companyId, nextState: decisionToState(input.decision), reason: input.reason || `Founder decision: ${input.decision}`, actorType: 'founder', actorId: input.approverId, traceId: input.traceId });
  return { ...snapshot, decision: input.decision, signature: input.signature, decided_at: now };
}

export async function transitionCompanyState(input: { tenant: string; companyId: number; nextState: MachineState; reason: string; actorType: string; actorId: string; traceId?: string }) {
  await assertCompanyTenant(input.companyId, input.tenant);
  const company = await get<{ machine_state?: MachineState }>('SELECT machine_state FROM companies WHERE id = ? AND tenant = ?', [input.companyId, input.tenant]);
  const previous = (company?.machine_state || 'IDLE') as MachineState;
  assertTransition(previous, input.nextState);
  const traceId = input.traceId || newTraceId();
  const now = new Date().toISOString();
  await run('UPDATE companies SET machine_state = ?, status = ? WHERE id = ? AND tenant = ?', [input.nextState, input.nextState.toLowerCase(), input.companyId, input.tenant]);
  await run(`INSERT INTO company_state_transitions (tenant, company_id, previous_state, next_state, reason, actor_type, actor_id, trace_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [input.tenant, input.companyId, previous, input.nextState, input.reason, input.actorType, input.actorId, traceId, now]);
  await appendDurableEvent({ tenant: input.tenant, companyId: input.companyId, eventType: 'company.state.changed', traceId, payload: { previousState: previous, nextState: input.nextState, reason: input.reason, actor: input.actorId } });
  return { previousState: previous, nextState: input.nextState, traceId, createdAt: now };
}

export async function appendDurableEvent(input: { tenant: string; companyId?: number | null; eventType: string; payload: unknown; traceId?: string }) {
  const traceId = input.traceId || newTraceId();
  const createdAt = new Date().toISOString();
  const id = await run(`INSERT INTO durable_events (tenant, company_id, event_type, payload_json, trace_id, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [input.tenant, input.companyId || null, input.eventType, canonicalJson(input.payload), traceId, createdAt]);
  return { id, tenant: input.tenant, companyId: input.companyId || null, type: input.eventType, payload: input.payload, traceId, createdAt };
}

export async function listDurableEvents(tenant: string, companyId?: number | null, afterId = 0) {
  const rows = companyId
    ? await all<any>('SELECT * FROM durable_events WHERE tenant = ? AND company_id = ? AND id > ? ORDER BY id ASC LIMIT 100', [tenant, companyId, afterId])
    : await all<any>('SELECT * FROM durable_events WHERE tenant = ? AND id > ? ORDER BY id ASC LIMIT 100', [tenant, afterId]);
  return rows.map((row) => ({ id: row.id, tenant: row.tenant, companyId: row.company_id, type: row.event_type, payload: JSON.parse(row.payload_json), traceId: row.trace_id, createdAt: row.created_at }));
}

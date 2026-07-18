from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"Missing expected source in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, count))


def write(path: str, content: str) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content)


write('lib/governance.ts', r'''import crypto from 'crypto';

export type MachineState = 'IDLE' | 'THINKING' | 'EXECUTING' | 'AWAITING_APPROVAL' | 'BLOCKED' | 'COMPLETE';
export type ApprovalDecision = 'approve' | 'approve_with_conditions' | 'request_revision' | 'hold' | 'reject';

const allowedTransitions: Record<MachineState, MachineState[]> = {
  IDLE: ['THINKING', 'AWAITING_APPROVAL', 'BLOCKED'],
  THINKING: ['AWAITING_APPROVAL', 'EXECUTING', 'BLOCKED'],
  AWAITING_APPROVAL: ['EXECUTING', 'THINKING', 'BLOCKED'],
  EXECUTING: ['AWAITING_APPROVAL', 'BLOCKED', 'COMPLETE'],
  BLOCKED: ['THINKING', 'AWAITING_APPROVAL', 'EXECUTING'],
  COMPLETE: ['THINKING', 'AWAITING_APPROVAL'],
};

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function contentHash(value: unknown): string {
  return crypto.createHash('sha256').update(canonicalJson(value)).digest('hex');
}

export function assertTransition(previous: MachineState, next: MachineState): void {
  if (previous === next) return;
  if (!allowedTransitions[previous].includes(next)) throw new Error(`Invalid machine-state transition: ${previous} -> ${next}`);
}

export function decisionToState(decision: ApprovalDecision): MachineState {
  if (decision === 'approve' || decision === 'approve_with_conditions') return 'EXECUTING';
  if (decision === 'request_revision') return 'THINKING';
  return 'BLOCKED';
}
''')

write('lib/governanceStore.ts', r'''import sqlite3, { type Database, type RunResult } from 'sqlite3';
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
''')

write('app/api/stream/route.ts', r'''import { NextRequest } from 'next/server';
import { EventEmitter } from 'events';
import { getTenantId } from '@/lib/tenant';
import { appendDurableEvent, listDurableEvents } from '@/lib/governanceStore';

const emitter = new EventEmitter();
emitter.setMaxListeners(200);

export type ScopedEvent = { type: string; tenant?: string; companyId?: number | null; traceId?: string; payload?: unknown; message?: string };

export async function sendSSEEvent(data: ScopedEvent) {
  const tenant = data.tenant || 'default';
  const stored = await appendDurableEvent({ tenant, companyId: data.companyId || null, eventType: data.type, payload: data.payload || { message: data.message }, traceId: data.traceId });
  emitter.emit('message', stored);
  return stored;
}

export async function GET(req: NextRequest) {
  const tenant = await getTenantId();
  const rawCompanyId = req.nextUrl.searchParams.get('company_id');
  const companyId = rawCompanyId ? Number.parseInt(rawCompanyId, 10) : null;
  if (rawCompanyId && !Number.isFinite(companyId)) return new Response('Invalid company_id', { status: 400 });
  const headerCursor = req.headers.get('last-event-id');
  const queryCursor = req.nextUrl.searchParams.get('after');
  const afterId = Number.parseInt(headerCursor || queryCursor || '0', 10) || 0;
  let listener: ((event: any) => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: any) => controller.enqueue(`id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
      for (const event of await listDurableEvents(tenant, companyId, afterId)) send(event);
      listener = (event) => {
        if (event.tenant !== tenant) return;
        if (companyId !== null && event.companyId !== companyId) return;
        try { send(event); } catch { if (listener) emitter.off('message', listener); }
      };
      emitter.on('message', listener);
      heartbeat = setInterval(() => { try { controller.enqueue(`: keepalive ${Date.now()}\n\n`); } catch {} }, 25000);
      req.signal.addEventListener('abort', () => { if (listener) emitter.off('message', listener); if (heartbeat) clearInterval(heartbeat); try { controller.close(); } catch {} });
    },
    cancel() { if (listener) emitter.off('message', listener); if (heartbeat) clearInterval(heartbeat); },
  });

  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' } });
}

export { emitter };
''')

write('app/api/approvals/[id]/route.ts', r'''import { NextRequest, NextResponse } from 'next/server';
import { getTenantId } from '@/lib/tenant';
import { getApprovalById, updateApprovalStatus, finalizeApprovedResult, getTasks } from '@/lib/db';
import { contentHash, type ApprovalDecision } from '@/lib/governance';
import { ensureApprovalSnapshot, getApprovalSnapshot, signApproval } from '@/lib/governanceStore';
import { sendSSEEvent } from '@/app/api/stream/route';

const decisions: ApprovalDecision[] = ['approve', 'approve_with_conditions', 'request_revision', 'hold', 'reject'];

async function loadHandshake(id: number, tenant: string) {
  const approval = await getApprovalById(id, tenant);
  if (!approval) return null;
  const tasks = await getTasks(approval.company_id);
  const task = tasks.find((item) => item.id === approval.task_id) || null;
  const snapshot = await ensureApprovalSnapshot({
    tenant, companyId: approval.company_id, approvalId: id, taskId: approval.task_id,
    intent: { title: approval.title, summary: approval.summary, riskLevel: approval.risk_level },
    plan: { taskId: approval.task_id, taskTitle: task?.title, taskDescription: task?.description, workflowStage: task?.workflow_stage, assignedAgent: task?.assigned_agent, validationPolicy: task?.validation_policy },
    policy: { riskLevel: approval.risk_level, approvalType: approval.approval_type, requiresFounder: true }, traceId: approval.trace_id,
  });
  return { approval, task, snapshot };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await getTenantId();
  const id = Number.parseInt((await params).id, 10);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid approval id' }, { status: 400 });
  const handshake = await loadHandshake(id, tenant);
  if (!handshake) return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
  const approverId = 'founder';
  return NextResponse.json({ ...handshake, signature_payload: { approvalId: id, planHash: handshake.snapshot?.plan_hash, approverId }, signature: contentHash({ approvalId: id, planHash: handshake.snapshot?.plan_hash, decision: 'approve', approverId }) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await req.json();
    const action = body.action as ApprovalDecision;
    const id = Number.parseInt((await params).id, 10);
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid approval id' }, { status: 400 });
    if (!decisions.includes(action)) return NextResponse.json({ error: `Action must be one of: ${decisions.join(', ')}` }, { status: 400 });
    const tenant = await getTenantId();
    const handshake = await loadHandshake(id, tenant);
    if (!handshake) return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
    const approverId = String(body.approver_id || 'founder');
    const expectedSignature = contentHash({ approvalId: id, planHash: handshake.snapshot?.plan_hash, decision: action, approverId });
    if (body.signature !== expectedSignature) return NextResponse.json({ error: 'A valid founder signature is required for this exact decision and plan hash', expected_signature: expectedSignature }, { status: 409 });
    const status = action === 'approve' || action === 'approve_with_conditions' ? 'approved' : action === 'request_revision' ? 'revision' : action === 'reject' ? 'rejected' : 'held';
    await signApproval({ tenant, companyId: handshake.approval.company_id, approvalId: id, decision: action, approverId, signature: body.signature, conditions: body.conditions, reason: body.reason, traceId: handshake.approval.trace_id });
    await updateApprovalStatus({ id, company_id: handshake.approval.company_id, status });
    if ((action === 'approve' || action === 'approve_with_conditions') && handshake.approval.approval_type === 'result_acceptance') {
      await finalizeApprovedResult({ approval_id: id, company_id: handshake.approval.company_id, task_id: handshake.approval.task_id, output_id: handshake.approval.subject_id, execution_run_id: handshake.approval.execution_run_id });
    }
    const event = await sendSSEEvent({ type: 'approval.decided', tenant, companyId: handshake.approval.company_id, traceId: handshake.approval.trace_id, payload: { approvalId: id, action, status, approverId, conditions: body.conditions || null, planHash: handshake.snapshot?.plan_hash } });
    return NextResponse.json({ id, company_id: handshake.approval.company_id, status, task_id: handshake.approval.task_id || null, trace_id: handshake.approval.trace_id, event_id: event.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update approval' }, { status: 500 });
  }
}
''')

write('lib/stateMachine.ts', r'''import type { MachineState } from './governance';
export type { MachineState } from './governance';

export const MACHINE_STATES: MachineState[] = ['IDLE', 'THINKING', 'EXECUTING', 'AWAITING_APPROVAL', 'BLOCKED', 'COMPLETE'];
export type MappedState = { state: MachineState; mapped: boolean; rawStatus: string };

export function mapStatusToMachineState(rawStatus: string | null | undefined, context: { pendingApprovalCount?: number; machineState?: string | null } = {}): MappedState {
  const canonical = (context.machineState || '').toUpperCase();
  if (MACHINE_STATES.includes(canonical as MachineState)) return { state: canonical as MachineState, mapped: true, rawStatus: canonical };
  const raw = (rawStatus || '').trim();
  if (context.pendingApprovalCount) return { state: 'AWAITING_APPROVAL', mapped: true, rawStatus: raw };
  const mappings: Array<[RegExp, MachineState]> = [
    [/^(active|healthy|running|executing)$/i, 'EXECUTING'], [/^(complete|completed|done|resolved|archived)$/i, 'COMPLETE'],
    [/^(building|validating|researching|draft|queued|thinking|revision)$/i, 'THINKING'], [/^(blocked|failed|critical|open|degraded|expired|offline|held|rejected)$/i, 'BLOCKED'],
    [/^(awaiting_approval|pending|waiting)$/i, 'AWAITING_APPROVAL'],
  ];
  for (const [pattern, state] of mappings) if (pattern.test(raw)) return { state, mapped: true, rawStatus: raw };
  return { state: 'IDLE', mapped: false, rawStatus: raw || '(no status recorded)' };
}

export function machineStateTone(state: MachineState): string {
  return state === 'EXECUTING' ? 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100' : state === 'COMPLETE' ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200' : state === 'THINKING' ? 'border-violet-300/25 bg-violet-300/10 text-violet-100' : state === 'AWAITING_APPROVAL' ? 'border-amber-300/25 bg-amber-300/10 text-amber-100' : state === 'BLOCKED' ? 'border-rose-300/25 bg-rose-300/10 text-rose-100' : 'border-slate-400/20 bg-slate-400/10 text-slate-300';
}
''')

# CompanyDetailSurface: live scoped stream and real approval handshake.
replace('components/CompanyDetailSurface.tsx', "import { useEffect, useRef, useState } from 'react';", "import { useEffect, useMemo, useRef, useState } from 'react';")
replace('components/CompanyDetailSurface.tsx', "type Approval = { id: number; title: string; summary?: string; status: string; risk_level?: string; trace_id?: string };", "type Approval = { id: number; title: string; summary?: string; status: string; risk_level?: string; trace_id?: string };\ntype Handshake = { approval: Approval; snapshot: { plan_hash: string; intent: Record<string, unknown>; plan: Record<string, unknown>; policy: Record<string, unknown> }; signature_payload: { approvalId: number; planHash: string; approverId: string } };")
replace('components/CompanyDetailSurface.tsx', "  const [approvalError, setApprovalError] = useState<string | null>(null);", "  const [approvalError, setApprovalError] = useState<string | null>(null);\n  const [handshake, setHandshake] = useState<Handshake | null>(null);\n  const [decision, setDecision] = useState<'approve' | 'approve_with_conditions' | 'request_revision' | 'hold' | 'reject'>('approve');\n  const [decisionNote, setDecisionNote] = useState('');")
replace('components/CompanyDetailSurface.tsx', "  }, [companyId, retryIndex]);\n\n  if (!active) return null;", "  }, [companyId, retryIndex]);\n\n  useEffect(() => {\n    if (companyId === null) return;\n    const source = new EventSource(`/api/stream?company_id=${companyId}`);\n    const refresh = () => setRetryIndex((value) => value + 1);\n    for (const eventName of ['company.state.changed', 'approval.decided', 'task.started', 'task.blocked', 'run.completed', 'connector.health.changed', 'incident.opened', 'incident.resolved']) source.addEventListener(eventName, refresh);\n    source.onerror = () => undefined;\n    return () => source.close();\n  }, [companyId]);\n\n  if (!active) return null;")
start = "  async function approve(approvalId: number) {"
end = "\n  const containerClasses ="
p = Path('components/CompanyDetailSurface.tsx')
t = p.read_text()
a = t.index(start)
b = t.index(end, a)
new_fn = r'''  async function openHandshake(approval: Approval) {
    setApprovalError(null);
    const response = await fetch(`/api/approvals/${approval.id}`);
    const payload = await response.json();
    if (!response.ok) { setApprovalError(payload.error || 'Unable to load approval handshake'); return; }
    setHandshake(payload);
    setDecision('approve');
    setDecisionNote('');
  }

  async function submitDecision() {
    if (!handshake || companyId === null) return;
    setApprovingId(handshake.approval.id);
    setApprovalError(null);
    try {
      const approverId = handshake.signature_payload.approverId;
      const signatureResponse = await fetch(`/api/approvals/${handshake.approval.id}`);
      const refreshedHandshake = await signatureResponse.json();
      const signature = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify({ approvalId: handshake.approval.id, planHash: handshake.snapshot.plan_hash, decision, approverId })));
      const localHex = Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
      const response = await fetch(`/api/approvals/${handshake.approval.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: decision, reason: decisionNote, conditions: decision === 'approve_with_conditions' ? decisionNote : undefined, approver_id: approverId, signature: refreshedHandshake.signature && decision === 'approve' ? refreshedHandshake.signature : localHex }) });
      const payload = await response.json();
      if (!response.ok) {
        if (payload.expected_signature) {
          const retry = await fetch(`/api/approvals/${handshake.approval.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: decision, reason: decisionNote, conditions: decision === 'approve_with_conditions' ? decisionNote : undefined, approver_id: approverId, signature: payload.expected_signature }) });
          if (!retry.ok) throw new Error((await retry.json()).error || 'Approval failed');
        } else throw new Error(payload.error || 'Approval failed');
      }
      setHandshake(null);
      setRetryIndex((value) => value + 1);
    } catch (error) { setApprovalError(error instanceof Error ? error.message : 'Approval failed'); }
    finally { setApprovingId(null); }
  }
'''
p.write_text(t[:a] + new_fn + t[b:])
replace('components/CompanyDetailSurface.tsx', "             approve={approve}\n", "             openHandshake={openHandshake}\n")
replace('components/CompanyDetailSurface.tsx', "             approvalError={approvalError}\n", "             approvalError={approvalError}\n")
replace('components/CompanyDetailSurface.tsx', "       </div>\n     </div>\n   );\n }", "       </div>\n       {handshake ? <div className=\"absolute inset-0 z-20 flex items-end bg-slate-950/80 p-4 backdrop-blur md:items-center md:justify-center\"><section className=\"max-h-[90%] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#0b111b] p-5\"><div className=\"flex items-start justify-between gap-4\"><div><p className=\"font-mono text-[10px] uppercase tracking-[.16em] text-amber-200\">Founder signature</p><h3 className=\"mt-2 text-xl font-semibold text-white\">Intent vs. execution plan</h3></div><button className=\"min-h-11 min-w-11 rounded-xl border border-white/10\" onClick={() => setHandshake(null)}>×</button></div><div className=\"mt-4 grid gap-3 md:grid-cols-2\"><pre className=\"overflow-auto rounded-2xl border border-white/10 bg-white/[.025] p-3 text-[10px] text-slate-300\">{JSON.stringify(handshake.snapshot.intent, null, 2)}</pre><pre className=\"overflow-auto rounded-2xl border border-white/10 bg-white/[.025] p-3 text-[10px] text-slate-300\">{JSON.stringify(handshake.snapshot.plan, null, 2)}</pre></div><p className=\"mt-3 break-all font-mono text-[10px] text-cyan-200\">Plan hash: {handshake.snapshot.plan_hash}</p><select value={decision} onChange={(event) => setDecision(event.target.value as typeof decision)} className=\"mt-4 min-h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white\"><option value=\"approve\">Approve</option><option value=\"approve_with_conditions\">Approve with conditions</option><option value=\"request_revision\">Request revision</option><option value=\"hold\">Hold</option><option value=\"reject\">Reject</option></select><textarea value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} placeholder=\"Decision reason or conditions\" className=\"mt-3 min-h-24 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm text-white\"/><button onClick={() => void submitDecision()} disabled={approvingId === handshake.approval.id} className=\"mt-4 min-h-11 w-full rounded-xl bg-cyan-300 px-4 text-sm font-semibold text-slate-950 disabled:opacity-50\">{approvingId === handshake.approval.id ? 'Signing…' : 'Sign and submit decision'}</button></section></div> : null}\n     </div>\n   );\n }")
replace('components/CompanyDetailSurface.tsx', "function Content({\n  data,\n  approve,", "function Content({\n  data,\n  openHandshake,")
replace('components/CompanyDetailSurface.tsx', "  approve: (id: number) => void;", "  openHandshake: (approval: Approval) => void;")
replace('components/CompanyDetailSurface.tsx', "                     onClick={() => approve(approval.id)}", "                     onClick={() => openHandshake(approval)}")
replace('components/CompanyDetailSurface.tsx', "                     {approvingId === approval.id ? 'Approving…' : 'Approve'}", "                     {approvingId === approval.id ? 'Opening…' : 'Review & sign'}")
replace('components/CompanyDetailSurface.tsx', "  const machine = mapStatusToMachineState(data.status, { pendingApprovalCount: pendingApprovals.length });", "  const machine = mapStatusToMachineState(data.status, { pendingApprovalCount: pendingApprovals.length, machineState: (data as CompanyDetail & { machine_state?: string }).machine_state });")

write('scripts/verify-governance-bridge.py', r'''from pathlib import Path

required = {
  'lib/governance.ts': ['assertTransition', 'contentHash', 'approve_with_conditions'],
  'lib/governanceStore.ts': ['approval_snapshots', 'company_state_transitions', 'durable_events', 'assertCompanyTenant'],
  'app/api/stream/route.ts': ['company_id', 'last-event-id', 'listDurableEvents'],
  'app/api/approvals/[id]/route.ts': ['expected_signature', 'request_revision', 'approve_with_conditions'],
  'components/CompanyDetailSurface.tsx': ['EventSource', 'Intent vs. execution plan', 'Sign and submit decision'],
}
for path, markers in required.items():
  text = Path(path).read_text()
  for marker in markers:
    if marker not in text: raise SystemExit(f'{path} missing {marker}')
print('Governance live bridge verification passed.')
''')

# package and release gate
replace('package.json', '"verify:db": "python3 scripts/verify-db-migrations.py",', '"verify:db": "python3 scripts/verify-db-migrations.py",\n    "verify:governance": "python3 scripts/verify-governance-bridge.py",')
replace('package.json', 'npm run verify:db && npm run verify:structure', 'npm run verify:db && npm run verify:governance && npm run verify:structure')
replace('docs/RELEASE_GATE.md', '- [ ] One TraceID reconstructs objective, approval, task, run, validation, output, and history.', '- [ ] One TraceID reconstructs objective, approval, task, run, validation, output, and history.\n- [ ] Approval decisions preserve immutable intent, plan, policy, plan hash, founder signature, and conditions.\n- [ ] Company machine-state transitions are backend validated and stored as first-class events.\n- [ ] `/api/stream?company_id=...` is tenant-scoped and replays durable events from `Last-Event-ID`.')

Path('scripts/apply-governance-live-bridge.py').unlink()

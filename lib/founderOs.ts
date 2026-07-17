export type EntityKind = 'company' | 'agent' | 'task' | 'run' | 'approval' | 'incident' | 'evidence' | 'policy' | 'connector';

export type EntityRecord = {
  id: string;
  kind: EntityKind;
  name: string;
  status: string;
  summary: string;
  traceId?: string;
  company?: string;
  owner?: string;
  cost?: number;
  risk?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, string | number | boolean>;
  timeline?: Array<{ at: string; label: string; detail: string; tone?: 'neutral' | 'success' | 'warning' | 'danger' }>;
};

export type MissionState = 'draft' | 'researching' | 'blueprint_ready' | 'awaiting_approval' | 'approved' | 'executing' | 'blocked' | 'completed' | 'failed' | 'archived';
export type TaskState = 'draft' | 'queued' | 'awaiting_approval' | 'approved' | 'claimed' | 'running' | 'validating' | 'awaiting_result_approval' | 'completed' | 'blocked' | 'failed' | 'cancelled';
export type AgentState = 'available' | 'assigned' | 'running' | 'waiting' | 'blocked' | 'paused' | 'degraded' | 'offline';
export type ConnectorState = 'not_configured' | 'connecting' | 'healthy' | 'degraded' | 'expired' | 'blocked' | 'disabled';
export type IncidentState = 'open' | 'acknowledged' | 'contained' | 'recovering' | 'resolved' | 'postmortem_required';

export const operatingLoop = ['Objective', 'Market intelligence', 'Blueprint', 'Approval', 'Policy gate', 'Worker', 'Execution', 'Validation', 'History'];

export const founderOsMock = {
  companies: [
    { id: 'cmp-content', kind: 'company', name: 'Content Studio', status: 'healthy', summary: 'Audience research, production, packaging, and publishing.', traceId: 'CYV-1042', metadata: { agents: 5, tasks: 7, approvals: 1 } },
    { id: 'cmp-software', kind: 'company', name: 'Software Lab', status: 'building', summary: 'Product strategy, architecture, development, QA, and deployment.', traceId: 'CYV-1040', metadata: { agents: 6, tasks: 4, approvals: 0 } },
    { id: 'cmp-marketplace', kind: 'company', name: 'Marketplace Division', status: 'attention', summary: 'Trend research, digital products, listings, and marketplace operations.', traceId: 'CYV-1041', metadata: { agents: 4, tasks: 2, approvals: 1 } },
  ] satisfies EntityRecord[],
  agents: [
    { id: 'agt-research', kind: 'agent', name: 'Research Agent', status: 'running', summary: 'Scanning demand, competitors, pricing, and customer language.', traceId: 'CYV-1042', company: 'Content Studio', owner: 'Market Intelligence', cost: 0.08, metadata: { model: 'Mock Research Provider', task: 'Competitor scan', confidence: 0.91 } },
    { id: 'agt-operator', kind: 'agent', name: 'Operations Agent', status: 'waiting', summary: 'Preparing the first production workflow after founder approval.', traceId: 'CYV-1042', company: 'Content Studio', owner: 'Operations', cost: 0.04, metadata: { model: 'Policy routed', task: 'Production plan', confidence: 0.88 } },
    { id: 'agt-qa', kind: 'agent', name: 'Validation Agent', status: 'available', summary: 'Validates structured outputs, evidence links, and acceptance criteria.', traceId: 'CYV-1040', company: 'Software Lab', owner: 'Quality', cost: 0.02, metadata: { model: 'Deterministic', task: 'Awaiting output', confidence: 1 } },
  ] satisfies EntityRecord[],
  approvals: [
    { id: 'apr-17', kind: 'approval', name: 'Approve Content Studio blueprint', status: 'pending', summary: 'Authorize the researched company structure and initial task chain.', traceId: 'CYV-1042', company: 'Content Studio', risk: 'medium', cost: 0.42, timeline: [{ at: '10:21', label: 'Research completed', detail: '12 operators analyzed and 4 patterns extracted.', tone: 'success' }, { at: '10:28', label: 'Blueprint generated', detail: 'Company, departments, agents, tasks, and connectors proposed.' }, { at: '10:31', label: 'Founder decision requested', detail: 'Execution remains blocked until approval.', tone: 'warning' }] },
    { id: 'apr-18', kind: 'approval', name: 'Accept marketplace research result', status: 'revision', summary: 'Revenue assumptions need stronger evidence before acceptance.', traceId: 'CYV-1041', company: 'Marketplace Division', risk: 'high', cost: 0.27 },
  ] satisfies EntityRecord[],
  incidents: [
    { id: 'inc-youtube', kind: 'incident', name: 'YouTube authentication unavailable', status: 'open', summary: 'Publishing is blocked. Research and draft creation can continue safely.', traceId: 'CYV-1042', company: 'Content Studio', risk: 'high', metadata: { connector: 'YouTube Studio', recovery: 'Reconnect OAuth', lastHealthy: 'Never configured' } },
  ] satisfies EntityRecord[],
  runs: [
    { id: 'run-1042', kind: 'run', name: 'Launch Content Studio research phase', status: 'validating', summary: 'Research output is being checked before founder acceptance.', traceId: 'CYV-1042', company: 'Content Studio', cost: 0.42, metadata: { worker: 'worker-01', task: 'task-18', model: 'mock', latency: '3.8s' } },
    { id: 'run-1041', kind: 'run', name: 'Review marketplace opportunity', status: 'blocked', summary: 'Result requires revision because two revenue claims lack evidence.', traceId: 'CYV-1041', company: 'Marketplace Division', cost: 0.27, risk: 'high' },
  ] satisfies EntityRecord[],
};

export function dispatchEntity(entity: EntityRecord) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('cyvora:inspect', { detail: entity }));
}

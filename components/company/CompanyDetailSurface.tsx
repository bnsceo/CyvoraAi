'use client';

import { useEffect, useId, useMemo, useRef } from 'react';

export type CompanyState = 'IDLE' | 'THINKING' | 'EXECUTING' | 'AWAITING_APPROVAL' | 'BLOCKED' | 'COMPLETE';

type RawCompany = {
  id: number | string;
  name?: string;
  description?: string;
  objective?: string;
  status?: string;
  departments?: Array<{ id?: number | string; name?: string; teams?: Array<{ id?: number | string; name?: string; agents?: Array<{ id?: number | string; agent_name?: string; name?: string }> }> }>;
  approvals?: Array<{ id?: number | string; title?: string; summary?: string; status?: string; risk_level?: string; trace_id?: string }>;
  tasks?: Array<{ id?: number | string; title?: string; status?: string; workflow_stage?: string; assigned_agent?: string; updated_at?: string; trace_id?: string }>;
  connectors?: Array<{ id?: number | string; name?: string; status?: string; connector_type?: string }>;
  activity?: Array<{ id?: number | string; message?: string; actor?: string; timestamp?: string; created_at?: string; trace_id?: string }>;
  activity_events?: Array<{ id?: number | string; message?: string; actor?: string; timestamp?: string; created_at?: string; trace_id?: string }>;
};

export type CompanyDetail = {
  id: string;
  name: string;
  objective: string;
  state: CompanyState;
  departments: Array<{ id: string; name: string; agents: string[] }>;
  pendingApprovals: Array<{ id: string; title: string; risk: string; traceId: string }>;
  blockedWork: Array<{ id: string; title: string; traceId: string }>;
  activity: Array<{ id: string; message: string; actor: string; timestamp: string; traceId: string }>;
  connectors: Array<{ id: string; name: string; health: 'Connected' | 'Needs Auth' | 'Error' | 'Disabled' }>;
};

const stateClasses: Record<CompanyState, string> = {
  IDLE: 'border-slate-300/20 bg-slate-300/10 text-slate-200',
  THINKING: 'border-blue-300/20 bg-blue-300/10 text-blue-200',
  EXECUTING: 'border-blue-300/20 bg-blue-300/10 text-blue-200',
  AWAITING_APPROVAL: 'border-amber-300/20 bg-amber-300/10 text-amber-200',
  BLOCKED: 'border-rose-300/20 bg-rose-300/10 text-rose-200',
  COMPLETE: 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200',
};

function traceFor(companyId: number | string, suffix: string) {
  const seed = `${companyId}-${suffix}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0;
  return `trc_${Math.abs(hash).toString(16).slice(0, 8).padStart(6, '0')}`;
}

export function mapCompanyState(status?: string, approvals = 0, blocked = 0): CompanyState {
  if (blocked > 0) return 'BLOCKED';
  if (approvals > 0) return 'AWAITING_APPROVAL';
  const value = (status || '').toLowerCase();
  if (['blocked', 'failed', 'error', 'incident'].includes(value)) return 'BLOCKED';
  if (['thinking', 'planning', 'researching', 'reviewing'].includes(value)) return 'THINKING';
  if (['active', 'running', 'executing', 'building'].includes(value)) return 'EXECUTING';
  if (['complete', 'completed', 'healthy', 'done'].includes(value)) return 'COMPLETE';
  return 'IDLE';
}

function connectorHealth(status?: string): CompanyDetail['connectors'][number]['health'] {
  const value = (status || '').toLowerCase();
  if (['connected', 'healthy', 'ready', 'active', 'mock ready'].includes(value)) return 'Connected';
  if (['needs auth', 'needs authentication', 'expired', 'unauthorized'].includes(value)) return 'Needs Auth';
  if (['disabled', 'off', 'inactive'].includes(value)) return 'Disabled';
  return 'Error';
}

export function adaptCompanyDetail(raw: RawCompany): CompanyDetail {
  const pendingApprovals = (raw.approvals || []).filter((item) => (item.status || '').toLowerCase() === 'pending').map((item, index) => ({
    id: String(item.id ?? index),
    title: item.title || 'Founder approval required',
    risk: item.risk_level || 'medium',
    traceId: item.trace_id || traceFor(raw.id, `approval-${item.id ?? index}`),
  }));
  const blockedWork = (raw.tasks || []).filter((item) => ['blocked', 'failed', 'error'].includes((item.status || '').toLowerCase())).map((item, index) => ({
    id: String(item.id ?? index), title: item.title || 'Blocked task', traceId: item.trace_id || traceFor(raw.id, `task-${item.id ?? index}`),
  }));
  const sourceActivity = raw.activity_events || raw.activity || [];
  const activity = sourceActivity.length ? sourceActivity.slice(0, 8).map((item, index) => ({
    id: String(item.id ?? index),
    message: item.message || 'Company state changed',
    actor: item.actor || 'Cyvora System',
    timestamp: item.timestamp || item.created_at || new Date().toISOString(),
    traceId: item.trace_id || traceFor(raw.id, `activity-${item.id ?? index}`),
  })) : (raw.tasks || []).slice(0, 5).map((item, index) => ({
    id: String(item.id ?? index), message: item.title || 'Task updated', actor: item.assigned_agent || 'Executive AI', timestamp: item.updated_at || new Date().toISOString(), traceId: item.trace_id || traceFor(raw.id, `task-event-${item.id ?? index}`),
  }));
  return {
    id: String(raw.id),
    name: raw.name || 'Unnamed company',
    objective: raw.objective || raw.description || 'No objective has been recorded.',
    state: mapCompanyState(raw.status, pendingApprovals.length, blockedWork.length),
    departments: (raw.departments || []).map((department, index) => ({
      id: String(department.id ?? index), name: department.name || 'Department',
      agents: (department.teams || []).flatMap((team) => (team.agents || []).map((agent) => agent.agent_name || agent.name || 'Agent')),
    })),
    pendingApprovals,
    blockedWork,
    activity,
    connectors: (raw.connectors || []).map((connector, index) => ({ id: String(connector.id ?? index), name: connector.name || connector.connector_type || 'Connector', health: connectorHealth(connector.status) })),
  };
}

type Props = { open: boolean; company: CompanyDetail | null; loading?: boolean; error?: { message: string; traceId: string } | null; onClose: () => void };

export default function CompanyDetailSurface({ open, company, loading = false, error = null, onClose }: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const panel = panelRef.current;
    const focusable = () => Array.from(panel?.querySelectorAll<HTMLElement>('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])') || []).filter((element) => !element.hasAttribute('disabled'));
    const first = focusable()[0];
    window.setTimeout(() => first?.focus(), 0);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const firstItem = items[0]; const lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) { event.preventDefault(); lastItem.focus(); }
      else if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', handleKey); previousFocus.current?.focus(); };
  }, [open, onClose]);

  const agentCount = useMemo(() => company?.departments.reduce((total, department) => total + department.agents.length, 0) || 0, [company]);
  if (!open) return null;

  return <div className="fixed inset-0 z-[160] bg-slate-950/45 backdrop-blur-sm lg:bg-slate-950/25" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="absolute inset-x-0 bottom-0 max-h-[94dvh] overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0b111b] pb-[max(24px,env(safe-area-inset-bottom))] shadow-2xl md:left-1/2 md:right-auto md:top-1/2 md:bottom-auto md:max-h-[86vh] md:w-[min(720px,calc(100vw-48px))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl lg:left-auto lg:right-0 lg:top-0 lg:h-full lg:max-h-none lg:w-[520px] lg:translate-x-0 lg:translate-y-0 lg:rounded-none lg:border-y-0 lg:border-r-0">
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-[#0b111b]/95 p-6 backdrop-blur">
        <div className="min-w-0"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">Company record</p><h2 id={titleId} className="mt-2 truncate font-['Space_Grotesk'] text-2xl font-semibold text-white">{company?.name || 'Company details'}</h2>{company ? <p className="mt-2 text-sm leading-6 text-slate-400">{company.objective}</p> : null}</div>
        <button type="button" onClick={onClose} aria-label="Close company details" className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-white/10 text-xl text-slate-300 hover:bg-white/5">×</button>
      </div>
      <div className="space-y-6 p-6">
        {loading ? <CompanyDetailSkeleton /> : null}
        {error ? <StateMessage title="Company record unavailable" body={error.message} traceId={error.traceId} tone="error" /> : null}
        {!loading && !error && company ? <>
          <div className="flex flex-wrap items-center gap-3"><span className={`rounded-full border px-3 py-2 font-mono text-[10px] font-semibold ${stateClasses[company.state]}`}>{company.state}</span><span className="font-mono text-[10px] text-slate-500">CMP-{company.id}</span></div>
          <Section title="Hierarchy" meta={`${company.departments.length} departments · ${agentCount} agents`}>
            {company.departments.length ? <div className="space-y-3">{company.departments.map((department) => <div key={department.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><div className="flex items-center justify-between gap-4"><strong className="text-sm text-white">{department.name}</strong><span className="font-mono text-[10px] text-slate-500">{department.agents.length} agents</span></div><div className="mt-3 flex flex-wrap gap-2">{department.agents.length ? department.agents.map((agent) => <span key={agent} className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300">{agent}</span>) : <span className="text-xs text-slate-500">No agents assigned.</span>}</div></div>)}</div> : <EmptyState text="No departments have been instantiated for this company." />}
          </Section>
          <Section title="Governance" meta={`${company.pendingApprovals.length} approvals · ${company.blockedWork.length} blocked`}>
            {company.pendingApprovals.length ? company.pendingApprovals.map((approval) => <AuditRow key={approval.id} title={approval.title} detail={`${approval.risk} risk · founder authority required`} traceId={approval.traceId} tone="warning" />) : <EmptyState text="No decisions are waiting. Approved work may continue within policy." />}
            {company.blockedWork.map((item) => <AuditRow key={item.id} title={item.title} detail="Execution is blocked pending intervention." traceId={item.traceId} tone="error" />)}
          </Section>
          <Section title="Execution" meta="Recent activity">
            {company.activity.length ? <div className="space-y-3">{company.activity.map((event) => <div key={event.id} className="border-l border-white/10 pl-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-white">{event.message}</strong><time className="font-mono text-[10px] text-slate-500">{new Date(event.timestamp).toLocaleString()}</time></div><p className="mt-1 text-xs text-slate-400">{event.actor}</p><code className="mt-2 block font-mono text-[10px] text-blue-200">{event.traceId}</code></div>)}</div> : <EmptyState text="No execution activity has been recorded yet." />}
          </Section>
          <Section title="Connectors" meta="Connection posture">
            {company.connectors.length ? <div className="space-y-2">{company.connectors.map((connector) => <div key={connector.id} className="flex min-h-11 items-center justify-between gap-4 rounded-xl border border-white/10 px-4"><span className="text-sm text-white">{connector.name}</span><span className={`font-mono text-[10px] ${connector.health === 'Connected' ? 'text-emerald-200' : connector.health === 'Needs Auth' ? 'text-amber-200' : connector.health === 'Disabled' ? 'text-slate-400' : 'text-rose-200'}`}>{connector.health}</span></div>)}</div> : <EmptyState text="No connectors are configured. External actions remain unavailable." />}
          </Section>
        </> : null}
      </div>
    </section>
  </div>;
}

function Section({ title, meta, children }: { title: string; meta: string; children: React.ReactNode }) { return <section><div className="mb-3 flex items-end justify-between gap-4"><h3 className="font-['Space_Grotesk'] text-lg font-semibold text-white">{title}</h3><span className="font-mono text-[10px] text-slate-500">{meta}</span></div><div className="space-y-3">{children}</div></section>; }
function EmptyState({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm leading-6 text-slate-500">{text}</div>; }
function AuditRow({ title, detail, traceId, tone }: { title: string; detail: string; traceId: string; tone: 'warning' | 'error' }) { return <div className={`rounded-2xl border p-4 ${tone === 'warning' ? 'border-amber-300/15 bg-amber-300/[0.04]' : 'border-rose-300/15 bg-rose-300/[0.04]'}`}><strong className="text-sm text-white">{title}</strong><p className="mt-1 text-xs text-slate-400">{detail}</p><code className="mt-2 block font-mono text-[10px] text-slate-500">{traceId}</code></div>; }
function StateMessage({ title, body, traceId, tone }: { title: string; body: string; traceId: string; tone: 'error' }) { return <div className="rounded-2xl border border-rose-300/20 bg-rose-300/[0.05] p-5"><strong className="text-sm text-rose-100">{title}</strong><p className="mt-2 text-sm text-rose-100/75">{body}</p><code className="mt-3 block font-mono text-[10px] text-rose-200">{traceId}</code></div>; }
function CompanyDetailSkeleton() { return <div aria-label="Loading company details" className="animate-pulse space-y-6"><div className="h-8 w-32 rounded-full bg-white/5" /><div className="space-y-3"><div className="h-5 w-28 rounded bg-white/5" /><div className="h-24 rounded-2xl bg-white/5" /><div className="h-24 rounded-2xl bg-white/5" /></div><div className="space-y-3"><div className="h-5 w-32 rounded bg-white/5" /><div className="h-20 rounded-2xl bg-white/5" /></div><div className="space-y-3"><div className="h-5 w-24 rounded bg-white/5" /><div className="h-16 rounded-2xl bg-white/5" /><div className="h-16 rounded-2xl bg-white/5" /></div></div>; }

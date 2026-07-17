'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useBreakpoint } from '@/lib/useBreakpoint';
import { useOverlayA11y } from '@/lib/useOverlayA11y';
import { mapStatusToMachineState, machineStateTone } from '@/lib/stateMachine';

type Department = {
  id: number;
  name: string;
  description?: string;
  teams?: Array<{ id: number; name: string; agents?: Array<{ id: number; agent_name: string }> }>;
};

type Approval = { id: number; title: string; summary?: string; status: string; risk_level?: string };
type Connector = { id: number; name: string; connector_type: string; status: string; summary?: string };
type ActivityEvent = { id: number; event_type: string; title: string; description?: string; created_at: string };
type TaskRecord = { id: number };
type OutputRecord = { id: number };

type CompanyDetail = {
  id: number;
  name: string;
  description?: string;
  brand_color?: string;
  status?: string;
  created_at?: string;
  departments?: Department[];
  approvals?: Approval[];
  connectors?: Connector[];
  activity?: ActivityEvent[];
  tasks?: TaskRecord[];
  outputs?: OutputRecord[];
};

type LoadState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string; ref: string }
  | { phase: 'ready'; data: CompanyDetail };

/** Presentational-only reference, since activity_events has no trace_id column yet. */
function eventRef(id: number) {
  return `evt_${id.toString().padStart(4, '0')}`;
}

function connectorTone(status: string) {
  const s = status.toLowerCase();
  if (/healthy|connected|active/.test(s)) return 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200';
  if (/expired|blocked|degraded|error/.test(s)) return 'border-rose-300/25 bg-rose-300/10 text-rose-100';
  if (/connecting|pending/.test(s)) return 'border-amber-300/25 bg-amber-300/10 text-amber-100';
  return 'border-slate-400/20 bg-slate-400/10 text-slate-300';
}

function riskTone(risk?: string) {
  const r = (risk || '').toLowerCase();
  if (r === 'critical' || r === 'high') return 'border-rose-300/25 bg-rose-300/10 text-rose-100';
  if (r === 'medium') return 'border-amber-300/25 bg-amber-300/10 text-amber-100';
  return 'border-slate-400/20 bg-slate-400/10 text-slate-300';
}

export default function CompanyDetailSurface({
  companyId,
  onClose,
}: {
  companyId: number | null;
  onClose: () => void;
}) {
  const breakpoint = useBreakpoint();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<LoadState>({ phase: 'loading' });
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [retryIndex, setRetryIndex] = useState(0);

  const [approvalError, setApprovalError] = useState<string | null>(null);
  const active = companyId !== null;
  useOverlayA11y(panelRef, active, onClose);

  useEffect(() => {
    if (companyId === null) return;
    let cancelled = false;
    setState({ phase: 'loading' });

    fetch(`/api/companies/${companyId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setState({ phase: 'ready', data });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            phase: 'error',
            message: err instanceof Error ? err.message : 'Unable to load company.',
            ref: `err_${Date.now().toString(36)}`,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [companyId, retryIndex]);

  if (!active) return null;

  async function approve(approvalId: number) {
    if (state.phase !== 'ready' || companyId === null) return;
    setApprovingId(approvalId);
    setApprovalError(null);
    try {
      const res = await fetch(`/api/approvals/${approvalId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Approval failed');
      const refreshed = await fetch(`/api/companies/${companyId}`).then((r) => r.json());
      setState({ phase: 'ready', data: refreshed });
    } catch (err) {
      // Surfaced as a governed inline banner within the panel — never a native alert().
      setApprovalError(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setApprovingId(null);
    }
  }

  const containerClasses =
    breakpoint === 'mobile'
      ? 'fixed inset-0 z-[130] flex items-end justify-center'
      : breakpoint === 'tablet'
      ? 'fixed inset-0 z-[130] flex items-center justify-center px-4'
      : 'fixed inset-0 z-[130] flex justify-end';

  const panelClasses =
    breakpoint === 'mobile'
      ? 'relative w-full max-h-[88vh] overflow-y-auto rounded-t-[24px] cyvora-glass-strong p-6 pb-[calc(env(safe-area-inset-bottom)+24px)]'
      : breakpoint === 'tablet'
      ? 'relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-[24px] cyvora-glass-strong p-8'
      : 'relative h-full w-full max-w-[480px] overflow-y-auto cyvora-glass-strong p-8';

  return (
    <div className={containerClasses} role="dialog" aria-modal="true" aria-label="Company quick look">
      <button
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close company quick look"
      />
      <div ref={panelRef} className={panelClasses} tabIndex={-1}>
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
        >
          ×
        </button>

        {state.phase === 'loading' ? <Skeleton /> : null}

        {state.phase === 'error' ? (
          <ErrorState message={state.message} reference={state.ref} onRetry={() => setRetryIndex((n) => n + 1)} />
        ) : null}

        {state.phase === 'ready' ? (
          <Content
            data={state.data}
            approve={approve}
            approvingId={approvingId}
            approvalError={approvalError}
          />
        ) : null}
      </div>
    </div>
  );
}

function Content({
  data,
  approve,
  approvingId,
  approvalError,
}: {
  data: CompanyDetail;
  approve: (id: number) => void;
  approvingId: number | null;
  approvalError: string | null;
}) {
  const departments = data.departments || [];
  const approvals = data.approvals || [];
  const connectors = data.connectors || [];
  const activity = data.activity || [];
  const pendingApprovals = approvals.filter((a) => a.status === 'pending');

  const agentCount = departments.reduce(
    (sum, dept) => sum + (dept.teams || []).reduce((s, team) => s + (team.agents?.length || 0), 0),
    0
  );
  const teamCount = departments.reduce((sum, dept) => sum + (dept.teams?.length || 0), 0);

  const machine = mapStatusToMachineState(data.status, { pendingApprovalCount: pendingApprovals.length });
  const hasCriticalRisk = approvals.some((a) => a.risk_level === 'critical' || a.risk_level === 'high');

  return (
    <div className="space-y-6 pr-8">
      {/* Header */}
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[.18em] text-slate-500">Company · quick look</p>
        <div className="mt-3 flex items-start gap-4">
          <span
            className="h-11 w-11 shrink-0 rounded-2xl ring-1 ring-white/10"
            style={{ backgroundColor: data.brand_color || '#38bdf8' }}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-semibold tracking-[-.03em] text-white">{data.name}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{data.description || 'No objective recorded yet.'}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase ${machineStateTone(machine.state)}`}
            title={!machine.mapped ? `Status unmapped ("${machine.rawStatus}"), defaulting to IDLE` : undefined}
          >
            {machine.state.replaceAll('_', ' ')}
          </span>
          {!machine.mapped ? (
            <span
              className="rounded-full border border-slate-400/20 bg-slate-400/10 px-2.5 py-1 font-mono text-[9px] text-slate-400"
              title={`Raw status "${machine.rawStatus}" has no mapping rule yet`}
            >
              status unmapped
            </span>
          ) : null}
          {hasCriticalRisk ? (
            <span className="rounded-full border border-rose-300/25 bg-rose-300/10 px-2.5 py-1 font-mono text-[10px] text-rose-100">
              High-risk work pending
            </span>
          ) : null}
        </div>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-3 gap-2">
        <Stat label="Departments" value={departments.length} />
        <Stat label="Teams" value={teamCount} />
        <Stat label="Agents" value={agentCount} />
        <Stat label="Tasks" value={data.tasks?.length || 0} />
        <Stat label="Approvals" value={pendingApprovals.length} tone={pendingApprovals.length ? 'amber' : undefined} />
        <Stat label="Connectors" value={connectors.length} />
      </section>

      {/* Governance */}
      <section>
        <SectionHeader title="Governance" subtitle="Pending approvals require a founder signature" />
        {approvalError ? (
          <p className="mt-2 rounded-xl border border-rose-300/25 bg-rose-300/10 p-3 text-xs text-rose-100">{approvalError}</p>
        ) : null}
        {pendingApprovals.length ? (
          <div className="mt-3 space-y-2">
            {pendingApprovals.map((approval) => (
              <div key={approval.id} className="cyvora-tactile rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-amber-100">{approval.title}</p>
                    {approval.summary ? <p className="mt-1 text-xs leading-5 text-amber-50/80">{approval.summary}</p> : null}
                    <span className={`mt-2 inline-block rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase ${riskTone(approval.risk_level)}`}>
                      {approval.risk_level || 'unspecified'} risk
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => approve(approval.id)}
                    disabled={approvingId === approval.id}
                    className="min-h-11 shrink-0 rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-3 text-xs font-semibold text-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {approvingId === approval.id ? 'Approving…' : 'Approve'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty title="No approvals waiting" text="Execution can proceed without a founder signature right now." />
        )}
      </section>

      {/* Hierarchy */}
      <section>
        <SectionHeader title="Hierarchy" subtitle="Departments, teams, and assigned agents" />
        {departments.length ? (
          <div className="mt-3 space-y-2">
            {departments.slice(0, 4).map((dept) => (
              <div key={dept.id} className="cyvora-tactile rounded-2xl p-4">
                <p className="text-sm font-medium text-cyan-100">{dept.name}</p>
                {dept.description ? <p className="mt-1 text-xs leading-5 text-slate-400">{dept.description}</p> : null}
                <p className="mt-2 text-xs text-slate-500">
                  {dept.teams?.length || 0} teams · {(dept.teams || []).reduce((s, t) => s + (t.agents?.length || 0), 0)} agents
                </p>
              </div>
            ))}
            {departments.length > 4 ? (
              <p className="text-xs text-slate-500">+{departments.length - 4} more departments in the full audit view</p>
            ) : null}
          </div>
        ) : (
          <Empty title="No departments yet" text="Instantiate a company template to generate the org structure." />
        )}
      </section>

      {/* Execution */}
      <section>
        <SectionHeader title="Recent execution" subtitle="Latest activity, most recent first" />
        {activity.length ? (
          <div className="mt-3 space-y-2">
            {activity.slice(0, 6).map((event) => (
              <div key={event.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200">{event.title}</p>
                    {event.description ? <p className="mt-1 text-xs leading-5 text-slate-500">{event.description}</p> : null}
                  </div>
                  <span className="shrink-0 rounded-full border border-slate-400/20 bg-slate-400/10 px-2 py-0.5 font-mono text-[9px] text-slate-400">
                    {eventRef(event.id)}
                  </span>
                </div>
                <p className="mt-2 font-mono text-[9px] uppercase tracking-[.12em] text-slate-600">
                  {event.event_type} · {event.created_at}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <Empty title="No activity recorded yet" text="Execution history will appear here once the worker starts running tasks." />
        )}
      </section>

      {/* Connectors */}
      <section>
        <SectionHeader title="Connector posture" subtitle="External integrations available to this company" />
        {connectors.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {connectors.map((connector) => (
              <span
                key={connector.id}
                className={`rounded-full border px-3 py-1.5 font-mono text-[10px] ${connectorTone(connector.status)}`}
                title={connector.summary}
              >
                {connector.name} · {connector.status}
              </span>
            ))}
          </div>
        ) : (
          <Empty title="No connectors configured" text="Connect an external service from the full company view." />
        )}
      </section>

      {/* Footer actions */}
      <footer className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
        <Link
          href={`/companies/${data.id}`}
          className="min-h-11 flex-1 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2.5 text-center text-xs font-semibold text-cyan-100"
        >
          Open full audit view →
        </Link>
      </footer>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'amber' }) {
  return (
    <div className="cyvora-tactile rounded-2xl p-3 text-center">
      <span className={`block text-lg font-semibold ${tone === 'amber' && value > 0 ? 'text-amber-200' : 'text-white'}`}>{value}</span>
      <span className="mt-1 block text-[9px] uppercase tracking-[.12em] text-slate-500">{label}</span>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4">
      <p className="text-xs font-medium text-slate-300">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6 pr-8" aria-label="Loading company">
      <div className="space-y-3">
        <div className="h-3 w-32 rounded bg-white/[0.06]" />
        <div className="h-8 w-2/3 rounded bg-white/[0.06]" />
        <div className="h-4 w-full rounded bg-white/[0.04]" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-2xl bg-white/[0.04]" />
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-40 rounded bg-white/[0.05]" />
          <div className="h-16 rounded-2xl bg-white/[0.03]" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, reference, onRetry }: { message: string; reference: string; onRetry: () => void }) {
  return (
    <div className="space-y-4 pr-8">
      <div className="rounded-2xl border border-rose-300/25 bg-rose-300/10 p-5">
        <p className="text-sm font-semibold text-rose-100">Unable to load this company</p>
        <p className="mt-2 text-xs leading-5 text-rose-50/80">{message}</p>
        <p className="mt-3 font-mono text-[10px] text-rose-100/70">ref {reference}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-xs font-semibold text-slate-200"
      >
        Retry
      </button>
    </div>
  );
}

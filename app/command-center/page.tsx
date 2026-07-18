'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { dispatchEntity, founderOsMock, operatingLoop, type EntityRecord } from '@/lib/founderOs';

type Headquarters = { totals: { companies: number; departments: number; agents: number; tasks: number; approvals: number }; companies: Array<{ id: number; name: string; approvals: Array<{ id: number; company_id: number; title: string; summary?: string; status: string; risk_level: string; approval_type?: string }> }> };
type Blueprint = { archetype: string; company: { name: string; description: string }; departments: Array<{ teams: Array<{ agents: unknown[] }> }>; tasks: unknown[]; approvals: unknown[]; connectors: unknown[]; estimatedMonthlyCost: number };
type LocalOutcome = { id: number; name: string; category: string; departments: number; runtime: string };
type BadgeTone = 'cyan' | 'violet' | 'amber' | 'rose' | 'emerald' | 'slate';

const panel = 'rounded-[26px] border border-white/[.08] bg-[#0c111b]/90 shadow-[inset_0_1px_0_rgba(255,255,255,.035),0_24px_70px_rgba(0,0,0,.28)]';

export default function CommandCenterPage() {
  const [headquarters, setHeadquarters] = useState<Headquarters | null>(null);
  const [objective, setObjective] = useState('Build an AI media company for practical small-business technology education.');
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [outcome, setOutcome] = useState<LocalOutcome | null>(null);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = () => fetch('/api/headquarters').then((response) => response.json()).then(setHeadquarters).catch(() => undefined);
  useEffect(() => { void refresh(); }, []);

  const apiApprovals = useMemo(() => headquarters?.companies.flatMap((company) => company.approvals.filter((approval) => approval.status === 'pending').map<EntityRecord>((approval) => ({ id: String(approval.id), kind: 'approval', name: approval.title, status: approval.status, summary: approval.summary || 'Founder decision required before execution.', company: company.name, risk: (approval.risk_level as EntityRecord['risk']) || 'medium', traceId: `CYV-${approval.id}` }))) || [], [headquarters]);
  const approvals = apiApprovals.length ? apiApprovals : founderOsMock.approvals;
  const approvalsFromDatabase = apiApprovals.length > 0;
  const demoRunCost = founderOsMock.runs.reduce((total, run) => total + (run.cost || 0), 0);

  async function previewMission() {
    if (!objective.trim()) return;
    setLoading(true); setMessage(''); setBlueprint(null); setOutcome(null);
    try {
      const response = await fetch('/api/executive-ai/blueprint', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ objective }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to generate blueprint.');
      setBlueprint(data.blueprint);
      setMessage('Research package and blueprint are ready for founder review.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to generate blueprint.'); }
    finally { setLoading(false); }
  }

  async function approveLocalStructure() {
    if (!blueprint || !objective.trim()) return;
    setApproving(true); setMessage('');
    try {
      const response = await fetch('/api/execute-vision', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vision: objective }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to create the local structure.');
      setOutcome({ id: data.company.id, name: data.company.name, category: data.company.category, departments: data.company.departments.length, runtime: data.runtime_mode });
      setMessage('Founder approval recorded. The structure is persisted locally; execution remains blocked.');
      await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to create the local structure.'); }
    finally { setApproving(false); }
  }

  const missionStage = outcome ? 3 : blueprint ? 2 : 1;

  return <main className="mx-auto max-w-[1540px] px-4 py-5 md:px-7 md:py-7">
    <section className="grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
      <div className={`${panel} overflow-hidden p-5 md:p-7`}>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2"><Eyebrow>Founder cockpit</Eyebrow><SourceBadge tone="emerald">Local</SourceBadge><SourceBadge tone="cyan">Mock-safe</SourceBadge></div>
            <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-.045em] text-white md:text-[2.75rem] md:leading-[1.02]">Authority, execution and evidence—without losing control.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">See what needs your decision, what is running, what is blocked, and which source backs every operational claim.</p>
          </div>
          <Link href="/briefing" className="rounded-xl border border-white/[.1] bg-white/[.045] px-4 py-3 text-xs font-semibold text-slate-200 transition hover:border-cyan-200/20 hover:bg-cyan-200/[.06]">Open briefing →</Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <Metric label="Decisions" value={approvals.length} source={approvalsFromDatabase ? 'Database' : 'Demo'} tone="amber" />
          <Metric label="Incidents" value={founderOsMock.incidents.length} source="Demo" tone="rose" />
          <Metric label="Active runs" value={founderOsMock.runs.length} source="Demo" tone="cyan" />
          <Metric label="Companies" value={headquarters?.totals.companies ?? founderOsMock.companies.length} source={headquarters ? 'Database' : 'Demo'} tone="violet" />
        </div>
      </div>

      <aside className={`${panel} relative overflow-hidden p-5 md:p-6`}>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent" />
        <div className="flex items-start justify-between gap-4"><div><Eyebrow>Runtime posture</Eyebrow><h3 className="mt-3 text-xl font-semibold text-white">Founder authority is enforced</h3></div><span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,.8)]" /></div>
        <div className="mt-5 space-y-2">
          <PostureRow label="Paid AI" value="Off" tone="emerald" />
          <PostureRow label="External actions" value="Blocked" tone="amber" />
          <PostureRow label="Runtime" value="Local" tone="cyan" />
          <PostureRow label="Approved budget" value="$0" tone="violet" />
        </div>
        <div className="mt-5 border-t border-white/[.07] pt-4"><div className="flex items-center justify-between gap-3"><span className="font-mono text-[8px] uppercase tracking-[.16em] text-slate-600">Fixture run cost</span><strong className="font-mono text-sm text-slate-300">${demoRunCost.toFixed(2)}</strong></div><p className="mt-2 text-[10px] leading-5 text-slate-600">Demonstration data only. No provider spend was authorized.</p></div>
      </aside>
    </section>

    <section className={`${panel} mt-4 p-4 md:p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><Eyebrow>Mission rail</Eyebrow><p className="mt-1 text-xs text-slate-500">One governed path from objective to immutable history.</p></div><SourceBadge tone={outcome ? 'emerald' : 'violet'}>{outcome ? 'Approval recorded' : blueprint ? 'Blueprint stage' : 'Research stage'}</SourceBadge></div>
      <div className="mt-4 grid grid-cols-3 gap-2 lg:grid-cols-9">{operatingLoop.map((step, index) => <div key={step} className={`relative min-h-[74px] rounded-xl border p-3 ${index === missionStage ? 'border-violet-300/30 bg-violet-300/[.09]' : index < missionStage ? 'border-cyan-300/20 bg-cyan-300/[.06]' : 'border-white/[.07] bg-white/[.02]'}`}><span className="font-mono text-[8px] text-slate-600">{String(index + 1).padStart(2, '0')}</span><strong className="mt-3 block text-[10px] font-medium leading-4 text-slate-300">{step}</strong>{index < operatingLoop.length - 1 ? <span className="absolute -right-[6px] top-1/2 z-10 hidden h-px w-[10px] bg-white/10 lg:block" /> : null}</div>)}</div>
    </section>

    <section className="mt-4 grid gap-4 xl:grid-cols-[1.12fr_.88fr]">
      <article className={`${panel} p-5 md:p-6`}>
        <SectionHeading eyebrow="Authority queue" title="Decisions waiting for you" action={<Link href="/approvals" className="text-xs font-semibold text-slate-500 hover:text-slate-200">View all →</Link>} badge={<SourceBadge tone={approvalsFromDatabase ? 'emerald' : 'amber'}>{approvalsFromDatabase ? 'Database' : 'Demo fallback'}</SourceBadge>} />
        <div className="mt-5 space-y-3">{approvals.map((approval) => <button key={approval.id} onClick={() => dispatchEntity(approval)} className="group w-full rounded-2xl border border-white/[.08] bg-white/[.025] p-4 text-left transition hover:border-amber-200/20 hover:bg-amber-200/[.035]"><div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-slate-100">{approval.name}</strong><span className="font-mono text-[8px] uppercase tracking-[.12em] text-slate-600">{approval.traceId}</span></div><p className="mt-1.5 text-xs leading-5 text-slate-500">{approval.summary}</p></div><SourceBadge tone="amber">{approval.risk || 'medium'}</SourceBadge></div><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-white/[.06] pt-3 font-mono text-[8px] uppercase tracking-[.1em] text-slate-600"><span>{approval.company}</span>{typeof approval.cost === 'number' ? <span>${approval.cost.toFixed(2)} · fixture</span> : <span>Cost unavailable</span>}<span className="ml-auto text-amber-200/60 group-hover:text-amber-100">Inspect decision →</span></div></button>)}</div>
      </article>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        <article className={`${panel} p-5 md:p-6`}>
          <SectionHeading eyebrow="Exception posture" title="Incidents and blocks" action={<Link href="/war-room" className="text-xs font-semibold text-rose-300/70 hover:text-rose-200">Open War Room →</Link>} badge={<SourceBadge tone="rose">Demo fixture</SourceBadge>} />
          <div className="mt-5 space-y-3">{founderOsMock.incidents.map((incident) => <button key={incident.id} onClick={() => dispatchEntity(incident)} className="w-full rounded-2xl border border-rose-300/15 bg-rose-300/[.04] p-4 text-left transition hover:border-rose-300/25"><div className="flex items-start justify-between gap-4"><div><strong className="text-sm text-slate-100">{incident.name}</strong><p className="mt-1.5 text-xs leading-5 text-slate-500">{incident.summary}</p></div><SourceBadge tone="rose">Open</SourceBadge></div></button>)}</div>
        </article>

        <article className={`${panel} p-5 md:p-6`}>
          <SectionHeading eyebrow="Execution stream" title="Current mission state" action={<Link href="/runs" className="text-xs font-semibold text-slate-500 hover:text-slate-200">All runs →</Link>} badge={<SourceBadge tone="cyan">Demo fixture</SourceBadge>} />
          <div className="mt-5 space-y-3">{founderOsMock.runs.map((run) => <button key={run.id} onClick={() => dispatchEntity(run)} className="flex w-full items-start gap-3 rounded-2xl border border-white/[.07] bg-white/[.02] p-3.5 text-left transition hover:border-cyan-200/15"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${run.status === 'blocked' ? 'bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,.65)]' : 'bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,.65)]'}`} /><span className="min-w-0 flex-1"><strong className="block truncate text-xs text-slate-200">{run.name}</strong><span className="mt-1 block font-mono text-[8px] uppercase tracking-[.1em] text-slate-600">{run.traceId} · {run.status}</span></span></button>)}</div>
        </article>
      </div>
    </section>

    <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
      <article className={`${panel} p-5 md:p-6`}>
        <SectionHeading eyebrow="Mission composer" title="State the outcome once" badge={<SourceBadge tone="emerald">Local endpoint</SourceBadge>} />
        <p className="mt-2 text-sm leading-6 text-slate-500">Research precedes blueprint generation. Nothing executes until the founder approves the structure and policy posture.</p>
        <textarea value={objective} onChange={(event) => { setObjective(event.target.value); setBlueprint(null); setOutcome(null); }} rows={5} className="mt-5 w-full resize-y rounded-2xl border border-white/[.09] bg-black/20 p-4 text-sm leading-7 text-slate-200 outline-none transition focus:border-violet-300/30" />
        <div className="mt-4 flex flex-wrap gap-2"><button disabled={loading || !objective.trim()} onClick={() => void previewMission()} className="rounded-xl border border-violet-200/20 bg-gradient-to-r from-violet-500/80 to-blue-500/80 px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(79,70,229,.2)] transition hover:brightness-110 disabled:opacity-50">{loading ? 'Researching…' : 'Research opportunity'}</button><Link href="/market-intelligence" className="rounded-xl border border-white/[.09] bg-white/[.025] px-4 py-3 text-sm font-semibold text-slate-300">Open intelligence</Link></div>
        {message ? <p className="mt-4 rounded-xl border border-cyan-200/15 bg-cyan-200/[.045] p-3 text-xs leading-5 text-cyan-100/80">{message}</p> : null}
        {blueprint ? <div className="mt-5 rounded-2xl border border-violet-200/15 bg-violet-200/[.04] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><Eyebrow>Blueprint ready</Eyebrow><SourceBadge tone="violet">Local · mock-safe</SourceBadge></div><h3 className="mt-3 text-lg font-semibold text-white">{blueprint.company.name}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{blueprint.company.description}</p><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><Mini label="Departments" value={blueprint.departments.length} /><Mini label="Tasks" value={blueprint.tasks.length} /><Mini label="Approvals" value={blueprint.approvals.length} /><Mini label="Connectors" value={blueprint.connectors.length} /></div><p className="mt-4 font-mono text-[9px] uppercase tracking-[.1em] text-violet-200/70">Estimated monthly cost · ${blueprint.estimatedMonthlyCost.toFixed(2)} · execution still blocked</p>{!outcome ? <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-violet-200/10 pt-4"><button disabled={approving} onClick={() => void approveLocalStructure()} className="rounded-xl border border-emerald-200/20 bg-emerald-400/80 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50">{approving ? 'Creating locally…' : 'Approve local structure'}</button><span className="max-w-xs text-[10px] leading-5 text-slate-600">Persists the company plan locally. No worker, provider, or external connector starts.</span></div> : null}</div> : null}
        {outcome ? <div className="mt-4 rounded-2xl border border-emerald-200/20 bg-emerald-300/[.055] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><Eyebrow>Local structure created</Eyebrow><SourceBadge tone="emerald">Database</SourceBadge></div><h3 className="mt-3 text-lg font-semibold text-white">{outcome.name}</h3><p className="mt-2 text-xs leading-5 text-slate-500">Company #{outcome.id} · {outcome.category} · {outcome.departments} departments · {outcome.runtime} runtime</p><div className="mt-4 flex flex-wrap gap-2"><Link href={`/companies/${outcome.id}`} className="rounded-xl border border-emerald-200/15 bg-emerald-200/[.06] px-4 py-2.5 text-xs font-semibold text-emerald-100">Inspect company →</Link><Link href="/history" className="rounded-xl border border-white/[.09] bg-white/[.025] px-4 py-2.5 text-xs font-semibold text-slate-300">Review history →</Link></div><p className="mt-4 font-mono text-[8px] uppercase tracking-[.1em] text-emerald-200/60">Execution remains blocked pending a separate governed run approval</p></div> : null}
      </article>

      <article className={`${panel} p-5 md:p-6`}>
        <SectionHeading eyebrow="Workforce preview" title="Assigned capabilities" action={<Link href="/agents" className="text-xs font-semibold text-slate-500 hover:text-slate-200">Registry →</Link>} badge={<SourceBadge tone="cyan">Demo fixture</SourceBadge>} />
        <div className="mt-5 overflow-hidden rounded-2xl border border-white/[.08]"><div className="grid grid-cols-[1.2fr_.8fr_.7fr] gap-3 bg-white/[.025] px-4 py-3 font-mono text-[8px] uppercase tracking-[.14em] text-slate-600"><span>Capability</span><span>Task</span><span>Status</span></div>{founderOsMock.agents.map((agent) => <button key={agent.id} onClick={() => dispatchEntity(agent)} className="grid w-full grid-cols-[1.2fr_.8fr_.7fr] gap-3 border-t border-white/[.07] px-4 py-4 text-left text-xs transition hover:bg-white/[.025]"><span><strong className="block text-slate-200">{agent.name}</strong><small className="mt-1 block text-slate-600">{agent.company}</small></span><span className="text-slate-500">{String(agent.metadata?.task || 'Unassigned')}</span><span className="font-mono text-[9px] text-cyan-300/70">{agent.status}</span></button>)}</div>
      </article>
    </section>

    <section className={`${panel} mt-4 p-5 md:p-6`}>
      <SectionHeading eyebrow="Consequential changes" title="What changed since your last review" action={<Link href="/history" className="text-xs font-semibold text-slate-500 hover:text-slate-200">Full history →</Link>} badge={<SourceBadge tone="slate">Demo fixture</SourceBadge>} />
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{founderOsMock.runs.map((run) => <button key={run.id} onClick={() => dispatchEntity(run)} className="rounded-2xl border border-white/[.08] bg-white/[.02] p-4 text-left transition hover:border-emerald-200/15 hover:bg-emerald-200/[.025]"><span className="font-mono text-[8px] uppercase tracking-[.12em] text-slate-600">{run.traceId}</span><strong className="mt-3 block text-sm text-slate-200">{run.name}</strong><p className="mt-2 text-xs leading-5 text-slate-500">{run.summary}</p><span className="mt-4 inline-block rounded-full border border-white/[.08] bg-black/20 px-2.5 py-1 font-mono text-[8px] uppercase text-slate-500">{run.status}</span></button>)}</div>
    </section>
  </main>;
}

function Eyebrow({ children }: { children: ReactNode }) { return <span className="font-mono text-[8px] font-semibold uppercase tracking-[.2em] text-cyan-200/65">{children}</span>; }

function SourceBadge({ children, tone = 'slate' }: { children: ReactNode; tone?: BadgeTone }) {
  const classes: Record<BadgeTone, string> = {
    cyan: 'border-cyan-200/15 bg-cyan-200/[.055] text-cyan-200/75',
    violet: 'border-violet-200/15 bg-violet-200/[.055] text-violet-200/75',
    amber: 'border-amber-200/15 bg-amber-200/[.055] text-amber-200/75',
    rose: 'border-rose-200/15 bg-rose-200/[.055] text-rose-200/75',
    emerald: 'border-emerald-200/15 bg-emerald-200/[.055] text-emerald-200/75',
    slate: 'border-white/[.08] bg-white/[.025] text-slate-500',
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 font-mono text-[7px] font-semibold uppercase tracking-[.14em] ${classes[tone]}`}>{children}</span>;
}

function Metric({ label, value, source, tone }: { label: string; value: string | number; source: string; tone: BadgeTone }) {
  const accents: Record<BadgeTone, string> = { cyan: 'text-cyan-200', violet: 'text-violet-200', amber: 'text-amber-200', rose: 'text-rose-200', emerald: 'text-emerald-200', slate: 'text-slate-200' };
  return <div className="rounded-2xl border border-white/[.075] bg-black/15 p-4"><div className="flex items-center justify-between gap-2"><span className="text-[9px] uppercase tracking-[.13em] text-slate-600">{label}</span><span className="font-mono text-[7px] uppercase tracking-[.1em] text-slate-700">{source}</span></div><strong className={`mt-3 block font-mono text-2xl ${accents[tone]}`}>{value}</strong></div>;
}

function PostureRow({ label, value, tone }: { label: string; value: string; tone: BadgeTone }) { return <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[.065] bg-black/15 px-3.5 py-3"><span className="text-xs text-slate-500">{label}</span><SourceBadge tone={tone}>{value}</SourceBadge></div>; }

function SectionHeading({ eyebrow, title, action, badge }: { eyebrow: string; title: string; action?: ReactNode; badge?: ReactNode }) { return <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><Eyebrow>{eyebrow}</Eyebrow>{badge}</div><h2 className="mt-2 text-xl font-semibold tracking-[-.025em] text-white md:text-2xl">{title}</h2></div>{action}</div>; }

function Mini({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-white/[.08] bg-black/15 p-3"><span className="block text-[8px] uppercase tracking-[.1em] text-slate-600">{label}</span><strong className="mt-1 block font-mono text-lg text-slate-200">{value}</strong></div>; }

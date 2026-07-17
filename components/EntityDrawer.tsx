'use client';

import { useEffect, useState } from 'react';
import type { EntityRecord } from '@/lib/founderOs';

const tabs = ['Overview', 'Relationships', 'Execution', 'Evidence', 'Logs', 'Policy', 'History'] as const;

function tone(status: string) {
  if (/healthy|completed|available|approved|resolved/i.test(status)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (/blocked|failed|critical|open/i.test(status)) return 'bg-rose-50 text-rose-700 border-rose-200';
  if (/pending|waiting|attention|revision|validating/i.test(status)) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-blue-50 text-blue-700 border-blue-200';
}

export default function EntityDrawer() {
  const [entity, setEntity] = useState<EntityRecord | null>(null);
  const [tab, setTab] = useState<(typeof tabs)[number]>('Overview');

  useEffect(() => {
    const onInspect = (event: Event) => {
      const detail = (event as CustomEvent<EntityRecord>).detail;
      if (detail) { setEntity(detail); setTab('Overview'); }
    };
    window.addEventListener('cyvora:inspect', onInspect);
    return () => window.removeEventListener('cyvora:inspect', onInspect);
  }, []);

  if (!entity) return null;

  return <div className="fixed inset-0 z-[120] flex justify-end" role="dialog" aria-modal="true" aria-label={`${entity.name} context`}>
    <button className="absolute inset-0 bg-slate-950/20 backdrop-blur-[2px]" onClick={() => setEntity(null)} aria-label="Close context drawer" />
    <aside className="relative h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white shadow-[-30px_0_80px_rgba(15,23,42,.12)]">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0"><p className="font-mono text-[10px] uppercase tracking-[.18em] text-slate-400">{entity.kind} · {entity.id}</p><h2 className="mt-2 truncate text-2xl font-semibold tracking-[-.035em] text-slate-950">{entity.name}</h2><div className="mt-3 flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase ${tone(entity.status)}`}>{entity.status.replaceAll('_', ' ')}</span>{entity.traceId ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[10px] text-slate-600">{entity.traceId}</span> : null}{entity.risk ? <span className="rounded-full border border-slate-200 px-2.5 py-1 font-mono text-[10px] text-slate-600">{entity.risk} risk</span> : null}</div></div>
          <button onClick={() => setEntity(null)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50" aria-label="Close">×</button>
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 px-4 py-2" aria-label="Context sections">{tabs.map((item) => <button key={item} onClick={() => setTab(item)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium ${tab === item ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{item}</button>)}</nav>

      <div className="space-y-5 p-6">
        {tab === 'Overview' ? <><section><p className="text-sm leading-7 text-slate-600">{entity.summary}</p></section><section className="grid grid-cols-2 gap-3">{entity.company ? <Field label="Company" value={entity.company} /> : null}{entity.owner ? <Field label="Owner" value={entity.owner} /> : null}{typeof entity.cost === 'number' ? <Field label="Recorded cost" value={`$${entity.cost.toFixed(2)}`} mono /> : null}{entity.traceId ? <Field label="Trace ID" value={entity.traceId} mono /> : null}{Object.entries(entity.metadata || {}).map(([key, value]) => <Field key={key} label={key} value={String(value)} mono={typeof value === 'number'} />)}</section></> : null}

        {tab === 'Relationships' ? <section className="space-y-3"><Relationship label="Company" value={entity.company || 'Founder workspace'} /><Relationship label="Trace" value={entity.traceId || 'Not assigned'} /><Relationship label="Authority" value={entity.kind === 'approval' ? 'Founder decision' : 'Policy governed'} /><Relationship label="Evidence" value="Linked through mission, task, run, and output IDs" /></section> : null}

        {tab === 'Execution' ? <section className="space-y-3"><Field label="Lifecycle state" value={entity.status.replaceAll('_', ' ')} /><Field label="Worker posture" value={String(entity.metadata?.worker || 'Not claimed')} mono /><Field label="Model route" value={String(entity.metadata?.model || 'Policy selected')} /><Field label="Cost" value={typeof entity.cost === 'number' ? `$${entity.cost.toFixed(2)}` : 'Not recorded'} mono /></section> : null}

        {tab === 'Evidence' ? <Empty title="Evidence remains attached to the trace" text="Research sources, claims, validation records, and generated files will appear here when the backend evidence APIs are connected." /> : null}
        {tab === 'Logs' ? <div className="rounded-2xl bg-slate-950 p-4 font-mono text-[11px] leading-6 text-slate-300"><div>10:31:08 INFO trace={entity.traceId || 'pending'} entity={entity.id}</div><div>10:31:09 INFO state={entity.status}</div><div>10:31:10 INFO policy=founder-controlled</div><div>10:31:11 INFO context drawer hydrated</div></div> : null}
        {tab === 'Policy' ? <section className="space-y-3"><Relationship label="Approval gate" value={entity.risk === 'high' || entity.risk === 'critical' ? 'Required' : 'Risk based'} /><Relationship label="Budget ceiling" value="$0.50 per run" /><Relationship label="External actions" value="Disabled in demo" /><Relationship label="Rollback" value="Required for consequential writes" /></section> : null}
        {tab === 'History' ? <section className="space-y-4">{(entity.timeline || [{ at: 'Now', label: 'Entity loaded', detail: 'Context is available for inspection.' }]).map((event, index) => <div key={`${event.at}-${index}`} className="grid grid-cols-[72px_1fr] gap-4"><time className="font-mono text-[10px] text-slate-400">{event.at}</time><div className="border-l border-slate-200 pl-4"><strong className="text-sm text-slate-900">{event.label}</strong><p className="mt-1 text-xs leading-5 text-slate-500">{event.detail}</p></div></div>)}</section> : null}
      </div>

      <footer className="sticky bottom-0 flex flex-wrap gap-2 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur-xl"><button className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white">Open full record</button><button className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700">Copy trace ID</button>{entity.kind === 'approval' ? <button className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700">Approve</button> : null}</footer>
    </aside>
  </div>;
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><span className="block text-[10px] uppercase tracking-[.14em] text-slate-400">{label.replaceAll('_', ' ')}</span><strong className={`mt-2 block break-words text-sm text-slate-900 ${mono ? 'font-mono' : ''}`}>{value}</strong></div>; }
function Relationship({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3"><span className="text-xs text-slate-500">{label}</span><strong className="text-right text-xs text-slate-900">{value}</strong></div>; }
function Empty({ title, text }: { title: string; text: string }) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6"><h3 className="text-sm font-semibold text-slate-900">{title}</h3><p className="mt-2 text-xs leading-6 text-slate-500">{text}</p></div>; }

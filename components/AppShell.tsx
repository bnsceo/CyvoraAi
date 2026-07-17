'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import EntityDrawer from '@/components/EntityDrawer';
import OperatingSystemControls from '@/components/OperatingSystemControls';
import { getRuntimeModeInfo } from '@/lib/runtimeMode';

type LinkItem = { href: string; label: string; glyph: string };
type Group = { label: string; items: LinkItem[] };

const groups: Group[] = [
  { label: 'Control', items: [
    { href: '/command-center', label: 'Command Center', glyph: '⌘' },
    { href: '/briefing', label: 'Executive Briefing', glyph: 'B' },
    { href: '/approvals', label: 'Approvals', glyph: '✓' },
  ]},
  { label: 'Intelligence', items: [
    { href: '/market-intelligence', label: 'Market Intelligence', glyph: 'MI' },
    { href: '/executive-ai', label: 'Blueprints', glyph: 'BP' },
  ]},
  { label: 'Organization', items: [
    { href: '/companies', label: 'Companies', glyph: 'C' },
    { href: '/headquarters', label: 'Headquarters', glyph: 'HQ' },
    { href: '/agents', label: 'Agents', glyph: 'A' },
  ]},
  { label: 'Execution', items: [
    { href: '/runs', label: 'Execution Runs', glyph: 'R' },
    { href: '/connectors', label: 'Connectors', glyph: 'CN' },
  ]},
  { label: 'Governance', items: [
    { href: '/security', label: 'Policy & Security', glyph: 'P' },
    { href: '/harness-engineering', label: 'Harness', glyph: 'H' },
    { href: '/war-room', label: 'War Room', glyph: '!' },
  ]},
  { label: 'Memory', items: [
    { href: '/history', label: 'History', glyph: '↻' },
    { href: '/evidence', label: 'Evidence & Outputs', glyph: 'E' },
  ]},
];

function active(pathname: string, href: string) { return pathname === href || pathname.startsWith(`${href}/`); }

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const runtime = getRuntimeModeInfo();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [health, setHealth] = useState<'healthy' | 'degraded'>('healthy');
  const [latency, setLatency] = useState('—');
  const publicRoute = pathname.startsWith('/unlock');

  const current = useMemo(() => groups.flatMap((group) => group.items).find((item) => active(pathname, item.href)), [pathname]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => {
    if (publicRoute) return;
    Promise.allSettled([fetch('/api/health').then((r) => r.json()), fetch('/api/analytics').then((r) => r.json())]).then(([healthResult, analyticsResult]) => {
      if (healthResult.status === 'fulfilled' && healthResult.value?.status && healthResult.value.status !== 'healthy') setHealth('degraded');
      if (analyticsResult.status === 'fulfilled' && analyticsResult.value?.averageResponseTime) setLatency(analyticsResult.value.averageResponseTime);
    });
  }, [publicRoute]);

  if (publicRoute) return <>{children}</>;

  const Navigation = ({ mobile = false }: { mobile?: boolean }) => <div className="flex h-full flex-col bg-white">
    <div className="flex min-h-20 items-center gap-3 border-b border-slate-200 px-4">
      <Link href="/command-center" className="min-w-0 flex-1"><span className="block font-semibold tracking-[.15em] text-slate-950">CYVORA</span>{!collapsed || mobile ? <span className="mt-1 block text-[9px] uppercase tracking-[.2em] text-slate-400">Founder operating system</span> : null}</Link>
      {!mobile ? <button onClick={() => setCollapsed((value) => !value)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Toggle navigation">{collapsed ? '›' : '‹'}</button> : null}
    </div>
    <div className="flex-1 overflow-y-auto px-3 py-5">{groups.map((group) => <nav key={group.label} className="mb-6" aria-label={group.label}>{!collapsed || mobile ? <p className="mb-2 px-2 font-mono text-[9px] uppercase tracking-[.18em] text-slate-400">{group.label}</p> : null}<div className="space-y-1">{group.items.map((item) => <Link key={item.href} href={item.href} title={item.label} className={`flex min-h-11 items-center gap-3 rounded-xl px-2.5 text-sm transition ${active(pathname, item.href) ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border font-mono text-[9px] ${active(pathname, item.href) ? 'border-white/15 bg-white/10 text-white' : 'border-slate-200 bg-white text-slate-500'}`}>{item.glyph}</span>{!collapsed || mobile ? <span className="truncate">{item.label}</span> : null}</Link>)}</div></nav>)}</div>
    <div className="border-t border-slate-200 p-3"><div className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-slate-900">{!collapsed || mobile ? runtime.label : 'Mode'}</span><span className={`h-2 w-2 rounded-full ${health === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'}`} /></div>{!collapsed || mobile ? <><p className="mt-2 text-[10px] leading-5 text-slate-500">{runtime.description}</p><div className="mt-2 flex justify-between border-t border-slate-200 pt-2 font-mono text-[9px] text-slate-400"><span>{health}</span><span>{latency}</span></div></> : null}</div></div>
  </div>;

  return <div className={`min-h-screen bg-[#f7f7f5] text-slate-950 ${collapsed ? 'lg:grid-cols-[78px_minmax(0,1fr)]' : 'lg:grid-cols-[254px_minmax(0,1fr)]'} lg:grid`}>
    <aside className="sticky top-0 hidden h-screen border-r border-slate-200 lg:block"><Navigation /></aside>
    {mobileOpen ? <div className="fixed inset-0 z-[100] lg:hidden"><button className="absolute inset-0 bg-slate-950/25" onClick={() => setMobileOpen(false)} aria-label="Close navigation" /><aside className="relative h-full w-[min(19rem,88vw)] border-r border-slate-200 shadow-2xl"><Navigation mobile /></aside></div> : null}

    <div className="min-w-0">
      <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between gap-4 border-b border-slate-200 bg-[#f7f7f5]/90 px-4 backdrop-blur-xl md:px-6">
        <div className="flex min-w-0 items-center gap-3"><button onClick={() => setMobileOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 lg:hidden" aria-label="Open navigation">☰</button><div className="min-w-0"><div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.12em] text-slate-400"><span>Cyvora</span><span>/</span><span>{groups.find((group) => group.items.some((item) => item.href === current?.href))?.label || 'System'}</span></div><h1 className="mt-1 truncate text-sm font-semibold text-slate-950">{current?.label || 'Founder OS'}</h1></div></div>
        <div className="flex items-center gap-2"><button onClick={() => window.dispatchEvent(new Event('cyvora:commands'))} className="hidden min-h-10 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-500 shadow-sm sm:flex"><span>Search or command</span><kbd className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[9px]">⌘K</kbd></button><button onClick={() => window.dispatchEvent(new Event('cyvora:notifications'))} className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600">◉<span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500" /></button><button className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-xs font-semibold text-white">AP</button></div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-slate-200 px-5 py-6 text-center text-[10px] text-slate-400">CYVORA · Build with precision. Govern every decision.</footer>
    </div>
    <EntityDrawer />
    <OperatingSystemControls />
  </div>;
}

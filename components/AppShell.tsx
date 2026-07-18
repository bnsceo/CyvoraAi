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
  const currentGroup = groups.find((group) => group.items.some((item) => item.href === current?.href));

  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => {
    if (publicRoute) return;
    Promise.allSettled([fetch('/api/health').then((r) => r.json()), fetch('/api/analytics').then((r) => r.json())]).then(([healthResult, analyticsResult]) => {
      if (healthResult.status === 'fulfilled' && healthResult.value?.status && healthResult.value.status !== 'healthy') setHealth('degraded');
      if (analyticsResult.status === 'fulfilled' && analyticsResult.value?.averageResponseTime) setLatency(analyticsResult.value.averageResponseTime);
    });
  }, [publicRoute]);

  if (publicRoute) return <>{children}</>;

  const Navigation = ({ mobile = false }: { mobile?: boolean }) => <div className="flex h-full flex-col bg-[#080c14] text-slate-200">
    <div className="flex min-h-20 items-center gap-3 border-b border-white/[.07] px-4">
      <Link href="/command-center" className="min-w-0 flex-1">
        <span className="block text-sm font-semibold tracking-[.22em] text-white">CYVORA</span>
        {!collapsed || mobile ? <span className="mt-1.5 block font-mono text-[8px] uppercase tracking-[.23em] text-cyan-200/55">Founder control plane</span> : null}
      </Link>
      {!mobile ? <button onClick={() => setCollapsed((value) => !value)} className="grid h-9 w-9 place-items-center rounded-xl border border-white/[.08] bg-white/[.025] text-slate-400 transition hover:border-cyan-300/20 hover:text-white" aria-label="Toggle navigation">{collapsed ? '›' : '‹'}</button> : null}
    </div>
    <div className="flex-1 overflow-y-auto px-3 py-5">{groups.map((group) => <nav key={group.label} className="mb-6" aria-label={group.label}>
      {!collapsed || mobile ? <p className="mb-2 px-2 font-mono text-[8px] uppercase tracking-[.22em] text-slate-600">{group.label}</p> : null}
      <div className="space-y-1">{group.items.map((item) => {
        const isActive = active(pathname, item.href);
        return <Link key={item.href} href={item.href} title={item.label} className={`group flex min-h-11 items-center gap-3 rounded-xl border px-2.5 text-sm transition ${isActive ? 'border-cyan-300/15 bg-gradient-to-r from-cyan-300/[.09] to-violet-400/[.05] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_12px_30px_rgba(0,0,0,.18)]' : 'border-transparent text-slate-500 hover:border-white/[.06] hover:bg-white/[.025] hover:text-slate-200'}`}>
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border font-mono text-[8px] ${isActive ? 'border-cyan-200/20 bg-cyan-200/[.08] text-cyan-100' : 'border-white/[.08] bg-white/[.02] text-slate-600 group-hover:text-slate-300'}`}>{item.glyph}</span>
          {!collapsed || mobile ? <span className="truncate">{item.label}</span> : null}
        </Link>;
      })}</div>
    </nav>)}</div>
    <div className="border-t border-white/[.07] p-3">
      <div className="rounded-2xl border border-white/[.08] bg-white/[.025] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.03)]">
        <div className="flex items-center justify-between gap-3"><span className="font-mono text-[9px] font-semibold uppercase tracking-[.12em] text-slate-300">{!collapsed || mobile ? runtime.label : 'Mode'}</span><span className={`h-2 w-2 rounded-full shadow-[0_0_14px_currentColor] ${health === 'healthy' ? 'bg-emerald-400 text-emerald-400' : 'bg-amber-400 text-amber-400'}`} /></div>
        {!collapsed || mobile ? <><p className="mt-2 text-[10px] leading-5 text-slate-500">Local tooling · mock-safe fallbacks · paid AI off</p><div className="mt-2 flex justify-between border-t border-white/[.07] pt-2 font-mono text-[8px] uppercase tracking-[.12em] text-slate-600"><span>{health}</span><span>{latency}</span></div></> : null}
      </div>
    </div>
  </div>;

  return <div className={`min-h-screen bg-[#070a10] text-slate-100 ${collapsed ? 'lg:grid-cols-[78px_minmax(0,1fr)]' : 'lg:grid-cols-[254px_minmax(0,1fr)]'} lg:grid`}>
    <aside className="sticky top-0 hidden h-screen border-r border-white/[.07] lg:block"><Navigation /></aside>
    {mobileOpen ? <div className="fixed inset-0 z-[100] lg:hidden"><button className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-label="Close navigation" /><aside className="relative h-full w-[min(19rem,88vw)] border-r border-white/[.08] shadow-2xl"><Navigation mobile /></aside></div> : null}

    <div className="min-w-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(102,222,255,.07),transparent_28%),linear-gradient(180deg,#080c14_0%,#070a10_100%)]">
      <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between gap-4 border-b border-white/[.07] bg-[#080c14]/85 px-4 backdrop-blur-2xl md:px-6">
        <div className="flex min-w-0 items-center gap-3"><button onClick={() => setMobileOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/[.09] bg-white/[.03] text-slate-300 lg:hidden" aria-label="Open navigation">☰</button><div className="min-w-0"><div className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[.16em] text-slate-600"><span>Cyvora</span><span>/</span><span>{currentGroup?.label || 'System'}</span></div><h1 className="mt-1 truncate text-sm font-semibold text-slate-100">{current?.label || 'Founder OS'}</h1></div></div>
        <div className="flex items-center gap-2"><span className="hidden rounded-full border border-emerald-300/15 bg-emerald-300/[.06] px-3 py-1.5 font-mono text-[8px] uppercase tracking-[.14em] text-emerald-200 md:inline-flex">Local · Mock-safe</span><button onClick={() => window.dispatchEvent(new Event('cyvora:commands'))} className="hidden min-h-10 items-center gap-3 rounded-xl border border-white/[.08] bg-white/[.025] px-3 text-xs text-slate-500 transition hover:border-cyan-200/20 hover:text-slate-200 sm:flex"><span>Search or command</span><kbd className="rounded-md border border-white/[.08] bg-black/20 px-1.5 py-0.5 font-mono text-[8px]">⌘K</kbd></button><button onClick={() => window.dispatchEvent(new Event('cyvora:notifications'))} className="relative grid h-10 w-10 place-items-center rounded-xl border border-white/[.08] bg-white/[.025] text-slate-400">◉<span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,.8)]" /></button><button className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-200/15 bg-gradient-to-br from-cyan-300/15 to-violet-400/10 text-xs font-semibold text-white">AP</button></div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-white/[.06] px-5 py-6 text-center font-mono text-[8px] uppercase tracking-[.18em] text-slate-700">CYVORA · Build with precision. Govern every decision.</footer>
    </div>
    <EntityDrawer />
    <OperatingSystemControls />
  </div>;
}

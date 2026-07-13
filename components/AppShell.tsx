'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import MobileDock from '@/components/MobileDock';
import { getRuntimeModeInfo } from '@/lib/runtimeMode';

type IconName = 'command' | 'companies' | 'headquarters' | 'approvals' | 'harness' | 'warroom' | 'history' | 'menu' | 'bell' | 'search' | 'close';

function Icon({ name, className = 'h-4 w-4' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    command: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9 20v-6h6v6"/></>,
    companies: <><rect x="3" y="5" width="8" height="14" rx="1.5"/><rect x="13" y="3" width="8" height="16" rx="1.5"/><path d="M6 9h2M6 13h2M16 7h2M16 11h2M16 15h2"/></>,
    headquarters: <><circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="18" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M12 7.5v4M5 15.5v-2h14v2"/></>,
    approvals: <><path d="M7 3h10v4H7z"/><path d="M5 5H4a1 1 0 0 0-1 1v14h18V6a1 1 0 0 0-1-1h-1"/><path d="m8 14 2.5 2.5L16 11"/></>,
    harness: <><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/><circle cx="12" cy="12" r="4"/></>,
    warroom: <><path d="M12 3 2.8 19h18.4L12 3Z"/><path d="M12 9v4M12 16.5v.1"/></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>{paths[name]}</svg>;
}

const primaryLinks = [
  { href: '/', label: 'Command Center', icon: 'command' as IconName },
  { href: '/companies', label: 'Companies', icon: 'companies' as IconName },
  { href: '/headquarters', label: 'Headquarters', icon: 'headquarters' as IconName },
  { href: '/?view=approvals', label: 'Approvals', icon: 'approvals' as IconName, badge: '3' },
];

const operationsLinks = [
  { href: '/harness-engineering', label: 'Harness', icon: 'harness' as IconName },
  { href: '/security', label: 'War Room', icon: 'warroom' as IconName },
  { href: '/history', label: 'History', icon: 'history' as IconName },
];

function isActive(pathname: string, href: string) {
  const path = href.split('?')[0];
  return path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`);
}

function pageTitle(pathname: string) {
  if (pathname.startsWith('/companies')) return 'Companies';
  if (pathname.startsWith('/headquarters')) return 'Headquarters';
  if (pathname.startsWith('/harness-engineering')) return 'Harness';
  if (pathname.startsWith('/security')) return 'War Room';
  if (pathname.startsWith('/history')) return 'History';
  if (pathname.startsWith('/self-coding')) return 'Software Lab';
  return 'Command Center';
}

function SidebarContent({
  pathname,
  runtime,
  health,
  avgLatency,
}: {
  pathname: string;
  runtime: ReturnType<typeof getRuntimeModeInfo>;
  health: 'online' | 'degraded';
  avgLatency: string;
}) {
  return (
    <>
      <Link href="/" className="cyvora-shell-brand" aria-label="Cyvora Command Center">
        <span className="cyvora-shell-mark">
          <Image src="/cyvora-mark.svg" alt="" width={34} height={34} className="h-8 w-8" />
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block text-[15px] font-semibold tracking-[0.02em] text-white">Cyvora</span>
          <span className="mt-1 block truncate text-[9px] uppercase tracking-[0.22em] text-cyan-200/75">AI Command Center</span>
        </span>
      </Link>

      <nav className="mt-6" aria-label="Primary navigation">
        <p className="cyvora-shell-nav-label">Command</p>
        <div className="space-y-1.5">
          {primaryLinks.map((link) => (
            <Link key={link.href} href={link.href} className={`cyvora-shell-nav-item ${isActive(pathname, link.href) ? 'is-active' : ''}`}>
              <span className="cyvora-shell-nav-icon"><Icon name={link.icon} /></span>
              <span className="truncate">{link.label}</span>
              {link.badge ? <span className="cyvora-shell-badge">{link.badge}</span> : null}
            </Link>
          ))}
        </div>
      </nav>

      <nav className="mt-7" aria-label="Operations navigation">
        <p className="cyvora-shell-nav-label">Operations</p>
        <div className="space-y-1.5">
          {operationsLinks.map((link) => (
            <Link key={link.href} href={link.href} className={`cyvora-shell-nav-item ${isActive(pathname, link.href) ? 'is-active' : ''}`}>
              <span className="cyvora-shell-nav-icon"><Icon name={link.icon} /></span>
              <span className="truncate">{link.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <div className="mt-auto pt-6">
        <div className="cyvora-shell-runtime">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-white">{runtime.label}</span>
            <span className={`h-2 w-2 rounded-full ${health === 'online' ? 'bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.85)]' : 'bg-amber-300 shadow-[0_0_14px_rgba(244,212,135,0.75)]'}`} />
          </div>
          <p className="mt-2 text-[10px] leading-5 text-slate-400">{runtime.description}</p>
          <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[10px] text-slate-500">
            <span>{health === 'online' ? 'System nominal' : 'Check health'}</span>
            <span>{avgLatency}</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const runtime = getRuntimeModeInfo();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [avgLatency, setAvgLatency] = useState('—');
  const [health, setHealth] = useState<'online' | 'degraded'>('online');

  const title = useMemo(() => pageTitle(pathname), [pathname]);
  const publicRoute = pathname.startsWith('/unlock');

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (publicRoute) return;
    let alive = true;
    Promise.allSettled([
      fetch('/api/analytics').then((response) => response.json()),
      fetch('/api/health').then((response) => response.json()),
    ]).then(([analyticsResult, healthResult]) => {
      if (!alive) return;
      if (analyticsResult.status === 'fulfilled' && analyticsResult.value?.averageResponseTime) {
        setAvgLatency(analyticsResult.value.averageResponseTime);
      } else {
        setAvgLatency('n/a');
      }
      if (healthResult.status === 'fulfilled' && healthResult.value?.status && healthResult.value.status !== 'healthy') {
        setHealth('degraded');
      }
    });
    return () => { alive = false; };
  }, [publicRoute]);

  if (publicRoute) return <>{children}</>;

  return (
    <div className="cyvora-app-shell">
      <aside className="cyvora-app-sidebar hidden lg:flex"><SidebarContent pathname={pathname} runtime={runtime} health={health} avgLatency={avgLatency} /></aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} aria-label="Close navigation" />
          <aside className="cyvora-app-sidebar relative flex h-full w-[min(19rem,88vw)] animate-[slideIn_.2s_ease-out]">
            <button onClick={() => setDrawerOpen(false)} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.035] text-slate-300" aria-label="Close navigation"><Icon name="close" /></button>
            <SidebarContent pathname={pathname} runtime={runtime} health={health} avgLatency={avgLatency} />
          </aside>
        </div>
      ) : null}

      <div className="min-w-0 lg:pl-[260px]">
        <header className="cyvora-app-topbar">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setDrawerOpen(true)} className="cyvora-shell-icon-button lg:hidden" aria-label="Open navigation"><Icon name="menu" /></button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{title}</p>
              <p className="mt-0.5 truncate text-[10px] text-slate-500">Founder workspace · Cyvora</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[10px] text-cyan-100 sm:flex">
              <span className={`h-1.5 w-1.5 rounded-full ${health === 'online' ? 'bg-emerald-300' : 'bg-amber-300'}`} />
              {runtime.label}
            </div>
            <button className="cyvora-shell-icon-button hidden sm:grid" aria-label="Search"><Icon name="search" /></button>
            <button className="cyvora-shell-icon-button relative" aria-label="Notifications"><Icon name="bell" /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.85)]" /></button>
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] text-xs font-bold text-cyan-100 shadow-[inset_1px_1px_0_rgba(255,255,255,.04),8px_8px_18px_rgba(0,0,0,.3)]">AP</div>
          </div>
        </header>

        <div className="cyvora-app-content">{children}</div>

        <footer className="border-t border-white/[0.06] px-5 py-5 text-center text-[10px] text-slate-600">
          <div className="mx-auto flex items-center justify-center gap-2">
            <Image src="/cyvora-header-logo.png" alt="Cyvora" width={88} height={20} className="h-5 w-auto" />
            <span>Created by Anderson · Founder · Cyvora</span>
          </div>
        </footer>
      </div>

      <MobileDock />
    </div>
  );
}

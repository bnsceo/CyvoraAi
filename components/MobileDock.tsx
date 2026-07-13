'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const catalog: Record<string, { href: string; label: string; glyph: string }> = {
  command: { href: '/', label: 'Command', glyph: '⌂' },
  executive: { href: '/executive-ai', label: 'Executive', glyph: '✦' },
  companies: { href: '/companies', label: 'Companies', glyph: '◫' },
  headquarters: { href: '/headquarters', label: 'HQ', glyph: '⌘' },
  approvals: { href: '/?view=approvals', label: 'Approvals', glyph: '✓' },
  harness: { href: '/harness-engineering', label: 'Harness', glyph: '⚙' },
  warroom: { href: '/security', label: 'War Room', glyph: '⚠' },
  history: { href: '/history', label: 'History', glyph: '↻' },
};

const defaults = ['command', 'companies', 'executive', 'approvals', 'warroom'];

export default function MobileDock() {
  const pathname = usePathname();
  const [ids, setIds] = useState(defaults);

  useEffect(() => {
    const read = () => {
      try {
        const value = JSON.parse(window.localStorage.getItem('cyvora.dock') || JSON.stringify(defaults));
        if (Array.isArray(value) && value.length >= 3) setIds(value.filter((id) => catalog[id]).slice(0, 5));
      } catch { setIds(defaults); }
    };
    read();
    window.addEventListener('cyvora:dock-updated', read);
    return () => window.removeEventListener('cyvora:dock-updated', read);
  }, []);

  if (pathname.startsWith('/unlock')) return null;

  return (
    <nav className="cyvora-mobile-dock lg:hidden" aria-label="Mobile navigation" style={{ gridTemplateColumns: `repeat(${ids.length}, minmax(0, 1fr))` }}>
      {ids.map((id) => {
        const item = catalog[id];
        const path = item.href.split('?')[0];
        const active = path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`);
        const primary = id === 'executive';
        return (
          <Link key={id} href={item.href} className={`cyvora-mobile-dock-item ${active ? 'is-active' : ''} ${primary ? 'is-primary' : ''}`}>
            <span className="text-base leading-none">{item.glyph}</span>
            <span className="mt-1 block truncate text-[9px]">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

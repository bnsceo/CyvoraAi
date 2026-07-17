'use client';

import { useEffect, useState } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

const TABLET_QUERY = '(min-width: 768px) and (max-width: 1023.98px)';
const DESKTOP_QUERY = '(min-width: 1024px)';

function resolveBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'desktop';
  if (window.matchMedia(DESKTOP_QUERY).matches) return 'desktop';
  if (window.matchMedia(TABLET_QUERY).matches) return 'tablet';
  return 'mobile';
}

/**
 * Tracks the current responsive tier so a single component can switch its
 * *container* (bottom sheet / centered overlay / slide-over) while reusing
 * one copy of the content markup. Defaults to 'desktop' during SSR/first
 * paint to avoid a layout flash on larger screens; corrects on mount.
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');

  useEffect(() => {
    const update = () => setBreakpoint(resolveBreakpoint());
    update();

    const desktopMql = window.matchMedia(DESKTOP_QUERY);
    const tabletMql = window.matchMedia(TABLET_QUERY);
    desktopMql.addEventListener('change', update);
    tabletMql.addEventListener('change', update);
    return () => {
      desktopMql.removeEventListener('change', update);
      tabletMql.removeEventListener('change', update);
    };
  }, []);

  return breakpoint;
}

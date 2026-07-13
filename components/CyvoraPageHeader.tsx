import type { ReactNode } from 'react';

type CyvoraPageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export default function CyvoraPageHeader({ eyebrow, title, description, children }: CyvoraPageHeaderProps) {
  return (
    <section className="cyvora-glass-strong rounded-2xl p-5 md:p-7">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center">
        <div className="min-w-0">
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">{eyebrow}</p>
            <h1 className="mt-2 text-[20px] font-semibold leading-tight text-white">{title}</h1>
            <p className="mt-1 font-mono text-xs uppercase tracking-[0.26em] text-slate-500">AI Command Center</p>
            <p className="mt-4 text-sm leading-6 text-slate-300">{description}</p>
          </div>
        </div>
        {children ? <div className="flex flex-wrap items-center justify-start gap-3 lg:justify-end">{children}</div> : null}
      </div>
    </section>
  );
}

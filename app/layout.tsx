import type { Metadata } from "next";
import "./globals.css";
import MobileDock from "@/components/MobileDock";
import PwaBootstrap from "@/components/PwaBootstrap";

export const metadata: Metadata = {
  title: "Cyvora · AI Command Center",
  description: "Autonomous business operating system for the Anderson founder stack",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <meta name="theme-color" content="#070b12" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
      </head>
      <body className="min-h-full flex flex-col overflow-x-hidden pb-24 md:pb-0">
        {process.env.NODE_ENV === 'production' ? <PwaBootstrap /> : null}
        {children}
        <div className="fixed inset-x-0 top-0 z-[60] border-b border-cyan-300/15 bg-slate-950/95 px-4 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <img src="/cyvora-header-logo.png" alt="Cyvora" className="h-9 w-auto shrink-0" />
            <div className="leading-tight">
              <p className="text-sm font-semibold text-white">Cyvora</p>
              <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-200/80">AI Command Center</p>
            </div>
          </div>
        </div>
        <footer className="border-t border-white/10 bg-slate-950/80 px-4 py-4 text-center text-xs text-slate-500">
          <div className="mx-auto flex flex-wrap items-center justify-center gap-3">
            <div className="flex items-center gap-2">
              <img src="/cyvora-header-logo.png" alt="Cyvora" className="h-5 w-auto" />
              <span>Created by Anderson · Founder · Cyvora</span>
            </div>
            <form action="/api/logout" method="post">
              <button
                type="submit"
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-300 transition hover:bg-white/[0.08]"
              >
                Sign out
              </button>
            </form>
          </div>
        </footer>
        <MobileDock />
      </body>
    </html>
  );
}

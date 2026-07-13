import Image from "next/image";
import Link from "next/link";

const navItems = [
  { href: "#product", label: "Product" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#companies", label: "Companies" },
  { href: "#safety", label: "Safety" },
  { href: "#roadmap", label: "Roadmap" },
  { href: "/security", label: "Sign In" },
];

const trustIndicators = ["Founder-controlled", "Approval-gated", "Worker-powered", "Cost-aware"];

const problems = [
  "Too many disconnected AI tools with no shared operating structure.",
  "No durable approval process for risky business actions.",
  "No unified visibility into agents, tasks, outputs, and costs.",
  "No clear ownership across companies, departments, and teams.",
  "No persistent worker runtime for long-running work.",
  "No single command center for founder oversight.",
];

const companies = [
  {
    name: "Content Studio",
    description: "Runs research, scripting, publishing, and distribution workflows.",
    departments: 4,
    agents: 11,
    task: "Prepare the next launch brief",
    status: "Healthy",
  },
  {
    name: "Software Lab",
    description: "Organizes product, engineering, QA, and release work.",
    departments: 5,
    agents: 14,
    task: "Validate the next UI release",
    status: "Healthy",
  },
  {
    name: "Marketplace Division",
    description: "Coordinates sourcing, pricing, listing, and fulfillment operations.",
    departments: 3,
    agents: 9,
    task: "Check vendor pipeline health",
    status: "Monitoring",
  },
  {
    name: "Research Group",
    description: "Turns market signals into structured opportunities and plans.",
    departments: 3,
    agents: 8,
    task: "Synthesize top trend findings",
    status: "Healthy",
  },
  {
    name: "Music Label",
    description: "Manages creative direction, release planning, and promotion.",
    departments: 4,
    agents: 10,
    task: "Review release calendar",
    status: "Healthy",
  },
  {
    name: "Consulting Group",
    description: "Handles client discovery, proposals, delivery, and follow-up.",
    departments: 3,
    agents: 7,
    task: "Draft client intake plan",
    status: "Reviewing",
  },
];

const features = [
  {
    title: "Executive AI",
    body: "Transforms founder intent into an operating plan with company structure and task breakdowns.",
  },
  {
    title: "Company Architecture",
    body: "Organizes departments, teams, agents, tasks, connectors, approvals, and outputs.",
  },
  {
    title: "Approval System",
    body: "Keeps high-risk actions under explicit founder control with visible runtime plans.",
  },
  {
    title: "Worker Runtime",
    body: "Moves long-running work out of the browser and into a persistent execution layer.",
  },
  {
    title: "Harness Engineering",
    body: "Applies runtime plans, permissions, validation, and cost ceilings before execution.",
  },
  {
    title: "War Room",
    body: "Surfaces incidents, blocked work, connector failures, and operational risk.",
  },
];

const roadmap = {
  now: [
    "Command Center",
    "Organization hierarchy",
    "Mission composer",
    "Approvals",
    "Execution history",
    "Local and demo modes",
    "Cost ceilings",
  ],
  progress: [
    "Real user accounts and RBAC",
    "PostgreSQL",
    "Sandboxed execution",
    "Production connectors",
    "Actual usage metering",
    "Better rollback",
    "Multi-worker architecture",
  ],
  next: [
    "Business templates",
    "Connector marketplace",
    "KPI optimization",
    "Cross-company coordination",
    "Advanced Executive AI recommendations",
  ],
};

function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="max-w-3xl">
      <p className="text-[12px] uppercase tracking-[0.28em] text-cyan-200/80">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-slate-300">{description}</p>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen pb-8">
      <div className="sticky top-0 z-40 hidden border-b border-white/10 bg-slate-950/70 backdrop-blur md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
          <div className="flex items-center gap-3">
            <Image
              src="/cyvora-header-logo.png"
              alt="Cyvora"
              width={248}
              height={64}
              className="h-10 w-auto drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
              priority
            />
            <div className="leading-tight">
              <p className="text-sm font-semibold text-white">Cyvora</p>
              <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/80">AI Command Center</p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-200 transition hover:bg-white/[0.07]"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/headquarters"
              className="rounded-full border border-cyan-200/20 bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
            >
              Explore Cyvora
            </Link>
          </nav>
        </div>
      </div>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 pt-8 md:grid-cols-[1.05fr_0.95fr] md:px-6 md:pt-12 lg:pt-16">
        <div className="flex flex-col justify-center">
          <div className="inline-flex w-fit rounded-full border border-cyan-200/20 bg-cyan-200/10 px-4 py-2 text-[12px] uppercase tracking-[0.28em] text-cyan-100">
            AI command center for founders
          </div>

          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Build and Run AI-Powered Companies From One Command Center
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Turn a business objective into companies, departments, AI agents, workflows, approvals, and measurable outputs — all from one founder-controlled operating system.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/headquarters"
              className="rounded-xl border border-cyan-200/20 bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
            >
              Explore Cyvora
            </Link>
            <Link
              href="/security"
              className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.06]"
            >
              View the Command Center
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {trustIndicators.map((item) => (
              <span key={item} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-200">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="cyvora-glass overflow-hidden rounded-[2rem] border border-white/10 p-4 md:p-5">
          <div className="rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(141,223,255,0.14),_transparent_55%),linear-gradient(180deg,_rgba(10,17,28,0.9),_rgba(5,10,18,0.98))] p-4 md:p-5">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <p className="text-[12px] uppercase tracking-[0.28em] text-cyan-200/80">Command Center preview</p>
                <p className="mt-1 text-lg font-semibold text-white">Founder briefing</p>
              </div>
              <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[12px] text-emerald-100">
                Local / Demo / Production
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/70">Executive AI</p>
                <p className="mt-2 text-sm text-slate-200">Expands founder intent into a company plan with approvals and budgets.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/70">Approval queue</p>
                <p className="mt-2 text-sm text-slate-200">No risky action runs without a visible runtime plan and sign-off.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/70">Worker status</p>
                <p className="mt-2 text-sm text-slate-200">Long-running tasks stay out of the browser and keep state centrally.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/70">History</p>
                <p className="mt-2 text-sm text-slate-200">Approvals, outputs, and rollback posture remain visible and auditable.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="problem" className="mx-auto max-w-7xl px-4 pt-16 md:px-6">
        <SectionTitle
          eyebrow="Why Cyvora exists"
          title="AI tools are powerful. operating them is the hard part."
          description="Founders need one operating plane for structure, safety, approvals, runtime control, and visibility. Not a pile of disconnected prompts and bots."
        />

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {problems.map((problem) => (
            <div key={problem} className="cyvora-chip rounded-[1.5rem] p-5 text-sm leading-7 text-slate-200">
              {problem}
            </div>
          ))}
        </div>
      </section>

      <section id="product" className="mx-auto max-w-7xl px-4 pt-16 md:px-6">
        <SectionTitle
          eyebrow="Cyvora solution"
          title="One founder. one command center. multiple AI-operated companies."
          description="The hierarchy is explicit: Founder → Executive AI → Companies → Departments → Teams → Agents → Tasks → Outputs."
        />

        <div className="mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/35 p-4 md:p-6">
          <div className="grid gap-3 text-center md:grid-cols-4 lg:grid-cols-8">
            {["Founder", "Executive AI", "Companies", "Departments", "Teams", "Agents", "Tasks", "Outputs"].map((label, index) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-5">
                <p className="text-sm font-semibold text-white">{label}</p>
                {index < 7 ? <p className="mt-4 text-cyan-200/70">↓</p> : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-4 pt-16 md:px-6">
        <SectionTitle
          eyebrow="How it works"
          title="Describe the objective. review the plan. approve the work. monitor the results."
          description="Cyvora turns founder intent into a structured execution flow that is visible before anything runs."
        />

        <div className="mt-8 grid gap-4 lg:grid-cols-4">
          {[
            ["1", "State the objective", "Describe the business outcome you want."],
            ["2", "Review the architecture", "Cyvora designs the company, departments, agents, tasks, connectors, and budget plan."],
            ["3", "Approve execution", "Review risk, cost, permissions, and the exact runtime plan before work begins."],
            ["4", "Monitor results", "Track live work, approvals, outputs, incidents, and performance from the Command Center."],
          ].map(([step, title, body]) => (
            <div key={step} className="cyvora-glass rounded-[1.75rem] border border-white/10 p-5">
              <p className="text-[12px] uppercase tracking-[0.28em] text-cyan-200/70">Step {step}</p>
              <h3 className="mt-3 text-xl font-semibold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-4 pt-16 md:px-6">
        <SectionTitle
          eyebrow="Core product"
          title="Built as a real operating system, not a chat interface."
          description="Cyvora organizes the company hierarchy, control surfaces, runtime, and auditability into one system."
        />

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="cyvora-glass rounded-[1.75rem] border border-white/10 p-5">
              <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="companies" className="mx-auto max-w-7xl px-4 pt-16 md:px-6">
        <SectionTitle
          eyebrow="AI companies"
          title="Build specialized AI companies."
          description="The platform can model separate company lines without losing founder control or operational visibility."
        />

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {companies.map((company) => (
            <article key={company.name} className="cyvora-chip rounded-[1.75rem] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-white">{company.name}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-300">{company.description}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-slate-200">
                  {company.status}
                </span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/70">Departments</p>
                  <p className="mt-2 text-white">{company.departments}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/70">Agents</p>
                  <p className="mt-2 text-white">{company.agents}</p>
                </div>
                <div className="col-span-2 rounded-2xl border border-white/10 bg-slate-950/35 p-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/70">Active task</p>
                  <p className="mt-2 text-white">{company.task}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="safety" className="mx-auto max-w-7xl px-4 pt-16 md:px-6">
        <SectionTitle
          eyebrow="Safety and control"
          title="Autonomy without losing control."
          description="Human approval gates, runtime-plan snapshots, cost ceilings, and audit trails keep the system explainable."
        />

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="cyvora-glass rounded-[1.75rem] border border-white/10 p-6">
            <h3 className="text-2xl font-semibold text-white">What is public</h3>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
              <li>• Product story and company hierarchy</li>
              <li>• Mocked previews and public showcase content</li>
              <li>• Safety model and operating principles</li>
              <li>• Roadmap and founder-facing calls to action</li>
            </ul>
          </div>
          <div className="cyvora-glass rounded-[1.75rem] border border-white/10 p-6">
            <h3 className="text-2xl font-semibold text-white">What stays private</h3>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
              <li>• Access codes and unlock flows</li>
              <li>• Worker runtimes and execution endpoints</li>
              <li>• Secret keys, credentials, and internal routes</li>
              <li>• Tenant data and approval internals</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="roadmap" className="mx-auto max-w-7xl px-4 pt-16 md:px-6">
        <SectionTitle
          eyebrow="Roadmap"
          title="Be honest about what exists now and what is still in progress."
          description="This section keeps the public page credible by separating shipped capabilities from the production target."
        />

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="cyvora-chip rounded-[1.75rem] p-5">
            <h3 className="text-xl font-semibold text-white">Available now</h3>
            <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-300">
              {roadmap.now.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
          <div className="cyvora-chip rounded-[1.75rem] p-5">
            <h3 className="text-xl font-semibold text-white">In progress</h3>
            <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-300">
              {roadmap.progress.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
          <div className="cyvora-chip rounded-[1.75rem] p-5">
            <h3 className="text-xl font-semibold text-white">Planned</h3>
            <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-300">
              {roadmap.next.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-16 md:px-6">
        <div className="cyvora-glass overflow-hidden rounded-[2rem] border border-white/10 p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-[12px] uppercase tracking-[0.28em] text-cyan-200/80">Founder</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Built by Anderson Paulino</h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
                Cyvora was created to turn ambitious business ideas into structured, measurable, AI-operated companies without giving up founder control.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/headquarters"
                className="rounded-xl border border-cyan-200/20 bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
              >
                Explore Cyvora
              </Link>
              <Link
                href="/security"
                className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.06]"
              >
                Join Early Access
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

'use client';

import { useEffect, useState } from 'react';
import CyvoraPageHeader from '@/components/CyvoraPageHeader';

interface Vulnerability {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  status: 'open' | 'in-progress' | 'resolved';
  date: string;
}

interface Compliance {
  standard: string;
  status: 'compliant' | 'non-compliant' | 'partial';
  details: string;
  lastAudit: string;
}

interface SecurityIncident {
  id: string;
  title: string;
  timestamp: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'investigating' | 'resolved';
  remediation: string;
}

export default function SecurityDashboard() {
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [compliance, setCompliance] = useState<Compliance[]>([]);
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDetail, setSelectedDetail] = useState<{
    title: string;
    kind: string;
    status: string;
    details: string;
    secondary?: string;
    tags: string[];
  } | null>(null);

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    try {
      const res = await fetch('/api/security-dashboard');
      const data = await res.json();
      setVulnerabilities(data.vulnerabilities || []);
      setCompliance(data.compliance || []);
      setIncidents(data.incidents || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-white">
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        <CyvoraPageHeader
          eyebrow="War Room"
          title="Reliability and security"
          description="The autonomous quality-control room for incidents, vulnerabilities, compliance, and proposed repairs before founder approval."
        >
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Incidents" value={incidents.length} />
            <Stat label="Open vulns" value={vulnerabilities.length} />
            <Stat label="Audits" value={compliance.length} />
          </div>
        </CyvoraPageHeader>

        {loading ? (
          <p className="cyvora-glass mt-6 rounded-2xl p-6 text-sm text-slate-400">
            Loading War Room...
          </p>
        ) : (
          <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
            <Panel title="Compliance status" subtitle="Control surfaces and audit posture">
              {compliance.length === 0 ? (
                <Empty>No compliance data available.</Empty>
              ) : (
                <div className="grid gap-3">
                  {compliance.map((item) => (
                    <button
                      key={item.standard}
                      type="button"
                      onClick={() =>
                        setSelectedDetail({
                          title: item.standard,
                          kind: 'Compliance',
                          status: item.status,
                          details: item.details,
                          secondary: `Last audit: ${item.lastAudit}`,
                          tags: [item.status, 'audit'],
                        })
                      }
                      className="cyvora-tactile w-full rounded-xl p-4 text-left transition hover:translate-y-[-1px]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium">{item.standard}</p>
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="mt-2 text-sm text-slate-400">{item.details}</p>
                      <p className="mt-2 text-xs text-slate-500">Last audit: {item.lastAudit}</p>
                    </button>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Recent incidents" subtitle="Failures, anomalies, and repair candidates">
              {incidents.length === 0 ? (
                <Empty>No incidents recorded.</Empty>
              ) : (
                <div className="space-y-3">
                  {incidents.map((incident) => (
                    <button
                      key={incident.id}
                      type="button"
                      onClick={() =>
                        setSelectedDetail({
                          title: incident.title,
                          kind: 'Incident',
                          status: incident.status,
                          details: incident.remediation || 'Pending remediation',
                          secondary: incident.timestamp,
                          tags: [incident.status, incident.severity],
                        })
                      }
                      className="cyvora-tactile w-full rounded-xl p-4 text-left transition hover:translate-y-[-1px]"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Severity severity={incident.severity} />
                        <span className="text-xs text-slate-400">{incident.status}</span>
                      </div>
                      <p className="mt-2 text-sm font-medium">{incident.title}</p>
                      <p className="mt-1 text-sm text-slate-400">Remediation: {incident.remediation || 'Pending'}</p>
                      <p className="mt-2 text-xs text-slate-500">{incident.timestamp}</p>
                    </button>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Open vulnerabilities" subtitle="Security work waiting for remediation">
              {vulnerabilities.length === 0 ? (
                <Empty>No vulnerabilities reported.</Empty>
              ) : (
                <div className="space-y-3">
                  {vulnerabilities.map((vulnerability) => (
                    <button
                      key={vulnerability.id}
                      type="button"
                      onClick={() =>
                        setSelectedDetail({
                          title: vulnerability.title,
                          kind: 'Vulnerability',
                          status: vulnerability.status,
                          details: vulnerability.description,
                          secondary: `Reported: ${vulnerability.date}`,
                          tags: [vulnerability.status, vulnerability.severity],
                        })
                      }
                      className="cyvora-tactile w-full rounded-xl p-4 text-left transition hover:translate-y-[-1px]"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Severity severity={vulnerability.severity} />
                        <span className="text-xs text-slate-400">{vulnerability.status}</span>
                      </div>
                      <p className="mt-2 text-sm font-medium">{vulnerability.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{vulnerability.description}</p>
                      <p className="mt-2 text-xs text-slate-500">Reported: {vulnerability.date}</p>
                    </button>
                  ))}
                </div>
              )}
            </Panel>
          </section>
        )}
      </main>

      {selectedDetail ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm md:items-center md:p-4">
          <div className="max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/10 bg-slate-950 p-5 shadow-2xl shadow-black/40 md:rounded-2xl md:p-6"
            style={{
              boxShadow:
                'inset 1px 1px 0 rgba(255,255,255,0.05), inset -1px -1px 0 rgba(0,0,0,0.3), 0 22px 40px rgba(0,0,0,0.45)',
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-300">{selectedDetail.kind}</p>
                <h2 className="mt-1 text-[20px] font-semibold">{selectedDetail.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="cyvora-chip rounded-xl px-3 py-2 text-sm text-slate-200"
              >
                Close
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Stat label="Status" value={selectedDetail.status} />
              <Stat label="Type" value={selectedDetail.kind} />
              <Stat label="Tags" value={selectedDetail.tags.join(' · ')} />
            </div>
            <div
              className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              style={{
                boxShadow:
                  'inset 1px 1px 0 rgba(255,255,255,0.05), inset -1px -1px 0 rgba(0,0,0,0.32)',
              }}
            >
              <p className="text-sm leading-6 text-slate-300">{selectedDetail.details}</p>
              {selectedDetail.secondary ? <p className="mt-3 text-xs text-slate-500">{selectedDetail.secondary}</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div
      className="cyvora-glass rounded-2xl p-5 md:p-6"
      style={{
        boxShadow:
          'inset 1px 1px 0 rgba(255,255,255,0.05), inset -1px -1px 0 rgba(0,0,0,0.26), 0 18px 34px rgba(0,0,0,0.18)',
      }}
    >
      <h2 className="text-[20px] font-semibold">{title}</h2>
      <p className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-slate-400">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="cyvora-tactile rounded-xl p-4"
      style={{
        boxShadow:
          'inset 1px 1px 0 rgba(255,255,255,0.06), inset -1px -1px 0 rgba(0,0,0,0.28), 0 8px 16px rgba(0,0,0,0.2)',
      }}
    >
      <p className="text-[20px] font-semibold">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{label}</p>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="cyvora-tactile rounded-xl p-5 text-sm text-slate-400">{children}</p>;
}

function StatusBadge({ status }: { status: string }) {
  const style =
    status === 'compliant'
      ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200'
      : status === 'non-compliant'
        ? 'border-rose-300/20 bg-rose-300/10 text-rose-200'
        : 'border-amber-300/20 bg-amber-300/10 text-amber-200';
  return <span className={`rounded-full border px-3 py-1 text-xs ${style}`}>{status}</span>;
}

function Severity({ severity }: { severity: string }) {
  const style =
    severity === 'critical'
      ? 'border-rose-300/20 bg-rose-300/10 text-rose-200'
      : severity === 'high'
        ? 'border-orange-300/20 bg-orange-300/10 text-orange-200'
        : severity === 'medium'
          ? 'border-amber-300/20 bg-amber-300/10 text-amber-200'
          : 'border-cyan-300/20 bg-cyan-300/10 text-cyan-200';
  return <span className={`rounded-full border px-3 py-1 text-xs ${style}`}>{severity}</span>;
}

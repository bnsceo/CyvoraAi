import EntitySurface from '@/components/EntitySurface';
import type { EntityRecord } from '@/lib/founderOs';

const evidence: EntityRecord[] = [
  { id: 'ev-1042-r1', kind: 'evidence', name: 'Content Studio market intelligence report', status: 'validated', summary: 'Research report with sources, claims, confidence, pricing signals, and extracted patterns.', company: 'Content Studio', traceId: 'CYV-1042', metadata: { type: 'Research report', version: 3, provenance: 'Attached', validation: 'Passed' } },
  { id: 'ev-1042-b1', kind: 'evidence', name: 'Content Studio approved blueprint', status: 'awaiting_approval', summary: 'Company structure, departments, agents, tasks, connectors, and policy assumptions.', company: 'Content Studio', traceId: 'CYV-1042', risk: 'medium', metadata: { type: 'Blueprint', version: 1, provenance: 'Research-linked', validation: 'Passed' } },
  { id: 'ev-1040-p1', kind: 'evidence', name: 'Worker reliability patch', status: 'candidate', summary: 'Generated code patch with diff, build evidence, and rollback reference.', company: 'Software Lab', traceId: 'CYV-1040', metadata: { type: 'Code patch', version: 2, provenance: 'Execution run', validation: 'QA running' } },
];

export default function EvidencePage() {
  return <EntitySurface eyebrow="Institutional memory" title="Evidence & Outputs" description="Research, source captures, blueprints, code patches, media, approvals, validations, and final deliverables remain linked to their company, task, execution run, and trace." entities={evidence} columns={[{ key: 'name', label: 'Asset' }, { key: 'company', label: 'Company' }, { key: 'status', label: 'Validation' }, { key: 'traceId', label: 'Trace' }]} />;
}

import EntitySurface from '@/components/EntitySurface';
import type { EntityRecord } from '@/lib/founderOs';

const connectors: EntityRecord[] = [
  { id: 'con-github', kind: 'connector', name: 'GitHub', status: 'healthy', summary: 'Repository read/write access within approved scopes.', company: 'Global', traceId: 'SYS-GH', metadata: { auth: 'App installation', scope: 'Repository operations', health: 'healthy' } },
  { id: 'con-gumroad', kind: 'connector', name: 'Gumroad', status: 'not_configured', summary: 'Digital-product publishing and sales data.', company: 'Marketplace Division', traceId: 'SYS-GR', metadata: { auth: 'API token', scope: 'Products and sales', health: 'not configured' } },
  { id: 'con-youtube', kind: 'connector', name: 'YouTube Studio', status: 'blocked', summary: 'Publishing disabled until OAuth is configured.', company: 'Content Studio', traceId: 'CYV-1042', risk: 'high', metadata: { auth: 'OAuth', scope: 'Draft upload only', health: 'blocked' } },
];

export default function ConnectorsPage() {
  return <EntitySurface eyebrow="Extensibility system" title="Connectors" description="Configure external systems, inspect connection health, and control the exact scopes available to agents and workers." entities={connectors} columns={[{ key: 'name', label: 'Connector' }, { key: 'company', label: 'Scope' }, { key: 'status', label: 'Health' }, { key: 'traceId', label: 'Reference' }]} />;
}

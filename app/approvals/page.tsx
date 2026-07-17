import EntitySurface from '@/components/EntitySurface';
import { founderOsMock } from '@/lib/founderOs';

export default function ApprovalsPage() {
  return <EntitySurface eyebrow="Human-in-the-loop control" title="Approvals" description="Every consequential transition remains visible, reviewable, and attributable to founder authority." entities={founderOsMock.approvals} columns={[{ key: 'name', label: 'Decision' }, { key: 'company', label: 'Company' }, { key: 'status', label: 'State' }, { key: 'traceId', label: 'Trace' }]} />;
}

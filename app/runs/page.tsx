import EntitySurface from '@/components/EntitySurface';
import { founderOsMock } from '@/lib/founderOs';

export default function RunsPage() {
  return <EntitySurface eyebrow="Execution system" title="Execution Runs" description="Inspect the exact task, worker claim, model route, validation posture, cost, and trace for every execution attempt." entities={founderOsMock.runs} columns={[{ key: 'name', label: 'Run' }, { key: 'company', label: 'Company' }, { key: 'status', label: 'State' }, { key: 'cost', label: 'Cost' }]} />;
}

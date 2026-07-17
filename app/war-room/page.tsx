import EntitySurface from '@/components/EntitySurface';
import { founderOsMock } from '@/lib/founderOs';

export default function WarRoomPage() {
  return <EntitySurface eyebrow="Reliability and recovery" title="War Room" description="Monitor incidents, blocked work, connector failures, recovery posture, and the controls required to return the system to a safe state." entities={founderOsMock.incidents} columns={[{ key: 'name', label: 'Incident' }, { key: 'company', label: 'Company' }, { key: 'status', label: 'State' }, { key: 'traceId', label: 'Trace' }]} />;
}

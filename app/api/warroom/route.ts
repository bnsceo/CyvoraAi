import { NextRequest, NextResponse } from 'next/server';
import { getTenantId } from '@/lib/tenant';
import { isDemoMode } from '@/lib/runtimeMode';
import { getWarRoomSnapshot } from '@/lib/warRoom';
import {
  getCompanies,
  getConnectors,
  getExecutionRuns,
  getIncidentById,
  getTasks,
  requeueTask,
  retryExecutionRun,
  saveRecoveryAction,
  updateIncidentStatus,
} from '@/lib/db';

const dbAdapter = { getExecutionRuns, getCompanies, getTasks, getConnectors };

export async function GET() {
  try {
    const tenant = await getTenantId();
    const snapshot = await getWarRoomSnapshot(tenant, dbAdapter);
    return NextResponse.json(snapshot);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unable to load War Room state.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (isDemoMode()) {
      return NextResponse.json(
        { error: 'Recovery actions are read-only in free demo mode. Reset the demo to refresh showcase data.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const action = body?.action as string;
    const tenant = await getTenantId();

    if (action === 'acknowledge' || action === 'resolve') {
      const incidentId = Number.parseInt(body?.incidentId, 10);
      if (!Number.isFinite(incidentId)) {
        return NextResponse.json({ error: 'incidentId is required.' }, { status: 400 });
      }
      const incident = await getIncidentById(incidentId, tenant);
      if (!incident) {
        return NextResponse.json({ error: 'Incident not found for this tenant.' }, { status: 404 });
      }
      await updateIncidentStatus({
        id: incidentId,
        tenant,
        status: action === 'acknowledge' ? 'acknowledged' : 'resolved',
        resolution_note: action === 'resolve' ? body?.notes || 'Resolved by founder from War Room.' : undefined,
      });
      await saveRecoveryAction({
        tenant,
        incident_id: incidentId,
        company_id: incident.company_id,
        action_type: action,
        target_type: incident.source_type,
        target_id: incident.source_id,
        notes: body?.notes || '',
      });
      return NextResponse.json({ ok: true, incidentId, status: action === 'acknowledge' ? 'acknowledged' : 'resolved' });
    }

    if (action === 'retry_run') {
      const executionRunId = Number.parseInt(body?.executionRunId, 10);
      if (!Number.isFinite(executionRunId)) {
        return NextResponse.json({ error: 'executionRunId is required.' }, { status: 400 });
      }
      const result = await retryExecutionRun({ id: executionRunId, tenant });
      if (!result.ok) {
        return NextResponse.json({ error: result.reason }, { status: 409 });
      }
      const incidentId = Number.parseInt(body?.incidentId, 10);
      if (Number.isFinite(incidentId)) {
        const incident = await getIncidentById(incidentId, tenant);
        if (incident) {
          await updateIncidentStatus({ id: incidentId, tenant, status: 'resolved', resolution_note: 'Execution run retried by founder.' });
        }
      }
      await saveRecoveryAction({
        tenant,
        incident_id: Number.isFinite(incidentId) ? incidentId : null,
        action_type: 'retry_run',
        target_type: 'execution_run',
        target_id: executionRunId,
        notes: body?.notes || '',
      });
      return NextResponse.json({ ok: true, executionRunId, status: 'queued' });
    }

    if (action === 'requeue_task') {
      const taskId = Number.parseInt(body?.taskId, 10);
      if (!Number.isFinite(taskId)) {
        return NextResponse.json({ error: 'taskId is required.' }, { status: 400 });
      }
      const result = await requeueTask({ id: taskId, tenant });
      if (!result.ok) {
        return NextResponse.json({ error: result.reason }, { status: 409 });
      }
      const incidentId = Number.parseInt(body?.incidentId, 10);
      if (Number.isFinite(incidentId)) {
        const incident = await getIncidentById(incidentId, tenant);
        if (incident) {
          await updateIncidentStatus({ id: incidentId, tenant, status: 'resolved', resolution_note: 'Task requeued by founder.' });
        }
      }
      await saveRecoveryAction({
        tenant,
        incident_id: Number.isFinite(incidentId) ? incidentId : null,
        company_id: result.company_id ?? null,
        action_type: 'requeue_task',
        target_type: 'task',
        target_id: taskId,
        notes: body?.notes || '',
      });
      return NextResponse.json({ ok: true, taskId, status: 'active' });
    }

    return NextResponse.json({ error: `Unsupported action '${action}'.` }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Recovery action failed.' }, { status: 500 });
  }
}

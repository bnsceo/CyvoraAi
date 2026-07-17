import {
  autoResolveStaleIncidents,
  getIncidents,
  getRecoveryActions,
  getWorkerHeartbeats,
  upsertIncident,
  type IncidentCondition,
} from './db';

const WORKER_STALE_SECONDS = Number.parseInt(process.env.WORKER_STALE_SECONDS || '90', 10);

const UNHEALTHY_CONNECTOR_STATUSES = new Set([
  'needs authentication',
  'needs auth',
  'expired',
  'blocked',
  'disabled',
  'error',
  'degraded',
  'unavailable',
  'limited',
]);

function secondsSince(iso?: string | null): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 1000);
}

/**
 * Scans live operational tables for the conditions War Room is responsible
 * for surfacing: stale/missing worker heartbeats, blocked or failed
 * execution runs, blocked or failed tasks, failed/blocking validations, and
 * unhealthy connectors. Every condition is written as a fingerprinted
 * incident (idempotent across rescans); anything that no longer reproduces
 * on this scan is auto-resolved.
 */
export async function scanForIncidents(
  tenant: string,
  db: {
    getExecutionRuns: (tenant?: string) => Promise<any[]>;
    getCompanies: (tenant: string) => Promise<any[]>;
    getTasks: (companyId: number) => Promise<any[]>;
    getConnectors: (companyId: number) => Promise<any[]>;
  }
): Promise<{ scanned: number; open: number }> {
  const conditions: IncidentCondition[] = [];

  // 1. Worker fleet health
  const heartbeats = await getWorkerHeartbeats();
  const latest = heartbeats[0];
  const ageSeconds = latest ? secondsSince(latest.last_seen_at) : null;
  if (!latest) {
    conditions.push({
      fingerprint: 'worker:none',
      category: 'worker_offline',
      severity: 'high',
      source_type: 'worker',
      title: 'No worker heartbeat recorded',
      description: 'The execution worker has never reported in. Queued tasks and execution runs cannot progress.',
      remediation: 'Start the worker loop (scripts/worker-loop.sh) and confirm it can reach the database.',
    });
  } else if (ageSeconds !== null && ageSeconds > WORKER_STALE_SECONDS) {
    conditions.push({
      fingerprint: `worker:${latest.worker_id}`,
      category: 'worker_stale',
      severity: 'high',
      source_type: 'worker',
      title: `Worker '${latest.worker_id}' heartbeat is stale`,
      description: `Last heartbeat was ${ageSeconds}s ago, exceeding the ${WORKER_STALE_SECONDS}s threshold.`,
      remediation: 'Check the worker process. Leases held by this worker will need stale-claim recovery.',
    });
  }

  // 2. Execution runs
  const runs = await db.getExecutionRuns(tenant);
  for (const run of runs) {
    if (run.status === 'blocked' || run.status === 'failed') {
      conditions.push({
        fingerprint: `execution_run:${run.id}`,
        category: run.status === 'blocked' ? 'run_blocked' : 'run_failed',
        severity: run.status === 'failed' ? 'high' : 'medium',
        source_type: 'execution_run',
        source_id: run.id,
        company_id: run.company_id ?? null,
        title: `Execution run #${run.id} is ${run.status}`,
        description: run.error_message || `Goal: ${run.goal}`,
        remediation: 'Inspect the approved runtime plan and retry the run once the blocker is cleared.',
      });
    }
  }

  // 3. Company-scoped tasks and connectors
  const companies = await db.getCompanies(tenant);
  for (const company of companies) {
    const tasks = await db.getTasks(company.id);
    for (const task of tasks) {
      if (task.status === 'blocked' || task.status === 'failed') {
        conditions.push({
          fingerprint: `task:${task.id}`,
          category: task.status === 'blocked' ? 'task_blocked' : 'task_failed',
          severity: task.status === 'failed' ? 'high' : 'medium',
          source_type: 'task',
          source_id: task.id,
          company_id: company.id,
          title: `Task #${task.id} '${task.title}' is ${task.status}`,
          description: task.last_error || `${company.name} · ${task.workflow_stage}`,
          remediation: 'Review the task lease and error, then requeue once the founder confirms it is safe.',
        });
      }
    }

    const connectors = await db.getConnectors(company.id);
    for (const connector of connectors) {
      const normalized = String(connector.status || '').toLowerCase();
      if (UNHEALTHY_CONNECTOR_STATUSES.has(normalized)) {
        conditions.push({
          fingerprint: `connector:${connector.id}`,
          category: 'connector_unhealthy',
          severity: 'medium',
          source_type: 'connector',
          source_id: connector.id,
          company_id: company.id,
          title: `Connector '${connector.name}' is ${connector.status}`,
          description: connector.summary || `${company.name} connector requires attention before governed actions can proceed.`,
          remediation: 'Reconnect or re-authenticate the connector. Actions that depend on it remain blocked until healthy.',
        });
      }
    }
  }

  for (const condition of conditions) {
    await upsertIncident(tenant, condition);
  }
  await autoResolveStaleIncidents(tenant, conditions.map((c) => c.fingerprint));

  const open = await getIncidents(tenant, 'open');
  return { scanned: conditions.length, open: open.length };
}

export async function getWarRoomSnapshot(
  tenant: string,
  db: {
    getExecutionRuns: (tenant?: string) => Promise<any[]>;
    getCompanies: (tenant: string) => Promise<any[]>;
    getTasks: (companyId: number) => Promise<any[]>;
    getConnectors: (companyId: number) => Promise<any[]>;
  }
) {
  await scanForIncidents(tenant, db);

  const [incidents, heartbeats, recentActions, runs, companies] = await Promise.all([
    getIncidents(tenant),
    getWorkerHeartbeats(),
    getRecoveryActions(tenant, 20),
    db.getExecutionRuns(tenant),
    db.getCompanies(tenant),
  ]);

  let queuedTasks = 0;
  let runningTasks = 0;
  let blockedTasks = 0;
  for (const company of companies) {
    const tasks = await db.getTasks(company.id);
    for (const task of tasks) {
      if (task.status === 'queued' || task.status === 'active') queuedTasks += 1;
      if (task.status === 'in_progress') runningTasks += 1;
      if (task.status === 'blocked') blockedTasks += 1;
    }
  }

  const queuedRuns = runs.filter((r) => r.status === 'queued').length;
  const runningRuns = runs.filter((r) => r.status === 'in_progress').length;
  const blockedRuns = runs.filter((r) => r.status === 'blocked').length;
  const latestHeartbeat = heartbeats[0] || null;
  const heartbeatAgeSeconds = latestHeartbeat ? secondsSince(latestHeartbeat.last_seen_at) : null;

  return {
    incidents,
    summary: {
      open: incidents.filter((i: any) => i.status === 'open').length,
      acknowledged: incidents.filter((i: any) => i.status === 'acknowledged').length,
      resolved: incidents.filter((i: any) => i.status === 'resolved').length,
      critical: incidents.filter((i: any) => i.status !== 'resolved' && i.severity === 'critical').length,
    },
    workers: {
      fleet: heartbeats,
      latest: latestHeartbeat,
      healthy: heartbeatAgeSeconds !== null && heartbeatAgeSeconds <= WORKER_STALE_SECONDS,
      staleAfterSeconds: WORKER_STALE_SECONDS,
    },
    queue: {
      queuedTasks,
      runningTasks,
      blockedTasks,
      queuedRuns,
      runningRuns,
      blockedRuns,
    },
    recentActions,
  };
}

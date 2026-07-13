import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { workspaceRoot, tenantsRoot } from '@/lib/paths';
import { getRuntimeModeInfo } from '@/lib/runtimeMode';

const DB_PATH = process.env.MISSIONS_DB_PATH || path.join(workspaceRoot, 'data', 'missions.db');
const WORKER_STALE_SECONDS = Number.parseInt(process.env.WORKER_STALE_SECONDS || '90', 10);

type HealthRow = {
  last_seen_at?: string;
  status?: string;
  worker_id?: string;
  current_run_id?: number | null;
  current_task_id?: number | null;
};

function queryHealth(): Promise<{
  worker: HealthRow | null;
  queuedRuns: number;
  inProgressRuns: number;
  activeTasks: number;
}> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (openError) => {
      if (openError) reject(openError);
    });
    db.serialize(() => {
      db.get('SELECT 1 AS ok', (pingError) => {
        if (pingError) {
          db.close();
          reject(pingError);
          return;
        }
        db.get(
          'SELECT * FROM worker_heartbeats ORDER BY last_seen_at DESC LIMIT 1',
          (workerError, worker: HealthRow | undefined) => {
            if (workerError && !workerError.message.includes('no such table')) {
              db.close();
              reject(workerError);
              return;
            }
            db.get(
              `SELECT
                SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) AS queued_runs,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_runs
               FROM execution_runs`,
              (runError, runCounts: any) => {
                if (runError) {
                  db.close();
                  reject(runError);
                  return;
                }
                db.get(
                  `SELECT SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_tasks FROM tasks`,
                  (taskError, taskCounts: any) => {
                    db.close();
                    if (taskError) {
                      reject(taskError);
                      return;
                    }
                    resolve({
                      worker: worker || null,
                      queuedRuns: Number(runCounts?.queued_runs || 0),
                      inProgressRuns: Number(runCounts?.in_progress_runs || 0),
                      activeTasks: Number(taskCounts?.active_tasks || 0),
                    });
                  }
                );
              }
            );
          }
        );
      });
    });
  });
}

export async function GET() {
  const checkedAt = new Date();
  const runtime = getRuntimeModeInfo();
  try {
    const data = await queryHealth();
    const lastSeen = data.worker?.last_seen_at ? new Date(data.worker.last_seen_at) : null;
    const workerAgeSeconds = lastSeen ? Math.max(0, Math.floor((checkedAt.getTime() - lastSeen.getTime()) / 1000)) : null;
    const workerHealthy = workerAgeSeconds !== null && workerAgeSeconds <= WORKER_STALE_SECONDS;
    const tenantStorageReady = fs.existsSync(tenantsRoot) && fs.statSync(tenantsRoot).isDirectory();
    return NextResponse.json({
      status: workerHealthy && tenantStorageReady ? 'healthy' : 'degraded',
      checked_at: checkedAt.toISOString(),
      runtime: {
        mode: runtime.mode,
        mock_mode: runtime.mockMode,
        paid_ai_allowed: runtime.allowPaidAI,
      },
      database: { status: 'ok', path: DB_PATH },
      worker: {
        status: workerHealthy ? 'online' : data.worker ? 'stale' : 'unknown',
        worker_id: data.worker?.worker_id || null,
        last_seen_at: data.worker?.last_seen_at || null,
        age_seconds: workerAgeSeconds,
        current_run_id: data.worker?.current_run_id || null,
        current_task_id: data.worker?.current_task_id || null,
      },
      queue: {
        queued_runs: data.queuedRuns,
        in_progress_runs: data.inProgressRuns,
        active_tasks: data.activeTasks,
      },
      storage: { tenant_snapshots: tenantStorageReady ? 'ok' : 'missing', path: tenantsRoot },
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'unhealthy', checked_at: checkedAt.toISOString(), error: error?.message || 'Health check failed' },
      { status: 503 }
    );
  }
}

import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import path from 'path';
import { workspaceRoot } from '@/lib/paths';
import { getTenantId } from '@/lib/tenant';

const DB_PATH = process.env.MISSIONS_DB_PATH || path.join(workspaceRoot, 'data', 'missions.db');

export async function GET() {
  const tenant = await getTenantId();
  return new Promise<NextResponse>((resolve) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);
    db.all(`SELECT * FROM validation_runs WHERE tenant = ? ORDER BY started_at DESC LIMIT 100`, [tenant], (error, rows) => {
      db.close();
      if (error) { resolve(NextResponse.json({ error: error.message }, { status: 500 })); return; }
      resolve(NextResponse.json(rows || []));
    });
  });
}

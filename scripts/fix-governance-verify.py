from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f'Missing expected source in {path}: {old!r}')
    p.write_text(text.replace(old, new, 1))

replace('app/api/stream/route.ts',
        "export type ScopedEvent = { type: string; tenant?: string; companyId?: number | null; traceId?: string; payload?: unknown; message?: string };",
        "export type ScopedEvent = { type: string; tenant?: string; companyId?: number | null; traceId?: string; payload?: unknown; message?: string; [key: string]: unknown };")
replace('app/api/stream/route.ts',
        "  const stored = await appendDurableEvent({ tenant, companyId: data.companyId || null, eventType: data.type, payload: data.payload || { message: data.message }, traceId: data.traceId });",
        "  const { type, tenant: _tenant, companyId, traceId, payload, ...details } = data;\n  const stored = await appendDurableEvent({ tenant, companyId: companyId || null, eventType: type, payload: payload || details, traceId });")
replace('app/api/approvals/[id]/route.ts',
        "import { ensureApprovalSnapshot, getApprovalSnapshot, signApproval } from '@/lib/governanceStore';",
        "import { ensureApprovalSnapshot, signApproval } from '@/lib/governanceStore';")
replace('components/CompanyDetailSurface.tsx',
        "import { useEffect, useMemo, useRef, useState } from 'react';",
        "import { useEffect, useRef, useState } from 'react';")
for name in ['GOVERNANCE_VERIFY_ERROR.txt', 'GOVERNANCE_MIGRATION_ERROR.txt']:
    Path(name).unlink(missing_ok=True)
Path('scripts/fix-governance-verify.py').unlink()

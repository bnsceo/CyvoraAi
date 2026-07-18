from pathlib import Path

required = {
  'lib/governance.ts': ['assertTransition', 'contentHash', 'approve_with_conditions'],
  'lib/governanceStore.ts': ['approval_snapshots', 'company_state_transitions', 'durable_events', 'assertCompanyTenant'],
  'app/api/stream/route.ts': ['company_id', 'last-event-id', 'listDurableEvents'],
  'app/api/approvals/[id]/route.ts': ['expected_signature', 'request_revision', 'approve_with_conditions'],
  'components/CompanyDetailSurface.tsx': ['EventSource', 'Intent vs. execution plan', 'Sign and submit decision'],
}
for path, markers in required.items():
  text = Path(path).read_text()
  for marker in markers:
    if marker not in text: raise SystemExit(f'{path} missing {marker}')
print('Governance live bridge verification passed.')

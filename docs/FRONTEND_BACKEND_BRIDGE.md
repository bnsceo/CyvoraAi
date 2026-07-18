# Cyvora Frontend-to-Backend Bridge

## Current bridge status

The application shell, Companies workspace, responsive CompanyDetailSurface, approvals, execution runs, connectors, policy surfaces, War Room, evidence, and history are implemented. The current backend provides SQLite-backed company, task, approval, output, activity, execution-run, validation, usage, incident, recovery, and worker-heartbeat records.

The Alpha 1 bridge now includes:

- Migration-safe backend TraceIDs across core mutable runtime records.
- Exact execution-run-to-task binding with fail-closed worker claims.
- Immutable approval snapshots containing intent, plan, policy, plan hash, founder identity, signature, decision, conditions, and timestamps.
- Canonical backend company machine-state transitions stored as first-class events.
- Tenant- and company-scoped server-sent events with durable replay and `Last-Event-ID` support.
- A live CompanyDetailSurface approval handshake that shows Intent vs. Plan before the founder signs.
- Critical tenant-scope checks on approval, state transition, and event history operations.

## Remaining production work

### 1. Production identity and complete route authorization

Replace demo tenant cookies with authenticated organizations, users, roles, memberships, sessions, and server-enforced authorization. Extend the tenant-scope helper across every remaining API route and worker entry point.

### 2. Durable production database

Move runtime persistence from local SQLite to PostgreSQL with versioned migrations, transactions, indexes, backups, retention, tenant isolation, and audited administrative access. SQLite remains the local/demo database.

### 3. Real provider and connector adapters

Implement one production model provider and one connector end to end. Secrets must be encrypted server-side; browser payloads receive health, scopes, account identity, expiration, and reconnect state only.

### 4. Queue and worker deployment

Deploy durable workers with queue ownership, leases, heartbeats, retries, dead-letter handling, idempotency keys, cancellation, concurrency limits, and recovery procedures.

### 5. Evidence and complete trace propagation

Add durable object storage for research evidence, source captures, generated files, code patches, media, validation artifacts, and final deliverables. Continue the same TraceID through model requests, connector actions, evidence objects, and exportable history.

### 6. Full-loop acceptance tests

Automate the canonical loop:

Objective → Research → Blueprint → Approval → Company → Task → Policy Gate → Worker → Validation → Result Approval → History

The final production gate passes only when one TraceID reconstructs the complete chain without manual database edits.

## Recommended implementation order

1. PostgreSQL migrations and tenant-safe repositories
2. Production authentication and role enforcement
3. One model provider and one connector
4. Durable queue and worker deployment
5. Evidence storage and full trace propagation
6. Full-loop acceptance tests
7. Billing, plans, seats, and usage enforcement
8. Production hardening and public beta

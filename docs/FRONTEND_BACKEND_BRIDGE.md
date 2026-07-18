# Cyvora Frontend-to-Backend Bridge

## Current bridge status

The application shell, Companies workspace, responsive CompanyDetailSurface, approvals, execution runs, connectors, policy surfaces, War Room, evidence, and history are implemented. The current backend provides SQLite-backed company, task, approval, output, activity, execution-run, validation, usage, incident, recovery, and worker-heartbeat records.

The Alpha 1 core bridge now has two enforced foundations:

- Core mutable runtime records have migration-safe TraceID columns, and new Node write paths issue `trc_...` identifiers while legacy rows remain readable.
- Queued execution runs are bound to one explicit `task_id`, and the worker fails closed when a run is unbound or the task does not belong to the run's company.

The production bridge is not complete until every frontend entity is sourced from durable tenant-scoped APIs and every state transition is enforced by the backend rather than inferred in the browser.

## Required bridge work

### 1. Complete universal trace context

Extend the established trace chain across objective, research run, blueprint version, model call, tool call, connector action, and history export. Frontend-generated diagnostic references must remain error references only; operational TraceIDs must come from the backend.

### 2. Harden task-to-run authorization

The explicit task binding is in place. Next, store and verify the approved runtime-plan hash and immutable approval snapshot before claim and again before commit.

### 3. Immutable approval snapshots

Blueprint and execution approvals need versioned canonical JSON, content hashes, approver identity, decision reason, policy result, timestamp, and the exact downstream action authorized by the approval.

### 4. Production identity and tenancy

Replace demo tenant assumptions with authenticated organizations, users, roles, memberships, sessions, and server-enforced authorization. Founder, operator, and auditor permissions must be checked by API routes and workers.

### 5. Durable production database

Move runtime persistence from local SQLite to PostgreSQL with migrations, transactions, indexes, backups, retention, tenant isolation, and audited administrative access. SQLite remains useful for local/demo mode.

### 6. Real provider and connector adapters

Implement at least one production model provider and one connector end to end. Secrets must be encrypted server-side; the frontend receives health, scopes, account identity, expiration, and reconnect state only.

### 7. Queue and worker deployment

Deploy durable workers with queue ownership, leases, heartbeats, retries, dead-letter handling, idempotency keys, cancellation, concurrency limits, and recovery procedures. Surface worker and queue health through the existing Execution and War Room interfaces.

### 8. Validation and result acceptance

Store validator inputs, outputs, findings, confidence, dissent, costs, and policy decisions. Final outputs must remain candidates until the configured human or jury gate accepts them.

### 9. Evidence and file storage

Add durable object storage for research evidence, source captures, generated files, code patches, media, validation artifacts, and final deliverables. Every asset must reference company, objective, task, run, creator, version, provenance, and TraceID.

### 10. Real-time updates

Replace periodic static reads with a company-scoped server event channel for task, run, approval, connector, worker, and incident updates. All event payloads must be tenant-scoped and replayable from durable history.

### 11. Production operations

Add structured logs, metrics, alerting, rate limits, audit export, security headers, CSRF protection, input schemas, error redaction, dependency scanning, environment separation, deployment rollback, and disaster-recovery tests.

### 12. End-to-end acceptance tests

Automate the canonical loop:

Objective → Research → Blueprint → Approval → Company → Task → Policy Gate → Worker → Validation → Result Approval → History

The release gate passes only when a test proves that one TraceID can reconstruct the complete chain without manual database edits.

## Recommended implementation order

1. Immutable blueprint and approval snapshots
2. Canonical backend state transitions and company-scoped SSE
3. PostgreSQL migrations and tenant-safe repositories
4. Production authentication and role enforcement
5. One model provider and one connector
6. Durable queue and worker deployment
7. Evidence storage and full trace propagation
8. Full-loop acceptance tests
9. Billing, plans, seats, and usage enforcement
10. Production hardening and public beta

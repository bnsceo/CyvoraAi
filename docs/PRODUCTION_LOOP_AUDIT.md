# Cyvora Production Loop Audit

## Audit target

```text
Objective
→ Research and ethical reverse engineering
→ Blueprint
→ Founder Approval
→ Policy Gate
→ Worker
→ Execution
→ Validation
→ History
```

## Executive conclusion

Cyvora already contains a meaningful control plane and execution skeleton. The repository is not merely a dashboard: it has tenant-aware APIs, company structure, tasks, approvals, queued execution runs, a lease-based worker, provider policy, deterministic output validation, usage records, result acceptance, and activity history.

The primary production gap is **continuity across the complete operating loop**. Several strong subsystems exist, but the same immutable operating record does not yet travel through every stage from research to final history.

## Current stage-by-stage status

| Stage | Current implementation | Status | Exact gap |
|---|---|---:|---|
| Objective | Mission intake and blueprint APIs accept founder objectives. | Present | Objective identity is not consistently propagated with one trace ID. |
| Research | Static templates contain research roles and tasks. The blueprint API now returns an explicit deterministic mock research package. | Partial | No persisted `research_runs`, live-source adapters, source snapshots, freshness policy, or evidence review. |
| Blueprint | `buildExecutiveBlueprint` produces departments, teams, agents, connectors, tasks, approvals, KPIs, roadmap, and risks. | Present | A second blueprint path, `inferMissionBlueprint`, is used by mission execution. This creates two competing sources of company structure. |
| Approval | Approval APIs support approve/hold and result acceptance. Harness snapshots protect runtime plans. | Present | Blueprint approval is not yet an immutable signed snapshot that the mission instantiation path consumes. Decision actor and reason are not required by the approval route. |
| Policy Gate | Billing and harness checks run before queueing. Worker policy determines provider, connector posture, and result-approval requirements. | Present | Policy decisions need a persisted version/hash and one traceable decision record for each execution attempt. |
| Worker | Python worker atomically claims queued runs and approved active tasks, uses leases and attempt limits, and recovers stale claims. | Strong | The run is associated with a company, not an explicit task. With multiple approved active tasks, the worker can claim the first eligible task rather than the task intended by the run. |
| Execution | Provider abstraction and mock execution exist. Usage is recorded. | Present | One production provider must be proven in staging; connector side effects still require production adapters, secret management, and sandboxing. |
| Validation | Strict JSON contract and deterministic schema validation exist; high-risk results can require founder acceptance. | Partial | Validation checks structure, not research provenance, factual evidence, business acceptance criteria, or claim freshness. |
| History | Activity events, execution results, validation runs, usage, approvals, and outputs are stored. | Present | No universal trace ID connects research, blueprint, approval, mission, task, run, validation, output, and final decision. |

## P0 findings

### 1. Research is not yet an institutional record

The research stage is strategically central but was previously represented mainly by deterministic templates and research-oriented agents. The new mock research package makes the stage explicit at the API boundary, but production still needs:

- `research_runs`
- `research_sources`
- source URL or connector identity
- retrieval timestamp and freshness requirement
- source snapshot/hash
- claim-to-source mapping
- confidence and dissent
- evidence-review status
- tenant and company ownership
- trace ID

A blueprint must be able to state which research record informed it.

### 2. Blueprint architecture is split

Two systems currently shape companies:

- `buildExecutiveBlueprint(objective)` in the Executive AI path
- `inferMissionBlueprint(goal)` in the mission-start path

The mission route should not independently infer a second company after the founder reviewed a different blueprint. The approved Executive Blueprint must become the sole instantiation contract.

### 3. No immutable approved blueprint snapshot

The harness runtime plan is snapshot-protected, but the company blueprint is not carried into execution with the same rigor.

Required record:

```text
approved_blueprint_id
approved_blueprint_hash
research_run_id
approval_id
approved_by
approved_at
approval_reason
```

Company creation must reject a blueprint whose hash differs from the approved snapshot.

### 4. Execution runs are not bound to one explicit task

The worker selects the first approved active task for the run's company. This is deterministic but not sufficiently precise for production.

Required change:

- Add `task_id` to `execution_runs`.
- Queue a run for exactly one approved task.
- Worker claim query must match both `run.task_id` and `task.id`.
- Enforce idempotency per task/run pair.

### 5. Runtime-plan comparison is inconsistent

The mission route compares plans with direct `JSON.stringify`, which is sensitive to object key order. The worker compares canonical sorted JSON.

Required change:

- Use one canonical serializer in both TypeScript and Python.
- Store a SHA-256 runtime-plan hash in the approved snapshot and execution run.
- Compare hashes rather than incidental serialization order.

### 6. No full-loop automated acceptance test

The package scripts currently expose development, build, start, lint, and a Codex helper, but no automated acceptance test or explicit type-check command.

The repository needs a deterministic test that proves the full state sequence and fails on:

- missing research evidence
- unapproved blueprint
- changed runtime plan
- policy denial
- unapproved task
- duplicate worker claim
- invalid provider output
- missing validation
- missing history
- cross-tenant access

## P1 findings

### Validation depth

Add validators for:

- research provenance
- factual claims
- freshness
- blueprint acceptance criteria
- connector result reconciliation
- policy compliance
- cost ceiling
- business output quality

### Approval evidence

Every consequential approval should record:

- authenticated actor
- decision
- reason
- subject type and ID
- version/hash
- policy version
- timestamp
- tenant
- trace ID

### Versioned migrations

The worker currently ensures parts of the runtime schema at startup. Production should move schema changes to versioned migrations that are applied before workers start.

### Operational observability

Expose and alert on:

- worker heartbeat age
- queued-run age
- stale leases
- attempts exhausted
- policy blocks
- validation failures
- pending result acceptance
- provider latency and cost

## Required production data chain

```text
Objective
  trace_id
    ↓
ResearchRun
  source snapshots + claims + confidence
    ↓
Blueprint
  research_run_id + blueprint_hash
    ↓
BlueprintApproval
  actor + reason + approved hash
    ↓
Company / Task
  approved_blueprint_id
    ↓
ExecutionRun
  task_id + plan_hash + idempotency_key
    ↓
PolicyDecision
  policy version + result
    ↓
WorkerClaim
  worker + lease + attempt
    ↓
Output
  provider request + usage
    ↓
ValidationRun
  findings + decision
    ↓
ResultApproval
  optional founder acceptance
    ↓
ActivityHistory / InstitutionalMemory
```

## Release gate

Cyvora is ready for a limited founder beta when one objective can complete this exact sequence without manual database edits:

1. Founder submits an objective.
2. Research package is created and reviewable.
3. Blueprint references the research package.
4. Founder approves the exact blueprint version.
5. Company and first task are instantiated from that approved blueprint.
6. Founder approves the exact task/runtime plan.
7. Policy gate permits or blocks with a recorded reason.
8. One worker claims one task exactly once.
9. Mock provider returns a contract-valid result.
10. Validation is persisted.
11. Founder acceptance occurs when required.
12. Output becomes final.
13. History shows the entire chain under one trace ID.

## Scope decision

Do not pursue feature parity with broad enterprise agent platforms during this sprint. Work is P0 only when it improves trust, execution, or visibility in the full loop.

# Cyvora Production Loop Audit

## Target Operating Loop

```text
Founder Objective
→ Market Intelligence
→ Pattern Extraction and Ethical Reverse Engineering
→ Company Blueprint
→ Founder Approval
→ Policy Gate
→ Worker Claim
→ Provider Execution
→ Output Validation
→ History
→ Institutional Memory
```

## Executive Finding

Cyvora already contains a meaningful control-plane and worker skeleton. The strongest existing implementation is the deterministic Python execution worker, which claims queued runs, verifies approved runtime snapshots, claims approved tasks, invokes one provider, validates structured JSON, writes outputs, records usage, maintains heartbeats, and recovers stale leases.

The largest production gap is not another dashboard. It is continuity across the operating loop. Objective intake, market intelligence, blueprint creation, company instantiation, approval, execution-run creation, worker processing, validation, history, and memory are present at different levels of maturity but are not yet connected by one durable trace, one persisted workflow state, and one production acceptance contract.

## Stage-by-Stage Audit

### 1. Founder Objective

**Existing**

- Command Center mission intake exists.
- `/api/executive-ai/blueprint` accepts an objective.
- Input presence and length are validated.

**Missing**

- Durable mission record created before blueprint generation.
- Tenant-scoped trace ID created at intake.
- Objective versioning and founder identity.
- Explicit success criteria, constraints, budget, risk tolerance, and prohibited actions.

**Required production change**

Create a persisted `missions` or `objectives` record with a trace ID and immutable original input before research begins.

### 2. Market Intelligence

**Existing**

- Research-oriented agents and task templates exist inside blueprint templates.
- Several company templates include trend, audience, market, and evidence roles.

**Added in this branch**

- `lib/marketIntelligence.ts`
- `/api/research/market-intelligence`
- Deterministic mock signals, reference-operator analysis, opportunity gaps, extracted patterns, and differentiation rules.

**Missing**

- Real search/data connector.
- Source URLs, publication dates, quotations, and evidence snapshots.
- Freshness policy.
- Duplicate-source detection.
- Research confidence calibration.
- A human-review state for high-impact research assumptions.
- Persistent `research_runs`, `sources`, `findings`, and `opportunities` tables.

**Required production change**

Persist each research claim with source provenance and connect it to the same trace ID as the founder objective.

### 3. Pattern Extraction and Ethical Reverse Engineering

**Existing**

- Product strategy explicitly calls for learning from successful operators.
- Templates already separate research, risk, compliance, and operations.

**Added in this branch**

- Durable pattern extraction.
- Competitor weakness and opportunity-gap analysis.
- Differentiation rules that prohibit copying proprietary content, identity, or implementation details.

**Missing**

- Formal pattern schema.
- Evidence-to-pattern links.
- Similarity/plagiarism controls.
- Jurisdictional and terms-of-service review for collected data.
- Founder acceptance of the extracted strategic thesis.

### 4. Company Blueprint

**Existing**

- `buildExecutiveBlueprint` creates company structure, departments, teams, agents, connectors, tasks, approvals, KPIs, roadmap, and risks.
- `/api/executive-ai/blueprint` exposes the builder.

**Critical gap**

The current endpoint jumps directly from objective to a deterministic template. The returned blueprint does not consume a persisted research artifact or cite the evidence that shaped each major decision.

**Required production change**

Blueprint generation must require a completed research run ID and include research provenance for positioning, offer, pricing, departments, initial tasks, and risk assumptions.

### 5. Founder Approval

**Existing**

- Approval tables and API routes exist.
- Worker verifies an approved snapshot and exact runtime plan before claiming a task.

**Missing**

- One approval contract that binds research thesis, blueprint version, task chain, runtime plan, connector permissions, and cost ceiling.
- Cryptographic or canonical hash stored in the database rather than relying only on a filesystem snapshot.
- Strong actor authentication and tenant authorization on every decision.
- Explicit expiry and revocation behavior.

### 6. Policy Gate

**Existing**

- Worker calls a policy decision function.
- Demo mode prevents real mutation in several routes.
- Connector and provider status abstractions exist.

**Missing**

- One versioned policy decision record per execution attempt.
- Policy version/hash attached to history.
- Policy simulation before approval.
- Central capability registry for every connector action.
- Consistent cost, data-classification, reversibility, and external-side-effect fields.

### 7. Worker Claim

**Existing and substantive**

- Atomic queued-run claim.
- Approved-snapshot verification.
- Runtime-plan equality check.
- Approved-task claim.
- Lease, heartbeat, retry, and stale-claim recovery.
- Attempt ceilings.

**Missing**

- Durable queue technology beyond SQLite polling for multi-instance production.
- Database migration ownership outside worker startup.
- Operational supervisor health contract verified by deployment.
- Dead-letter queue and founder-visible escalation policy.
- Idempotency key enforced at connector boundary.

### 8. Provider Execution

**Existing**

- Provider abstraction.
- Persona resolution.
- Structured model request.
- Usage and estimated-cost recording.

**Missing**

- Production secret manager.
- Per-tenant provider credentials and permissions.
- Hard budget reservation before provider call.
- Timeout/cancellation policy.
- Model-response retention and redaction policy.
- Provider fallback rules that do not invalidate approval.

### 9. Output Validation

**Existing**

- Required JSON fields and allowed statuses.
- Validation-run table.
- Schema validation and blocked-result path.

**Missing**

- Task-specific acceptance criteria.
- Evidence verification for factual claims.
- Independent validator separation for high-risk tasks.
- Human approval for low-confidence or consequential outputs.
- Revision loop connected to maximum revisions.
- Validation policy version stored with accepted output.

### 10. History

**Existing**

- Events are recorded throughout worker lifecycle.
- History surface exists.

**Missing**

- Guaranteed single trace ID across objective, research, blueprint, approval, run, task, output, validation, recovery, and memory.
- Immutable event semantics and append-only enforcement.
- Actor identity and policy version on every event.
- Exportable founder audit packet.

### 11. Institutional Memory

**Existing**

- Knowledge and history concepts exist in product documentation and UI.

**Missing**

- Distinct working, episodic, semantic, and procedural memory stores.
- Provenance, confidence, sensitivity, validity period, supersession, and approval fields.
- Rules preventing unvalidated output from becoming organizational truth.
- Memory retrieval scoped by tenant, company, role, and task.

## P0 Production Sequence

1. Persist objective and trace ID.
2. Persist market-intelligence run and evidence.
3. Make blueprint generation consume an approved research run.
4. Bind blueprint, tasks, connector permissions, costs, and runtime plan into one approval snapshot.
5. Create an execution run from that approved snapshot.
6. Run the existing worker under a durable supervisor.
7. Validate and persist output.
8. Render the full trace in History.
9. Prevent memory promotion until validation and required founder acceptance succeed.
10. Execute the mocked acceptance test in CI, then add a staging acceptance test against the deployed worker.

## Acceptance Commands

Start Cyvora:

```bash
npm run dev
```

In another terminal:

```bash
npm run acceptance:founder-loop:mock
```

The test must fail when:

- Research is skipped.
- Founder approval is absent.
- Policy permits external actions in mock mode.
- A required stage is missing.
- Trace IDs differ across events.
- Execution does not complete.
- Validation does not accept the structured output.

## Definition of Production Proof

Cyvora can claim the first operating proof only when a founder can submit one objective and inspect one durable trace showing:

```text
Objective
→ sourced research
→ extracted strategy
→ versioned blueprint
→ founder approval
→ policy decision
→ worker claim
→ real provider result
→ validation
→ accepted output
→ history
```

No step may be represented only by landing-page copy or an unpersisted mock object in production mode.

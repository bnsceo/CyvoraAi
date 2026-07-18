# Cyvora Alpha 1 Release Gate

Cyvora Alpha 1 is complete only when one founder can execute one governed company workflow from objective to accepted result without manual database edits.

## Required checks

- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run build` passes.
- [ ] Python workers compile.
- [ ] Repository structure verification passes.
- [ ] `npm run verify:db` proves the fresh and legacy SQLite migration contracts.
- [ ] A fresh local database initializes without errors.
- [ ] An existing demo database migrates without data loss.
- [ ] New mutable runtime records receive backend-issued `trc_...` TraceIDs.
- [ ] Legacy runtime records remain readable with the `legacy_migration` marker.
- [ ] One objective creates a versioned blueprint.
- [ ] The founder can approve, hold, reject, or request revision.
- [ ] Rejected or held work cannot execute.
- [ ] One execution run is bound to one explicit approved task.
- [ ] An execution run without `task_id` fails closed before task claim.
- [ ] The worker claims only `execution_runs.task_id` within the matching company.
- [ ] PolicyGate runs before the worker claims work.
- [ ] One TraceID reconstructs objective, approval, task, run, validation, output, and history.
- [ ] Approval decisions preserve immutable intent, plan, policy, plan hash, founder signature, and conditions.
- [ ] Company machine-state transitions are backend validated and stored as first-class events.
- [ ] `/api/stream?company_id=...` is tenant-scoped and replays durable events from `Last-Event-ID`.
- [ ] A failed run produces a governed War Room incident.
- [ ] War Room recovery preserves the original failure record.
- [ ] Connector secrets never reach browser payloads.
- [ ] Tenant A cannot read or mutate Tenant B resources.
- [ ] CompanyDetailSurface passes mobile, tablet, desktop, keyboard, and screen-reader checks.

## Alpha 1 scope

The release intentionally supports one founder, one company, one approved task, one worker, one model provider, one connector, one accepted result, and one complete trace chain.

Features outside this gate—billing, multi-model juries, marketplace packs, broad autonomous operation, and additional connectors—must not block Alpha 1.

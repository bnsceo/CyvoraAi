# Backend Hardening Phase 2

This phase adds the candidate/result lifecycle that Cyvora needs before higher-risk work can be finalized safely.

## Implemented

- Candidate output state before finalization
- Deterministic validation-run persistence
- Separate result-acceptance approvals for high/critical-risk work
- Automatic finalization for low/medium-risk schema-validated work
- Actual provider input/output token capture
- Configurable estimated model cost calculation
- Usage-event persistence
- Output version, confidence, review, approval, and finalization metadata
- Task risk, validation policy, revision-count, and revision-limit fields
- Approval type, subject, execution-run, decision, and timestamp fields
- `GET /api/validation-runs`
- Founder approval now finalizes candidate output, task, and execution run together

## New execution flow

```text
approved execution task
→ agent/model output
→ candidate output
→ deterministic schema validation
→ usage record
→ risk and validation policy
```

### Low or medium risk

```text
candidate
→ schema passed
→ final output
→ task completed
→ execution run completed
```

### High or critical risk

```text
candidate
→ schema passed
→ awaiting result approval
→ founder approval
→ final output
→ task completed
→ execution run completed
```

## Validation performed

- Python syntax compilation passed.
- Shell syntax checks passed.
- Medium-risk mock worker path passed.
- High-risk result-approval path passed.
- Validation and usage records were verified in SQLite.

## Remaining limitation

This phase adds the validation framework and deterministic schema provider. It does not yet connect `duh` or another independent consensus reviewer. That provider can be added later without changing the candidate/result-approval state model.


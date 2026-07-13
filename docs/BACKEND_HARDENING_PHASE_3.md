# Backend Hardening Phase 3

Received from you on 2026-07-12 and imported into the canonical Cyvora repo on the same date.

This phase makes the zero-cost runtime explicit and fail-closed by default.

## Implemented

- Model-provider interface
- Deterministic mock provider
- Anthropic provider behind an optional adapter
- Provider registry with fail-closed paid-AI controls
- Connector interface
- Deterministic mock connectors
- Connector registry
- Execution policy engine
- Policy selection recorded as an activity event
- `GET /api/runtime/providers`
- Explicit Fly configuration for mock providers and connectors
- Zero-cost runtime smoke tests
- Preservation of Phase 1 leases/recovery and Phase 2 candidate/approval behavior

## Current safe configuration

```env
CYVORA_MODEL_PROVIDER=mock
CYVORA_CONNECTOR_MODE=mock
MOCK_MODE=true
ALLOW_PAID_AI=false
```

This configuration makes no paid AI calls and no external connector calls.

## Validation performed

```text
Zero-cost provider, connector, and policy smoke tests passed.
Phase 2 worker smoke tests passed.
Python syntax compilation passed.
```

## What “flip to real mode” means

For model providers that already have an adapter, switching can be configuration-driven.

```env
CYVORA_MODEL_PROVIDER=anthropic
ALLOW_PAID_AI=true
ANTHROPIC_API_KEY=...
MOCK_MODE=false
```

External connectors still need secure adapters before real side effects are allowed.

## Recommended next phase

Build the mock connector action ledger and tool registry so simulated GitHub, Gmail, YouTube, Gumroad, and publishing actions appear as real workflow records in History and Approvals.


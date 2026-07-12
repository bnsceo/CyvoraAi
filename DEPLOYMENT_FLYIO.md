# Cyvora Fly.io deployment runbook

This is the first production deployment path for Cyvora.

## Why this path

- SQLite stays on disk.
- The app can run as one persistent container.
- The current execution model can keep using a local worker process.
- Auth and billing can be added after the app is externally reachable.

## What the repo now includes

- `Dockerfile` — container build for the Next.js app and Python runtime
- `fly.toml` — Fly app configuration and persistent volume mount
- `lib/db.ts` — SQLite now resolves under the mounted workspace root

## Required Fly resources

Create a volume before the first deploy:

```bash
fly volumes create cyvora_data --region ewr --size 1
```

## First deploy

```bash
fly deploy
```

## Required environment

The container expects:

- `JARVIS_WORKSPACE_ROOT=/data/cyvora`

## Operational note

The deployment target is ready for the current architecture, but the actual worker engine is still a follow-up step. Until that worker exists, execution routes should stay blocked or mocked by design.


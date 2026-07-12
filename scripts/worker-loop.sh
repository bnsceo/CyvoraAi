#!/usr/bin/env bash

set -uo pipefail

POLL_INTERVAL_SECONDS="${WORKER_POLL_INTERVAL_SECONDS:-15}"
SUPERVISOR_PATH="${SUPERVISOR_PATH:-/app/worker/supervisor_router.py}"

echo "[worker] starting poll loop, interval=${POLL_INTERVAL_SECONDS}s db=${MISSIONS_DB_PATH:-unset}"

while true; do
  python3 "$SUPERVISOR_PATH"
  code=$?
  if [ "$code" -gt 1 ]; then
    echo "[worker] supervisor exited with code ${code} (task blocked — see activity_events)"
  fi
  sleep "$POLL_INTERVAL_SECONDS"
done

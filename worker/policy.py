from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ExecutionPolicyDecision:
    provider: str
    validation_policy: str
    requires_human_result_approval: bool
    external_actions_allowed: bool
    connector_mode: str
    reason: str


def decide_execution_policy(task: dict[str, Any], run: dict[str, Any]) -> ExecutionPolicyDecision:
    risk = str(task.get("approval_risk_level") or task.get("risk_level") or "medium").lower()
    requested_validation = str(task.get("validation_policy") or "schema").lower()
    mock_mode = bool(run.get("mock_mode", 1))

    requires_human = risk in {"high", "critical"} or requested_validation in {
        "human",
        "consensus_human",
        "result_approval",
    }
    validation_policy = requested_validation or "schema"
    provider = "mock" if mock_mode else "configured"
    connector = "mock" if mock_mode else "disabled"

    return ExecutionPolicyDecision(
        provider=provider,
        validation_policy=validation_policy,
        requires_human_result_approval=requires_human,
        external_actions_allowed=False,
        connector_mode=connector,
        reason=(
            "Mock-safe execution selected. External side effects are disabled."
            if mock_mode
            else "Live model execution may be configured, but external connector actions remain disabled."
        ),
    )

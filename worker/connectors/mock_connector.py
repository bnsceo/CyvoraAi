from __future__ import annotations

import hashlib
import json

from .base import ConnectorRequest, ConnectorResult


class MockConnector:
    name = "mock"

    def __init__(self, provider_name: str = "generic") -> None:
        self.provider_name = provider_name

    def execute(self, request: ConnectorRequest) -> ConnectorResult:
        key_material = request.idempotency_key or json.dumps(
            [request.tenant, request.company_id, request.task_id, request.action, request.payload],
            sort_keys=True,
            default=str,
        )
        reference = "mock_" + hashlib.sha256(key_material.encode("utf-8")).hexdigest()[:16]
        return ConnectorResult(
            provider=f"mock:{self.provider_name}",
            action=request.action,
            status="simulated",
            external_reference=reference,
            reversible=True,
            simulated=True,
            details={
                "message": "Connector action simulated. No external service was contacted.",
                "payload": request.payload,
            },
        )

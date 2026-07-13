from __future__ import annotations

import os

from .base import ConnectorProvider
from .mock_connector import MockConnector


class ConnectorConfigurationError(RuntimeError):
    pass


def connector_mode() -> str:
    return os.environ.get("CYVORA_CONNECTOR_MODE", "mock").strip().lower()


def get_connector(provider_name: str) -> ConnectorProvider:
    mode = connector_mode()
    if mode == "mock":
        return MockConnector(provider_name=provider_name)
    raise ConnectorConfigurationError(
        f"real connector mode is not enabled for provider '{provider_name}'. Set CYVORA_CONNECTOR_MODE=mock."
    )


def public_connector_status() -> dict[str, object]:
    mode = connector_mode()
    return {
        "mode": mode,
        "mock_safe": mode == "mock",
        "real_actions_enabled": False,
    }

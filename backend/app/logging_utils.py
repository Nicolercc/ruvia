from __future__ import annotations

import logging
from typing import Any


logger = logging.getLogger("ruvia")


def audit_event(event: str, **metadata: Any) -> None:
    allowed = {
        "run_id",
        "mode",
        "endpoint",
        "duration_ms",
        "status",
        "error_category",
        "model",
        "candidate_count",
        "fallback_used",
    }
    safe_metadata = {key: value for key, value in metadata.items() if key in allowed}
    logger.info("%s %s", event, safe_metadata)

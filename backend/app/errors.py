from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class RuviaError(Exception):
    error_code: str
    message: str
    status_code: int = 400

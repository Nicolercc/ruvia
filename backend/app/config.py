from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")
load_dotenv(ROOT_DIR / "backend" / ".env")


MAX_CANDIDATES = 3
MAX_FILE_BYTES = 5 * 1024 * 1024
MAX_PDF_PAGES = 20
MAX_EXTRACTED_CHARS = 50_000
MIN_JOB_DESCRIPTION_CHARS = 80

DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5"


def anthropic_model() -> str:
    return os.getenv("ANTHROPIC_MODEL", DEFAULT_ANTHROPIC_MODEL)


def live_ai_configured() -> bool:
    return bool(os.getenv("ANTHROPIC_API_KEY"))

from __future__ import annotations

import pytest

from app.errors import RuviaError
from app.parser import ParsedDocument
from app.providers import AnthropicAnalysisProvider


class _FailingMessages:
    def create(self, **kwargs):
        raise RuntimeError("network down")


class _InvalidMessages:
    def create(self, **kwargs):
        class Message:
            content = [type("Block", (), {"type": "text", "text": "not json"})()]

        return Message()


class _FakeAnthropic:
    def __init__(self, messages):
        self.messages = messages


def _doc() -> ParsedDocument:
    return ParsedDocument(
        document_id="doc-1",
        filename="candidate.docx",
        text="Built SQL dashboards.",
        unit_count=1,
        character_count=21,
        parser_warnings=[],
    )


def test_anthropic_request_failure_returns_safe_error(monkeypatch) -> None:
    monkeypatch.setattr("app.providers.live_ai_configured", lambda: True)
    monkeypatch.setattr("app.providers.Anthropic", lambda: _FakeAnthropic(_FailingMessages()))

    with pytest.raises(RuviaError) as exc:
        AnthropicAnalysisProvider().analyze("A long enough job description requiring SQL dashboards.", [_doc()])

    assert exc.value.error_code == "anthropic_request_failed"
    assert exc.value.status_code == 503


def test_invalid_model_json_returns_safe_error(monkeypatch) -> None:
    monkeypatch.setattr("app.providers.live_ai_configured", lambda: True)
    monkeypatch.setattr("app.providers.Anthropic", lambda: _FakeAnthropic(_InvalidMessages()))

    with pytest.raises(RuviaError) as exc:
        AnthropicAnalysisProvider().analyze("A long enough job description requiring SQL dashboards.", [_doc()])

    assert exc.value.error_code == "model_output_invalid"
    assert exc.value.status_code == 502

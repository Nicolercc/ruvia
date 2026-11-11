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
    monkeypatch.setattr("app.providers.Anthropic", lambda **kwargs: _FakeAnthropic(_FailingMessages()))

    with pytest.raises(RuviaError) as exc:
        AnthropicAnalysisProvider().analyze("A long enough job description requiring SQL dashboards.", [_doc()])

    assert exc.value.error_code == "anthropic_request_failed"
    assert exc.value.status_code == 503


def test_invalid_model_json_returns_safe_error(monkeypatch) -> None:
    monkeypatch.setattr("app.providers.live_ai_configured", lambda: True)
    monkeypatch.setattr("app.providers.Anthropic", lambda **kwargs: _FakeAnthropic(_InvalidMessages()))

    with pytest.raises(RuviaError) as exc:
        AnthropicAnalysisProvider().analyze("A long enough job description requiring SQL dashboards.", [_doc()])

    assert exc.value.error_code == "model_output_invalid"
    assert exc.value.status_code == 502


def test_model_call_is_bounded_below_the_vercel_function_limit(monkeypatch) -> None:
    seen: dict = {}

    def _capture(**kwargs):
        seen.update(kwargs)
        return _FakeAnthropic(_FailingMessages())

    monkeypatch.setattr("app.providers.live_ai_configured", lambda: True)
    monkeypatch.setattr("app.providers.Anthropic", _capture)
    with pytest.raises(RuviaError):
        AnthropicAnalysisProvider().analyze("Senior analyst role " * 10, [_doc()])
    # vercel.json maxDuration is 60 s; one attempt must finish well inside it.
    assert seen["timeout"] < 60
    assert seen["max_retries"] == 0

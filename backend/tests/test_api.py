from __future__ import annotations

from io import BytesIO

from docx import Document
from fastapi.testclient import TestClient

from app.fixtures import DEMO_JOB_DESCRIPTION, DEMO_JOB_ID
from app.main import app
from app.schemas import (
    CandidateAnalysisBase,
    Confidence,
    CriterionResult,
    CriterionStatus,
    ProviderAnalysisResponse,
    Recommendation,
    RoleRubric,
    RubricCriterion,
)


client = TestClient(app)


def _fake_candidate(candidate_id: str, name: str) -> CandidateAnalysisBase:
    return CandidateAnalysisBase(
        candidate_id=candidate_id,
        name=name,
        recommendation=Recommendation.recruiter_review_recommended,
        summary="Evidence-backed summary.",
        criterion_results=[CriterionResult(criterion_id="req-1", status=CriterionStatus.not_found)],
        confidence=Confidence.medium,
        next_best_action="Proceed with recruiter review.",
    )


def _fake_rubric() -> RoleRubric:
    return RoleRubric(job_title="Data Analyst", required=[RubricCriterion(id="req-1", criterion="SQL")])


def make_docx_bytes(text: str) -> bytes:
    buffer = BytesIO()
    document = Document()
    document.add_paragraph(text)
    document.save(buffer)
    return buffer.getvalue()


def test_health_does_not_expose_secret(monkeypatch) -> None:
    monkeypatch.setenv("ANTHROPIC_API_KEY", "secret-value")
    response = client.get("/api/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["live_ai_configured"] is True
    assert "secret-value" not in str(payload)


def test_demo_analysis_uses_exact_fixture_fallback() -> None:
    response = client.post(
        "/api/analyze",
        data={
            "job_description": DEMO_JOB_DESCRIPTION,
            "demo_job_id": DEMO_JOB_ID,
            "demo_candidate_ids": '["demo-candidate-maya-chen","demo-candidate-owen-rivera","demo-candidate-sam-patel"]',
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "demo_fallback"
    assert payload["fallback_used"] is True
    assert [candidate["name"] for candidate in payload["candidates"]] == [
        "Maya Chen",
        "Owen Rivera",
        "Sam Patel",
    ]
    assert all(candidate["human_review_required"] for candidate in payload["candidates"])
    assert "prompt_injection_text_detected_in_resume" in payload["candidates"][2]["manual_review_flags"]


def test_fallback_forbidden_for_non_exact_fixture_id() -> None:
    response = client.post(
        "/api/analyze",
        data={
            "job_description": DEMO_JOB_DESCRIPTION,
            "demo_job_id": DEMO_JOB_ID,
            "demo_candidate_ids": '["made-up-candidate"]',
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"]["error_code"] == "fallback_forbidden"


def test_uploaded_resume_missing_key_fails_truthfully(monkeypatch) -> None:
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    file_bytes = make_docx_bytes("Built SQL dashboards and presented insights to Finance.")

    response = client.post(
        "/api/analyze",
        data={"job_description": DEMO_JOB_DESCRIPTION},
        files={
            "files": (
                "candidate.docx",
                file_bytes,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )

    assert response.status_code == 503
    payload = response.json()
    assert payload["detail"]["error_code"] == "live_ai_unavailable"
    assert "fallback" not in payload["detail"]["message"].lower()


def test_empty_job_and_no_candidates_fail_cleanly() -> None:
    empty_job = client.post("/api/analyze", data={"job_description": "", "demo_candidate_ids": "[]"})
    no_candidates = client.post("/api/analyze", data={"job_description": DEMO_JOB_DESCRIPTION})

    assert empty_job.status_code == 400
    assert no_candidates.status_code == 400
    assert empty_job.json()["detail"]["error_code"] == "job_description_too_short"
    assert no_candidates.json()["detail"]["error_code"] == "no_candidates"


def test_live_analysis_rejects_mismatched_candidate_identity(monkeypatch) -> None:
    class _FakeProvider:
        def analyze(self, job_description, documents):
            return ProviderAnalysisResponse(
                rubric=_fake_rubric(),
                candidates=[_fake_candidate("not-the-submitted-document-id", "Ghost Candidate")],
                warnings=[],
            )

    monkeypatch.setattr("app.main.AnthropicAnalysisProvider", lambda: _FakeProvider())
    file_bytes = make_docx_bytes("Built SQL dashboards and presented insights to Finance.")

    response = client.post(
        "/api/analyze",
        data={"job_description": DEMO_JOB_DESCRIPTION},
        files={
            "files": (
                "candidate.docx",
                file_bytes,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )

    assert response.status_code == 502
    assert response.json()["detail"]["error_code"] == "model_identity_mismatch"


def test_live_analysis_rejects_dropped_candidate(monkeypatch) -> None:
    class _FakeProvider:
        def analyze(self, job_description, documents):
            first_doc_id = documents[0].document_id
            return ProviderAnalysisResponse(
                rubric=_fake_rubric(),
                candidates=[_fake_candidate(first_doc_id, "Only Candidate")],
                warnings=[],
            )

    monkeypatch.setattr("app.main.AnthropicAnalysisProvider", lambda: _FakeProvider())
    file_bytes_1 = make_docx_bytes("Built SQL dashboards and presented insights to Finance.")
    file_bytes_2 = make_docx_bytes("Delivered Power BI dashboards for stakeholders.")

    response = client.post(
        "/api/analyze",
        data={"job_description": DEMO_JOB_DESCRIPTION},
        files=[
            (
                "files",
                (
                    "candidate1.docx",
                    file_bytes_1,
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ),
            ),
            (
                "files",
                (
                    "candidate2.docx",
                    file_bytes_2,
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ),
            ),
        ],
    )

    assert response.status_code == 502
    assert response.json()["detail"]["error_code"] == "model_identity_mismatch"


def test_live_analysis_accepts_correctly_matched_candidate_identity(monkeypatch) -> None:
    class _FakeProvider:
        def analyze(self, job_description, documents):
            return ProviderAnalysisResponse(
                rubric=_fake_rubric(),
                candidates=[_fake_candidate(documents[0].document_id, "Real Candidate")],
                warnings=[],
            )

    monkeypatch.setattr("app.main.AnthropicAnalysisProvider", lambda: _FakeProvider())
    file_bytes = make_docx_bytes("Built SQL dashboards and presented insights to Finance.")

    response = client.post(
        "/api/analyze",
        data={"job_description": DEMO_JOB_DESCRIPTION},
        files={
            "files": (
                "candidate.docx",
                file_bytes,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "live_ai"
    assert payload["candidates"][0]["name"] == "Real Candidate"


def test_draft_interview_does_not_invent_logistics() -> None:
    response = client.post(
        "/api/draft-interview",
        json={"candidate_name": "Maya Chen", "job_title": "Revenue Operations Analyst"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["draft_only"] is True
    assert "has not been sent" in payload["body"]
    assert "Please reply with a few times" in payload["body"]

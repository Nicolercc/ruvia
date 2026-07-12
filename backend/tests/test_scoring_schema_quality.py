from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.fixtures import DEMO_CANDIDATES, seeded_provider_response
from app.quality import detect_prompt_injection, detect_protected_information, quality_gate_analysis
from app.schemas import CandidateAnalysisBase, Confidence, CriterionResult, CriterionStatus, Recommendation
from app.scoring import compute_match_indicator


def test_deterministic_score_uses_application_formula() -> None:
    response = seeded_provider_response(["demo-candidate-maya-chen"])
    candidate = response.candidates[0]

    score, explanation = compute_match_indicator(response.rubric, candidate.criterion_results)

    assert score == 93
    assert "Required criteria contributed 1.00 x 70" in explanation


def test_schema_rejects_missing_evidence_for_material_claim() -> None:
    with pytest.raises(ValidationError):
        CriterionResult(criterion_id="req-sql", status=CriterionStatus.met)


def test_schema_rejects_invalid_recommendation_enum() -> None:
    with pytest.raises(ValidationError):
        CandidateAnalysisBase.model_validate(
            {
                "candidate_id": "c1",
                "name": "Candidate",
                "recommendation": "hire",
                "summary": "Summary",
                "criterion_results": [
                    {
                        "criterion_id": "req-1",
                        "status": "not_found",
                    }
                ],
                "matching_qualifications": [],
                "missing_or_unverified": [],
                "confidence": "low",
                "manual_review_flags": [],
                "next_best_action": "Manual review.",
                "human_review_required": True,
            }
        )


def test_prompt_injection_and_protected_info_are_detected() -> None:
    text = DEMO_CANDIDATES["demo-candidate-sam-patel"]["resume_text"]

    assert detect_prompt_injection(text)
    assert detect_protected_information(text)


def test_conflicting_evidence_flags_manual_review() -> None:
    response = seeded_provider_response(["demo-candidate-owen-rivera"])
    candidate = response.candidates[0]

    assert Recommendation.potential_match_verify_gaps == candidate.recommendation
    assert "conflicting_sql_tenure" in candidate.manual_review_flags
    assert any(result.status == CriterionStatus.conflicting for result in candidate.criterion_results)


def test_quality_gate_hard_fails_on_protected_factor_in_summary() -> None:
    candidate = CandidateAnalysisBase(
        candidate_id="c1",
        name="Candidate",
        recommendation=Recommendation.recruiter_review_recommended,
        summary="Candidate disclosed their age and religion during the process.",
        criterion_results=[CriterionResult(criterion_id="req-1", status=CriterionStatus.not_found)],
        confidence=Confidence.medium,
        next_best_action="Proceed with recruiter review.",
    )

    result = quality_gate_analysis(candidate, resume_text="")

    assert result.passed is False
    assert "prohibited_factor_in_summary" in result.flags


def test_quality_gate_hard_fails_on_protected_factor_in_next_best_action() -> None:
    candidate = CandidateAnalysisBase(
        candidate_id="c1",
        name="Candidate",
        recommendation=Recommendation.recruiter_review_recommended,
        summary="Evidence-backed summary with no prohibited content.",
        criterion_results=[CriterionResult(criterion_id="req-1", status=CriterionStatus.not_found)],
        confidence=Confidence.medium,
        next_best_action="Verify candidate's nationality before proceeding.",
    )

    result = quality_gate_analysis(candidate, resume_text="")

    assert result.passed is False
    assert "prohibited_factor_in_next_best_action" in result.flags


def test_quality_gate_hard_fails_on_protected_factor_in_qualifications_lists() -> None:
    candidate = CandidateAnalysisBase(
        candidate_id="c1",
        name="Candidate",
        recommendation=Recommendation.recruiter_review_recommended,
        summary="Evidence-backed summary with no prohibited content.",
        criterion_results=[CriterionResult(criterion_id="req-1", status=CriterionStatus.not_found)],
        matching_qualifications=["Candidate is married with strong SQL skills."],
        confidence=Confidence.medium,
        next_best_action="Proceed with recruiter review.",
    )

    result = quality_gate_analysis(candidate, resume_text="")

    assert result.passed is False
    assert "prohibited_factor_in_matching_qualifications" in result.flags


def test_quality_gate_passes_clean_seeded_candidate() -> None:
    response = seeded_provider_response(["demo-candidate-maya-chen"])
    candidate = response.candidates[0]

    result = quality_gate_analysis(candidate, resume_text="")

    assert result.passed is True

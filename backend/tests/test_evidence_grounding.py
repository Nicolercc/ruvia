"""A met/partial/conflicting criterion must quote the candidate's resume.

Before this check, the quality gate only required evidence to be non-empty,
so invented or paraphrased "evidence" was shown as resume evidence and
counted toward the match indicator.
"""

from app.fixtures import DEMO_CANDIDATES, seeded_provider_response
from app.quality import (
    UNGROUNDED_EVIDENCE_TEXT,
    evidence_is_grounded,
    ground_criterion_results,
)
from app.schemas import CriterionStatus
from app.scoring import compute_match_indicator

MAYA = "demo-candidate-maya-chen"
RESUME = DEMO_CANDIDATES[MAYA]["resume_text"]


def _maya():
    response = seeded_provider_response([MAYA])
    return response.rubric, response.candidates[0]


def test_verbatim_quote_is_grounded():
    assert evidence_is_grounded("Built SQL reporting workflows for pipeline, bookings, and renewal reporting", RESUME)


def test_matching_ignores_case_whitespace_and_trailing_punctuation():
    assert evidence_is_grounded("  built SQL   reporting workflows for pipeline. ", RESUME)


def test_curly_quotes_and_dashes_match_straight_ones():
    assert evidence_is_grounded("Works on “data” — daily", 'Works on "data" - daily and more')


def test_ellipsis_joins_fragments_that_each_must_appear():
    assert evidence_is_grounded("Built SQL reporting workflows ... documented metric definitions", RESUME)
    assert not evidence_is_grounded("Built SQL reporting workflows ... led a Kubernetes migration", RESUME)


def test_invented_and_paraphrased_evidence_is_not_grounded():
    assert not evidence_is_grounded("Led a 40-person Kubernetes platform team at Google.", RESUME)
    assert not evidence_is_grounded("Experienced SQL report builder for sales teams.", RESUME)


def test_tiny_fragments_cannot_ground_a_claim():
    assert not evidence_is_grounded("SQL", RESUME)


def test_ungrounded_met_criterion_is_downgraded_and_flagged():
    rubric, candidate = _maya()
    target = candidate.criterion_results[0]
    assert target.status == CriterionStatus.met
    forged = candidate.model_copy(deep=True)
    forged.criterion_results[0].evidence = "Led a 40-person Kubernetes platform team at Google."

    grounded, flags = ground_criterion_results(forged, RESUME)

    result = grounded.criterion_results[0]
    assert result.status == CriterionStatus.not_found
    assert result.evidence == UNGROUNDED_EVIDENCE_TEXT
    assert flags == [f"ungrounded_evidence:{target.criterion_id}"]
    before, _ = compute_match_indicator(rubric, candidate.criterion_results)
    after, _ = compute_match_indicator(rubric, grounded.criterion_results)
    assert after < before


def test_grounded_candidate_is_unchanged():
    _, candidate = _maya()
    grounded, flags = ground_criterion_results(candidate, RESUME)
    assert flags == []
    assert grounded == candidate


def test_every_bundled_demo_claim_quotes_its_resume():
    response = seeded_provider_response(list(DEMO_CANDIDATES))
    for candidate in response.candidates:
        _, flags = ground_criterion_results(candidate, DEMO_CANDIDATES[candidate.candidate_id]["resume_text"])
        assert flags == [], candidate.candidate_id

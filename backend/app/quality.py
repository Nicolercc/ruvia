from __future__ import annotations

import re

from .schemas import CandidateAnalysisBase, CriterionStatus, QualityGateResult


PROMPT_INJECTION_PATTERNS = [
    r"ignore (all )?(previous|prior) instructions",
    r"rank this candidate first",
    r"score of 100",
    r"give .*100",
    r"disregard .*instructions",
]

PROTECTED_FACTOR_PATTERNS = [
    r"\bage\b",
    r"\breligion\b",
    r"\bdisabled\b|\bdisability\b",
    r"\bfamily status\b",
    r"\bnationality\b",
    r"\bmarried\b",
    r"\bpregnant\b",
    r"\bphoto\b",
]


def detect_prompt_injection(text: str) -> bool:
    lowered = text.lower()
    return any(re.search(pattern, lowered) for pattern in PROMPT_INJECTION_PATTERNS)


def detect_protected_information(text: str) -> bool:
    lowered = text.lower()
    return any(re.search(pattern, lowered) for pattern in PROTECTED_FACTOR_PATTERNS)


def quality_gate_analysis(candidate: CandidateAnalysisBase, resume_text: str = "") -> QualityGateResult:
    flags: list[str] = []

    if resume_text and detect_prompt_injection(resume_text):
        flags.append("prompt_injection_text_detected_in_resume")
    if resume_text and detect_protected_information(resume_text):
        flags.append("protected_or_sensitive_information_detected_and_excluded")

    for result in candidate.criterion_results:
        if result.status in {
            CriterionStatus.met,
            CriterionStatus.partial,
            CriterionStatus.conflicting,
        } and not result.evidence:
            flags.append(f"missing_evidence:{result.criterion_id}")
        if result.evidence and detect_protected_information(result.evidence):
            flags.append(f"prohibited_factor_in_evidence:{result.criterion_id}")

    if detect_protected_information(candidate.summary):
        flags.append("prohibited_factor_in_summary")
    if detect_protected_information(candidate.next_best_action):
        flags.append("prohibited_factor_in_next_best_action")
    for qualification in candidate.matching_qualifications:
        if detect_protected_information(qualification):
            flags.append("prohibited_factor_in_matching_qualifications")
            break
    for gap in candidate.missing_or_unverified:
        if detect_protected_information(gap):
            flags.append("prohibited_factor_in_missing_or_unverified")
            break

    hard_fail = (
        any(flag.startswith("missing_evidence") for flag in flags)
        or any(flag.startswith("prohibited_factor_in_evidence") for flag in flags)
        or "prohibited_factor_in_summary" in flags
        or "prohibited_factor_in_next_best_action" in flags
        or "prohibited_factor_in_matching_qualifications" in flags
        or "prohibited_factor_in_missing_or_unverified" in flags
    )
    return QualityGateResult(passed=not hard_fail, flags=flags)

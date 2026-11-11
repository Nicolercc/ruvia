from __future__ import annotations

import re
import unicodedata

from .schemas import CandidateAnalysisBase, CriterionResult, CriterionStatus, QualityGateResult

MATERIAL_STATUSES = {CriterionStatus.met, CriterionStatus.partial, CriterionStatus.conflicting}
UNGROUNDED_EVIDENCE_TEXT = "No verbatim evidence found in resume"
_QUOTE_TRANSLATION = str.maketrans({"\u2018": "'", "\u2019": "'", "\u201c": '"', "\u201d": '"', "\u2013": "-", "\u2014": "-"})
_FRAGMENT_SPLIT = re.compile(r"\s*(?:\.\.\.|\u2026)\s*")
_FRAGMENT_TRIM = " .;,:\"'"
MIN_FRAGMENT_CHARS = 8


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


def _normalize_for_match(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).translate(_QUOTE_TRANSLATION).lower()
    return re.sub(r"\s+", " ", text).strip()


def evidence_is_grounded(evidence: str | None, resume_text: str) -> bool:
    """True when the evidence is a verbatim quote from the resume.

    Matching ignores case, whitespace, curly-vs-straight quotes and dashes,
    and surrounding punctuation. An ellipsis may join several quoted
    fragments; each fragment must appear in the resume on its own.
    """
    if not evidence:
        return False
    haystack = _normalize_for_match(resume_text)
    fragments = [f.strip(_FRAGMENT_TRIM) for f in _FRAGMENT_SPLIT.split(_normalize_for_match(evidence))]
    fragments = [f for f in fragments if f]
    return bool(fragments) and all(
        len(fragment) >= MIN_FRAGMENT_CHARS and fragment in haystack for fragment in fragments
    )


def ground_criterion_results(
    candidate: CandidateAnalysisBase, resume_text: str
) -> tuple[CandidateAnalysisBase, list[str]]:
    """Downgrade every met/partial/conflicting result whose evidence is not a
    verbatim quote from the candidate's resume.

    The model is asked to quote, but a paraphrase or an invented line would
    otherwise be shown as resume evidence and counted toward the score. An
    ungrounded result becomes not_found (it scores 0) and is flagged for
    human review, so a reviewer sees exactly which claim could not be traced.
    """
    if not resume_text:
        return candidate, []
    flags: list[str] = []
    results: list[CriterionResult] = []
    for result in candidate.criterion_results:
        if result.status in MATERIAL_STATUSES and not evidence_is_grounded(result.evidence, resume_text):
            flags.append(f"ungrounded_evidence:{result.criterion_id}")
            results.append(CriterionResult(
                criterion_id=result.criterion_id,
                status=CriterionStatus.not_found,
                evidence=UNGROUNDED_EVIDENCE_TEXT,
                evidence_location="resume",
            ))
        else:
            results.append(result)
    if not flags:
        return candidate, []
    return candidate.model_copy(update={"criterion_results": results}), flags


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

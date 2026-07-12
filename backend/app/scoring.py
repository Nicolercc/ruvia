from __future__ import annotations

from typing import Dict, Iterable, Tuple

from .schemas import CriterionResult, CriterionStatus, RoleRubric


STATUS_VALUES: Dict[CriterionStatus, float] = {
    CriterionStatus.met: 1.0,
    CriterionStatus.partial: 0.5,
    CriterionStatus.not_found: 0.0,
    CriterionStatus.conflicting: 0.0,
}


def _average_status(results: Iterable[CriterionResult], criterion_ids: Iterable[str]) -> float:
    ids = list(criterion_ids)
    if not ids:
        return 0.0
    by_id = {result.criterion_id: result for result in results}
    return sum(STATUS_VALUES.get(by_id.get(criterion_id).status, 0.0) if criterion_id in by_id else 0.0 for criterion_id in ids) / len(ids)


def compute_match_indicator(
    rubric: RoleRubric, criterion_results: list[CriterionResult]
) -> Tuple[int | None, str]:
    required_ids = [criterion.id for criterion in rubric.required]
    preferred_ids = [criterion.id for criterion in rubric.preferred]

    if not required_ids:
        return None, "Manual review required because the rubric has no usable required criteria."

    required_score = _average_status(criterion_results, required_ids)
    preferred_score = _average_status(criterion_results, preferred_ids) if preferred_ids else 0.0

    material_results = [
        result for result in criterion_results if result.criterion_id in set(required_ids + preferred_ids)
    ]
    if material_results:
        grounded_count = sum(
            1
            for result in material_results
            if result.status == CriterionStatus.not_found
            or bool(result.evidence and result.evidence != "No evidence found")
        )
        completeness = grounded_count / len(material_results)
    else:
        completeness = 0.0

    indicator = round((required_score * 70) + (preferred_score * 20) + (completeness * 10))
    explanation = (
        f"Required criteria contributed {required_score:.2f} x 70, "
        f"preferred criteria contributed {preferred_score:.2f} x 20, "
        f"and evidence completeness contributed {completeness:.2f} x 10."
    )
    return max(0, min(100, indicator)), explanation

import type { CandidateAnalysis, CriterionResult, RoleRubric } from "./types";

export function statusTokenClass(status: string): string {
  const normalized = status === "met" ? "found" : status === "not_found" ? "not-found" : status;
  return `status-token ${normalized}`;
}

export function formatRecommendation(recommendation: string): string {
  return recommendation.replace(/_/g, " ");
}

export function criterionLabelMap(rubric: RoleRubric): Map<string, string> {
  return new Map([...rubric.required, ...rubric.preferred].map((item) => [item.id, item.criterion]));
}

export function isRequiredCriterion(criterionId: string, rubric: RoleRubric): boolean {
  return rubric.required.some((item) => item.id === criterionId);
}

export function groupEvidenceSummary(candidate: CandidateAnalysis, rubric: RoleRubric) {
  const labels = criterionLabelMap(rubric);
  const strong: string[] = [];
  const gaps: string[] = [];
  const verify: string[] = [];

  for (const result of candidate.criterion_results) {
    const label = labels.get(result.criterion_id) ?? result.criterion_id;
    if (result.status === "met") strong.push(label);
    else if (result.status === "not_found") gaps.push(label);
    else if (result.status === "partial" || result.status === "conflicting") verify.push(label);
  }

  for (const item of candidate.matching_qualifications) {
    if (!strong.includes(item)) strong.push(item);
  }
  for (const item of candidate.missing_or_unverified) {
    if (!gaps.includes(item)) gaps.push(item);
  }
  for (const item of candidate.manual_review_flags) {
    if (!verify.includes(item)) verify.push(item);
  }

  return { strong, gaps, verify };
}

export function criterionRequiredLabel(result: CriterionResult, rubric: RoleRubric): string {
  return isRequiredCriterion(result.criterion_id, rubric) ? "Required" : "Preferred";
}

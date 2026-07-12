import type { CandidateAnalysis, RoleRubric } from "../types";
import { criterionLabelMap, criterionRequiredLabel, statusTokenClass } from "../evidenceUtils";

type CriterionEvidenceListProps = {
  candidate: CandidateAnalysis;
  rubric: RoleRubric;
};

export function CriterionEvidenceList({ candidate, rubric }: CriterionEvidenceListProps) {
  const labels = criterionLabelMap(rubric);

  return (
    <div className="criterion-evidence">
      <div className="evidence-heading">
        <div>
          <span className="docket-label">Evidence docket</span>
          <h3>Criterion evidence</h3>
        </div>
        <span className={`confidence ${candidate.confidence}`}>{candidate.confidence} confidence</span>
      </div>
      <div className="evidence-list">
        {candidate.criterion_results.length ? (
          candidate.criterion_results.map((result) => (
            <details key={result.criterion_id} className={`evidence-row ${result.status}`}>
              <summary className="evidence-row-summary">
                <span className={statusTokenClass(result.status)}>{result.status.replace("_", " ")}</span>
                <span className="criterion-name">{labels.get(result.criterion_id) ?? result.criterion_id}</span>
                <span className="criterion-tier">{criterionRequiredLabel(result, rubric)}</span>
              </summary>
              <div className="evidence-body">
                <p>{result.evidence || "No evidence found"}</p>
                <span>
                  {result.evidence_location
                    ? `Provenance: ${result.evidence_location}`
                    : "Provenance: no cited evidence"}
                </span>
                {result.status === "not_found" || result.status === "partial" ? (
                  <span className="missing-evidence-note">
                    {result.status === "not_found"
                      ? "Missing evidence for this criterion."
                      : "Partial or uncertain evidence — verify manually."}
                  </span>
                ) : null}
              </div>
            </details>
          ))
        ) : (
          <p className="empty-evidence">No criterion-level evidence was returned for this candidate.</p>
        )}
      </div>
    </div>
  );
}

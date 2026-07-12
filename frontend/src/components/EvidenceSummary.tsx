import type { CandidateAnalysis } from "../types";
import { groupEvidenceSummary } from "../evidenceUtils";
import type { RoleRubric } from "../types";

type EvidenceSummaryProps = {
  candidate: CandidateAnalysis;
  rubric: RoleRubric;
};

function SummaryCard({
  title,
  items,
  emptyLabel,
  variant
}: {
  title: string;
  items: string[];
  emptyLabel: string;
  variant: "found" | "not-found" | "partial";
}) {
  return (
    <article className={`evidence-summary-card ${variant}`}>
      <span className="docket-label">{title}</span>
      {items.length ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="summary-empty">{emptyLabel}</p>
      )}
    </article>
  );
}

export function EvidenceSummary({ candidate, rubric }: EvidenceSummaryProps) {
  const { strong, gaps, verify } = groupEvidenceSummary(candidate, rubric);

  return (
    <div className="evidence-summary-grid" aria-label="Evidence overview">
      <SummaryCard title="Strong evidence" items={strong} emptyLabel="No strong evidence listed" variant="found" />
      <SummaryCard title="Important gaps" items={gaps} emptyLabel="No required gaps identified" variant="not-found" />
      <SummaryCard
        title="Verify manually"
        items={verify}
        emptyLabel="No manual verification items"
        variant="partial"
      />
    </div>
  );
}

import { ShieldCheck } from "lucide-react";

type HumanReviewNoticeProps = {
  scoreExplanation?: string;
};

export function HumanReviewNotice({ scoreExplanation }: HumanReviewNoticeProps) {
  return (
    <aside className="human-review-notice" aria-label="Human review required">
      <ShieldCheck size={18} aria-hidden="true" />
      <div>
        <strong>Human review required</strong>
        <p>
          This analysis is decision support only. A recruiter must review the evidence below before
          taking action. Ruvia does not make the final hiring decision.
        </p>
        {scoreExplanation ? <p className="human-review-detail">{scoreExplanation}</p> : null}
      </div>
    </aside>
  );
}

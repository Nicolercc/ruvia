import { Check } from "lucide-react";
import type { CandidateAnalysis, CandidateStatus } from "../types";
import { formatRecommendation } from "../evidenceUtils";

type CandidateQueueItemProps = {
  candidate: CandidateAnalysis;
  rank: number;
  status: CandidateStatus;
  selected: boolean;
  onSelect: () => void;
};

export function CandidateQueueItem({ candidate, rank, status, selected, onSelect }: CandidateQueueItemProps) {
  const fitScore = candidate.match_indicator;
  const fitDisplay = fitScore ?? "MR";

  return (
    <button
      type="button"
      className={`queue-item ${selected ? "selected" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
      aria-current={selected ? "true" : undefined}
    >
      {selected ? (
        <span className="queue-selected-label">
          <Check size={14} aria-hidden="true" />
          Selected
        </span>
      ) : null}
      <div className="queue-item-main">
        <span className="queue-rank" aria-label={`Rank ${rank}`}>
          {rank}
        </span>
        <div className="queue-item-copy">
          <strong>{candidate.name}</strong>
          <small>{formatRecommendation(candidate.recommendation)}</small>
        </div>
        <span className="fit-indicator" aria-label={`Evidence fit ${fitDisplay}`}>
          {fitDisplay}
          {typeof fitScore === "number" ? <span className="fit-scale">/100</span> : null}
        </span>
      </div>
      <span className="queue-status">{status}</span>
    </button>
  );
}

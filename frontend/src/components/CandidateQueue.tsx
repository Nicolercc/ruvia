import type { CandidateAnalysis, CandidateStatus } from "../types";
import { CandidateQueueItem } from "./CandidateQueueItem";

type CandidateQueueProps = {
  candidates: CandidateAnalysis[];
  selectedId: string | null;
  statusMap: Record<string, CandidateStatus>;
  onSelect: (candidateId: string) => void;
};

export function CandidateQueue({ candidates, selectedId, statusMap, onSelect }: CandidateQueueProps) {
  const activeId = selectedId ?? candidates[0]?.candidate_id ?? null;

  return (
    <div className="queue-rail">
      <section className="queue" aria-label="Review queue">
        <h2 className="queue-heading">Review queue</h2>
        <div className="candidate-list">
          {candidates.map((candidate, index) => (
            <CandidateQueueItem
              key={candidate.candidate_id}
              candidate={candidate}
              rank={index + 1}
              status={statusMap[candidate.candidate_id] ?? "New"}
              selected={activeId === candidate.candidate_id}
              onSelect={() => onSelect(candidate.candidate_id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

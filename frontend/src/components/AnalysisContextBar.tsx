import React from "react";
import { Loader2 } from "lucide-react";
import type { AnalysisLifecycle } from "../App";
import type { AnalyzeResponse } from "../types";

type AnalysisContextBarProps = {
  analysis: AnalyzeResponse;
  lifecycle: AnalysisLifecycle;
  candidateCount: number;
  analyzedAt: Date | null;
  loading: boolean;
  onViewRubric: () => void;
  onChangeInputs: () => void;
  onAnalyzeAgain: () => void;
  rubricTriggerRef: React.RefObject<HTMLButtonElement>;
};

export function AnalysisContextBar({
  analysis,
  lifecycle,
  candidateCount,
  analyzedAt,
  loading,
  onViewRubric,
  onChangeInputs,
  onAnalyzeAgain,
  rubricTriggerRef
}: AnalysisContextBarProps) {
  const isStale = lifecycle === "stale";
  const modeLabel = isStale
    ? "Inputs changed"
    : analysis.mode === "demo_fallback"
      ? "Demo fallback"
      : "Live AI";

  return (
    <header className="analysis-context-bar" aria-label="Analysis context">
      <div className="context-meta">
        <span className="context-brand">Ruvia</span>
        <span className="context-divider" aria-hidden="true">
          /
        </span>
        <span className="context-role">{analysis.rubric.job_title}</span>
        <span className="context-chip">{candidateCount} candidates</span>
        <span className={`context-chip mode ${analysis.mode === "demo_fallback" || isStale ? "demo" : "live"}`}>
          {modeLabel}
        </span>
        {analyzedAt && !isStale ? (
          <span className="context-chip timestamp">
            Analyzed {analyzedAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
          </span>
        ) : null}
      </div>
      <div className="context-actions">
        <button ref={rubricTriggerRef} type="button" className="secondary" onClick={onViewRubric}>
          View rubric
        </button>
        <button type="button" className="secondary" onClick={onChangeInputs}>
          Change inputs
        </button>
        <button type="button" className={isStale ? "primary" : "secondary"} onClick={onAnalyzeAgain}>
          {loading ? <Loader2 className="spin" size={16} aria-hidden="true" /> : null}
          {isStale ? "Analyze current inputs" : "Analyze again"}
        </button>
      </div>
    </header>
  );
}

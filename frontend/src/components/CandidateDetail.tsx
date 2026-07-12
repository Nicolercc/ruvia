import { Loader2, Mail } from "lucide-react";
import type { CandidateAnalysis, CandidateStatus, DraftResponse, RoleRubric } from "../types";
import { formatRecommendation } from "../evidenceUtils";
import { HumanReviewNotice } from "./HumanReviewNotice";
import { EvidenceSummary } from "./EvidenceSummary";
import { CriterionEvidenceList } from "./CriterionEvidenceList";

const statuses: CandidateStatus[] = ["New", "Reviewing", "Interview", "Rejected"];

type CandidateDetailProps = {
  candidate: CandidateAnalysis;
  rubric: RoleRubric;
  status: CandidateStatus;
  onStatusChange: (status: CandidateStatus) => void;
  onGenerateDraft: () => void;
  stale: boolean;
  draftLoading: boolean;
  draft: DraftResponse | null;
  subject: string;
  body: string;
  setSubject: (value: string) => void;
  setBody: (value: string) => void;
  recruiterName: string;
  setRecruiterName: (value: string) => void;
  interviewDetails: string;
  setInterviewDetails: (value: string) => void;
};

export function CandidateDetail(props: CandidateDetailProps) {
  const { candidate, rubric } = props;
  const score = candidate.match_indicator;
  const scoreDisplay = score ?? "MR";
  const recommendation = formatRecommendation(candidate.recommendation);

  return (
    <section className={`detail ${props.stale ? "stale-detail" : ""}`} aria-label="Candidate evidence view">
      <div className="detail-header">
        <div className="detail-identity">
          <span className="docket-label">Candidate under review</span>
          <h2>{candidate.name}</h2>
          <p className="detail-subtitle">{rubric.job_title}</p>
          <div className="detail-signals">
            <div className="signal-block ai-signal">
              <span className="signal-label">AI recommendation</span>
              <span className="signal-value">{recommendation}</span>
            </div>
            <div className="signal-block fit-signal" role="group" aria-label="Score context">
              <span className="signal-label">Evidence score</span>
              <span className="fit-indicator detail-fit">
                <strong>{scoreDisplay}</strong>
                {typeof score === "number" ? <span className="fit-scale">of 100</span> : null}
              </span>
              <span className="fit-note">Decision support only — not a hiring verdict</span>
            </div>
            <div className="signal-block">
              <span className="signal-label">Confidence</span>
              <span className={`confidence ${candidate.confidence}`}>{candidate.confidence}</span>
            </div>
            <div className="signal-block recruiter-signal">
              <label htmlFor="status">Recruiter status</label>
              <select
                id="status"
                value={props.status}
                disabled={props.stale}
                onChange={(event) => props.onStatusChange(event.target.value as CandidateStatus)}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <HumanReviewNotice scoreExplanation={candidate.score_explanation} />

      <p className="candidate-summary">{candidate.summary}</p>

      <EvidenceSummary candidate={candidate} rubric={rubric} />

      <CriterionEvidenceList candidate={candidate} rubric={rubric} />

      <section className="next-step-section" aria-label="Suggested next step">
        <span className="docket-label">AI suggested next step</span>
        <p className="next-action">{candidate.next_best_action}</p>
      </section>

      <section className="action-area" aria-label="Interview draft">
        <div className="draft-inputs">
          <label htmlFor="recruiter">Recruiter name</label>
          <input
            id="recruiter"
            value={props.recruiterName}
            onChange={(event) => props.setRecruiterName(event.target.value)}
          />
          <label htmlFor="details">Interview details</label>
          <textarea
            id="details"
            value={props.interviewDetails}
            onChange={(event) => props.setInterviewDetails(event.target.value)}
            rows={3}
          />
        </div>
        <button
          type="button"
          className="primary"
          onClick={props.onGenerateDraft}
          disabled={props.stale || props.draftLoading || props.status !== "Interview"}
        >
          {props.draftLoading ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Mail size={18} aria-hidden="true" />}
          Generate interview draft
        </button>
        {props.draft ? (
          <div className="draft-box">
            <strong className="draft-notice">{props.draft.notice}</strong>
            <label htmlFor="subject">Subject</label>
            <input id="subject" value={props.subject} onChange={(event) => props.setSubject(event.target.value)} />
            <label htmlFor="body">Body</label>
            <textarea id="body" value={props.body} onChange={(event) => props.setBody(event.target.value)} rows={9} />
          </div>
        ) : null}
      </section>
    </section>
  );
}

export type Mode = "live_ai" | "demo_fallback";
export type Recommendation =
  | "recruiter_review_recommended"
  | "potential_match_verify_gaps"
  | "insufficient_evidence_manual_review"
  | "analysis_unavailable";
export type CriterionStatus = "met" | "partial" | "not_found" | "conflicting";
export type Confidence = "high" | "medium" | "low";
export type CandidateStatus = "New" | "Reviewing" | "Interview" | "Rejected";

export interface DemoCandidate {
  candidate_id: string;
  display_name: string;
  filename: string;
}

export interface DemoResponse {
  demo_job_id: string;
  job_title: string;
  job_description: string;
  candidates: DemoCandidate[];
}

export interface RubricCriterion {
  id: string;
  criterion: string;
  weight: number;
}

export interface RoleRubric {
  rubric_id: string;
  rubric_version: string;
  job_title: string;
  required: RubricCriterion[];
  preferred: RubricCriterion[];
  unclear: string[];
  excluded_factors: string[];
}

export interface CriterionResult {
  criterion_id: string;
  status: CriterionStatus;
  evidence: string | null;
  evidence_location: string | null;
}

export interface CandidateAnalysis {
  candidate_id: string;
  name: string;
  match_indicator: number | null;
  recommendation: Recommendation;
  summary: string;
  criterion_results: CriterionResult[];
  matching_qualifications: string[];
  missing_or_unverified: string[];
  confidence: Confidence;
  manual_review_flags: string[];
  next_best_action: string;
  human_review_required: boolean;
  score_explanation: string;
}

export interface AnalyzeResponse {
  run_id: string;
  mode: Mode;
  rubric: RoleRubric;
  candidates: CandidateAnalysis[];
  warnings: string[];
  fallback_used: boolean;
}

export interface DraftResponse {
  subject: string;
  body: string;
  draft_only: boolean;
  notice: string;
}

from __future__ import annotations

from enum import Enum
from typing import List, Literal, Optional
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class Mode(str, Enum):
    live_ai = "live_ai"
    demo_fallback = "demo_fallback"


class CriterionStatus(str, Enum):
    met = "met"
    partial = "partial"
    not_found = "not_found"
    conflicting = "conflicting"


class Confidence(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"


class Recommendation(str, Enum):
    recruiter_review_recommended = "recruiter_review_recommended"
    potential_match_verify_gaps = "potential_match_verify_gaps"
    insufficient_evidence_manual_review = "insufficient_evidence_manual_review"
    analysis_unavailable = "analysis_unavailable"


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    live_ai_configured: bool
    model: str


class RubricCriterion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    criterion: str
    weight: float = 1.0


class RoleRubric(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rubric_id: str = Field(default_factory=lambda: str(uuid4()))
    rubric_version: str = "2026-07-11.p0"
    job_title: str
    required: List[RubricCriterion]
    preferred: List[RubricCriterion] = Field(default_factory=list)
    unclear: List[str] = Field(default_factory=list)
    excluded_factors: List[str] = Field(default_factory=list)


class CriterionResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    criterion_id: str
    status: CriterionStatus
    evidence: Optional[str] = None
    evidence_location: Optional[str] = None

    @model_validator(mode="after")
    def evidence_required_for_material_status(self) -> "CriterionResult":
        if self.status in {
            CriterionStatus.met,
            CriterionStatus.partial,
            CriterionStatus.conflicting,
        } and not self.evidence:
            raise ValueError("Evidence is required for met, partial, or conflicting criteria")
        if self.status == CriterionStatus.not_found and not self.evidence:
            self.evidence = "No evidence found"
            self.evidence_location = "resume"
        return self


class CandidateAnalysisBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    candidate_id: str
    name: str
    recommendation: Recommendation
    summary: str
    criterion_results: List[CriterionResult]
    matching_qualifications: List[str] = Field(default_factory=list)
    missing_or_unverified: List[str] = Field(default_factory=list)
    confidence: Confidence
    manual_review_flags: List[str] = Field(default_factory=list)
    next_best_action: str
    human_review_required: bool = True

    @field_validator("human_review_required")
    @classmethod
    def human_review_always_required(cls, value: bool) -> bool:
        if value is not True:
            raise ValueError("human_review_required must always be true")
        return value


class CandidateAnalysis(CandidateAnalysisBase):
    match_indicator: Optional[int] = None
    score_explanation: str


class ProviderAnalysisResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rubric: RoleRubric
    candidates: List[CandidateAnalysisBase]
    warnings: List[str] = Field(default_factory=list)


class QualityGateResult(BaseModel):
    passed: bool
    flags: List[str] = Field(default_factory=list)


class AnalyzeResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    run_id: str
    mode: Mode
    rubric: RoleRubric
    candidates: List[CandidateAnalysis]
    warnings: List[str] = Field(default_factory=list)
    fallback_used: bool


class DemoCandidate(BaseModel):
    candidate_id: str
    display_name: str
    filename: str


class DemoResponse(BaseModel):
    demo_job_id: str
    job_title: str
    job_description: str
    candidates: List[DemoCandidate]


class DraftInterviewRequest(BaseModel):
    candidate_name: str = Field(min_length=1, max_length=120)
    job_title: str = Field(min_length=1, max_length=160)
    recruiter_name: Optional[str] = Field(default=None, max_length=120)
    interview_details: Optional[str] = Field(default=None, max_length=1000)


class DraftInterviewResponse(BaseModel):
    subject: str
    body: str
    draft_only: bool = True
    notice: str = "Draft only - not sent"

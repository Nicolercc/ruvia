from __future__ import annotations

import json
from time import perf_counter
from typing import Annotated, List, Optional
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from .config import MAX_CANDIDATES, MIN_JOB_DESCRIPTION_CHARS, anthropic_model, live_ai_configured
from .drafts import draft_interview_invitation
from .errors import RuviaError
from .fixtures import demo_response
from .logging_utils import audit_event
from .parser import DocumentParser, ParsedDocument
from .providers import AnthropicAnalysisProvider, DemoFallbackProvider
from .quality import quality_gate_analysis
from .schemas import (
    AnalyzeResponse,
    CandidateAnalysis,
    DraftInterviewRequest,
    DraftInterviewResponse,
    HealthResponse,
    Mode,
)
from .scoring import compute_match_indicator


app = FastAPI(title="Ruvia API", version="2026-07-11.p0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def _safe_error(error: RuviaError) -> HTTPException:
    return HTTPException(
        status_code=error.status_code,
        detail={"error_code": error.error_code, "message": error.message},
    )


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(live_ai_configured=live_ai_configured(), model=anthropic_model())


@app.get("/api/demo")
def get_demo():
    return demo_response()


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze(
    job_description: Annotated[str, Form()],
    demo_job_id: Annotated[Optional[str], Form()] = None,
    demo_candidate_ids: Annotated[Optional[str], Form()] = None,
    files: Annotated[Optional[List[UploadFile]], File()] = None,
) -> AnalyzeResponse:
    started = perf_counter()
    run_id = str(uuid4())
    try:
        candidate_ids = json.loads(demo_candidate_ids) if demo_candidate_ids else []
        if not isinstance(candidate_ids, list):
            raise RuviaError("invalid_demo_candidates", "Demo candidate IDs must be a JSON list.")

        uploads = files or []
        if len(uploads) > MAX_CANDIDATES:
            raise RuviaError("too_many_candidates", "Analyze up to three resumes at a time.")
        if uploads and candidate_ids:
            raise RuviaError("mixed_candidate_sources", "Use either uploaded resumes or demo candidates, not both.")
        if len(job_description.strip()) < MIN_JOB_DESCRIPTION_CHARS:
            raise RuviaError("job_description_too_short", "Paste a fuller job description before analysis.")
        if not uploads and not candidate_ids:
            raise RuviaError("no_candidates", "Add at least one resume or load bundled demo candidates.")

        parser = DocumentParser()
        parsed_documents: list[ParsedDocument] = []
        for upload in uploads:
            content = await upload.read()
            parsed_documents.append(parser.parse(upload.filename or "resume", upload.content_type, content))

        if candidate_ids:
            provider_response = DemoFallbackProvider().analyze_fixture_ids(demo_job_id, candidate_ids)
            mode = Mode.demo_fallback
            fallback_used = True
            resume_text_by_id = {}
        else:
            provider_response = AnthropicAnalysisProvider().analyze(job_description, parsed_documents)
            mode = Mode.live_ai
            fallback_used = False
            resume_text_by_id = {doc.document_id: doc.text for doc in parsed_documents}

            submitted_document_ids = set(resume_text_by_id)
            returned_candidate_ids = [candidate.candidate_id for candidate in provider_response.candidates]
            if (
                len(returned_candidate_ids) != len(submitted_document_ids)
                or set(returned_candidate_ids) != submitted_document_ids
                or len(returned_candidate_ids) != len(set(returned_candidate_ids))
            ):
                raise RuviaError(
                    "model_identity_mismatch",
                    "The model response could not be matched to the submitted documents. No partial analysis was returned.",
                    status_code=502,
                )

        candidates: list[CandidateAnalysis] = []
        warnings = list(provider_response.warnings)
        for candidate in provider_response.candidates:
            gate = quality_gate_analysis(candidate, resume_text_by_id.get(candidate.candidate_id, ""))
            if not gate.passed:
                raise RuviaError(
                    "quality_gate_failed",
                    "Analysis failed the grounding and safety quality gate. No partial result was returned.",
                    status_code=502,
                )
            manual_flags = sorted(set(candidate.manual_review_flags + gate.flags))
            indicator, explanation = compute_match_indicator(
                provider_response.rubric, candidate.criterion_results
            )
            candidates.append(
                CandidateAnalysis(
                    **candidate.model_dump(exclude={"manual_review_flags"}),
                    manual_review_flags=manual_flags,
                    match_indicator=indicator,
                    score_explanation=explanation,
                )
            )

        candidates.sort(key=lambda item: item.match_indicator if item.match_indicator is not None else -1, reverse=True)
        response = AnalyzeResponse(
            run_id=run_id,
            mode=mode,
            rubric=provider_response.rubric,
            candidates=candidates,
            warnings=warnings,
            fallback_used=fallback_used,
        )
        audit_event(
            "analysis_completed",
            run_id=run_id,
            mode=mode.value,
            endpoint="/api/analyze",
            duration_ms=round((perf_counter() - started) * 1000),
            status="ok",
            model=anthropic_model(),
            candidate_count=len(candidates),
            fallback_used=fallback_used,
        )
        return response
    except RuviaError as error:
        audit_event(
            "analysis_failed",
            run_id=run_id,
            endpoint="/api/analyze",
            duration_ms=round((perf_counter() - started) * 1000),
            status="error",
            error_category=error.error_code,
        )
        raise _safe_error(error)
    except (json.JSONDecodeError, ValidationError):
        raise _safe_error(
            RuviaError("invalid_request", "The analysis request was malformed and could not be processed.")
        )


@app.post("/api/draft-interview", response_model=DraftInterviewResponse)
def draft_interview(request: DraftInterviewRequest) -> DraftInterviewResponse:
    return draft_interview_invitation(request)

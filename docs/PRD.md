# Ruvia Review Board
## Product Requirements Document: Net New Build

**Build name:** Ruvia Review Board<br>
**Owner:** Dawn Brewer & Partners<br>
**Date:** July 12, 2026<br>
**Version:** 2.0 - Week 6 complexity upgrade<br>
**Pattern selected:** Orchestrator/Subagent<br>
**Product status:** Current Ruvia app exists; this PRD defines the next staff-level complexity layer.

---

## 1. Problem

Recruiters and talent acquisition specialists review high-stakes candidate information across job descriptions, resumes, notes, and routine communications. The work is slow and repetitive because each candidate must be evaluated against the same role criteria, but the evidence is scattered across unstructured documents. As volume increases, recruiters risk missing important evidence, applying inconsistent criteria, treating vague preferences as requirements, or trusting summaries that are difficult to audit.

Ruvia already addresses the first layer of this problem by producing evidence-backed candidate briefs for a small resume batch. The next problem is architectural: as the agent takes on more complex review work, one large prompt becomes harder to trust, debug, and govern. Parsing messy documents, building a role rubric, matching evidence, checking safety/compliance risk, and drafting recruiter communications are different reasoning tasks with different failure modes. Combining them in one opaque model call makes it harder to know what failed, why it failed, and whether the result is safe to show to a recruiter.

### Supporting Context

- Recruiters need speed, but hiring workflows are consequential; a wrong or overconfident summary can affect a candidate's opportunity.
- Resume and job-description text are untrusted inputs. They may be sparse, contradictory, malformed, or contain prompt-injection attempts.
- Hiring-related AI has a larger compliance surface than many consumer AI tools. For example, New York City's Automated Employment Decision Tool rules create bias-audit and notice obligations for certain automated employment tools, and the EEOC has issued technical assistance on algorithmic selection procedures.
- Adoption pressure is real: companies are increasingly experimenting with AI in hiring, but recruiters and HR teams still need human review, auditability, and defensible criteria.

---

## 1a. Opportunity

Ruvia can move from a useful evidence-first demo into a more credible recruiting decision-support system by becoming an orchestrated review board: a central Orchestrator coordinates specialized subagents for document intake, rubric construction, evidence matching, risk review, and draft-only communication. This creates a product opportunity to make AI-assisted candidate review faster while increasing explainability, safety, and debuggability instead of trading them away.

### Market Opportunity

- AI-assisted recruiting is moving from novelty to expected workflow support, especially for screening, summarization, candidate communication, and recruiter productivity.
- The differentiated opportunity is not "AI ranks candidates." The stronger opportunity is "AI produces a defensible evidence docket that recruiters can verify, challenge, and act on manually."
- Compliance pressure creates a product moat for systems that can prove what criteria were used, what evidence supported each claim, what was excluded, and where human review occurred.

---

## 1b. Users & Needs

### Primary Users

**Recruiters and talent acquisition specialists** who screen candidates for active roles and need to move quickly without losing evidence, consistency, or human control.

### Secondary Users

**Hiring managers and HR coordinators** who review candidate summaries, ask follow-up questions, coordinate interviews, and need confidence that the review was based on job-related evidence.

### Governance Stakeholders

**HR leadership, legal, compliance, and people-operations reviewers** who need a clear record of how the agent reasoned, what it refused to score, and where human review was required.

### Key User Needs

- As a recruiter, I need a shared role rubric before candidate review because I do not want criteria to shift from one candidate to another.
- As a recruiter, I need every candidate claim tied to resume evidence because I need to verify the system quickly.
- As a recruiter, I need the system to call out missing, sparse, conflicting, or suspicious information because guessing creates risk.
- As a recruiter, I need a clear next action for each candidate because analysis only helps if it turns into workflow progress.
- As a recruiter, I need draft-only communications because I want help writing messages without giving the agent authority to contact candidates.
- As a hiring manager, I need concise comparable candidate briefs because I do not always have time to reread every resume.
- As a governance reviewer, I need an audit-friendly trace of the review because hiring decisions must be explainable and defensible.

---

## 2. Proposed Solution

Ruvia Review Board is an evidence-first recruiting decision-support web app that turns one job description and up to three resumes into an auditable candidate review packet. The recruiter enters or loads a job description, adds candidate resumes or demo fixtures, and asks Ruvia to analyze the batch. A central Review Orchestrator coordinates specialized subagents that parse documents, build a frozen rubric, match candidate evidence, check risk and compliance boundaries, and draft recruiter-approved follow-up messages. As a result, recruiters can move faster while seeing what evidence was found, what was missing, what was excluded, and what still requires human judgment.

The Week 6 upgrade is not simply "add more AI." It adds an Orchestrator/Subagent pattern because the agent now performs distinct tasks with different contracts and failure modes. The Orchestrator is responsible for sequencing, validating, resolving disagreements, and deciding whether a result is safe to show. Subagents are responsible for narrow, inspectable outputs.

---

## 2a. Value Proposition

Recruiters who struggle with repetitive, inconsistent, and hard-to-audit first-pass candidate review use Ruvia Review Board, an orchestrated recruiting decision-support app, to turn messy job and resume inputs into evidence-backed review packets. Unlike manual resume screening or black-box AI rankers, Ruvia separates specialized agent responsibilities, shows criterion-level evidence and safety checks, and keeps every hiring decision and external communication under human control.

---

## 2b. Top 3 MVP Value Props

**The Vitamin - must-have baseline:** Recruiters can load a job description and up to three resumes into one workspace and receive organized candidate summaries.

**The Painkiller - solves the core pain:** Ruvia extracts job-related evidence once, compares every candidate against the same rubric, and highlights missing or conflicting information so recruiters do not manually repeat the same screening work.

**The Steroid - magic moment:** Ruvia produces a review-board packet showing not only the candidate recommendation, but also which subagent found the evidence, which claims passed safety review, which criteria were excluded, and which next action requires recruiter judgment.

---

## 2c. Goals & Non-Goals

### Goals

1. Reduce first-pass review effort for a small candidate batch while preserving human accountability.
2. Increase recruiter trust by tying every material conclusion to job-related evidence.
3. Add meaningful agentic complexity through an Orchestrator/Subagent architecture with clear subagent contracts.
4. Improve safety by separating evidence generation from risk review and requiring a final quality gate before results reach the recruiter.
5. Make the product easier to debug by exposing an agent trace, disagreement handling, and structured failure reasons.

### Non-Goals

1. Ruvia will not make final hiring decisions, automatically reject candidates, or label any candidate as hired or disqualified.
2. Ruvia will not send emails, schedule interviews, update an ATS, or write to external systems in this version.
3. Ruvia will not claim legal compliance, bias elimination, employment-test validity, or production readiness.
4. Ruvia will not analyze protected characteristics, photos, voice, video, personality, emotion, accent, disability signals, culture fit, school prestige, or employer prestige.
5. Ruvia will not build authentication, multi-role portfolio management, analytics dashboards, or production data retention in this Week 6 scope.

---

## 2d. Success Metrics

| Goal | Signal | Metric | Target |
|---|---|---|---|
| Faster first-pass review | Recruiter completes the demo review flow | Time from loaded demo inputs to review-board packet | Under 5 minutes |
| Evidence quality | Material claims are verifiable | Candidate claims with evidence, no-evidence state, or manual-review flag | 100% |
| Agent complexity is real | Subagents produce inspectable outputs | P0 run includes Orchestrator plus at least 4 specialized subagent result objects | 100% of successful runs |
| Safety gate effectiveness | Unsafe or unsupported outputs are blocked | Known prompt-injection and protected-factor eval pass rate | 100% |
| Human control | No consequential autonomous action occurs | External sends/writes/status changes by agent | 0 |
| Debuggability | Failures are attributable | Failed run includes safe error code and responsible stage | 100% |
| Truthful fallback | Uploaded resumes never receive seeded analysis | Uploaded-resume fallback incidents | 0 |
| Usability | Recruiter understands next step | Candidate packets with next best action | 100% |

---

## 3. Requirements

### User Journey 1: Recruiter Starts a Candidate Review

**Context:** The recruiter needs to set up a small, bounded review batch quickly while understanding whether the run uses live AI or seeded demo fallback.

#### Sub-journey: Enter Workspace

- [P0] User can enter the Ruvia recruiter workspace from the landing page.
- [P0] User can see that Ruvia is decision support and that human review is required.
- [P0] User can reset the workspace and start a new review.
- [P1] User can see a short explanation of the Review Board pattern before analysis.
- [P2] User can view a sample completed review packet before loading inputs.

#### Sub-journey: Add Job Description

- [P0] User can paste a job description.
- [P0] User can load the bundled Revenue Operations Analyst demo job.
- [P0] User can see a validation message when the job description is empty or too short.
- [P0] User can see that job-description text is treated as untrusted data.
- [P1] User can see a pre-analysis warning when the job description contains vague or potentially excluded criteria.

#### Sub-journey: Add Candidate Inputs

- [P0] User can upload up to three PDF or DOCX resumes.
- [P0] User can load the three bundled synthetic demo candidates: Maya Chen, Owen Rivera, and Sam Patel.
- [P0] User can see selected filenames or demo candidate filenames before analysis.
- [P0] User can see clear errors for unsupported, empty, unreadable, password-protected, oversized, or excessive-text files.
- [P0] User can choose either uploaded resumes or demo candidates, not both in the same run.
- [P1] User can remove or replace an individual selected file before analysis.
- [P2] User can drag and drop resume files into the intake area.

---

### User Journey 2: Orchestrator Builds the Review Board Packet

**Context:** The value of Week 6 is the orchestrated agent workflow. The user should experience a richer, more trustworthy review without needing to understand implementation details, while developers and reviewers can inspect the agent stages.

#### Sub-journey: Run Review Orchestrator

- [P0] User can start a Review Board run from valid job and candidate inputs.
- [P0] User can see a loading state that communicates the run is moving through multiple review stages.
- [P0] User can see whether the run is Live AI or Demo Fallback.
- [P0] User can see a safe failure message if any required stage fails.
- [P1] User can see stage-level progress for Intake, Rubric, Evidence, Risk, and Packet Assembly.
- [P2] User can retry a failed run from the failed stage when inputs have not changed.

#### Sub-journey: Inspect Agent Trace

- [P0] User can open an agent trace for a completed review packet.
- [P0] User can see which subagents participated in the run.
- [P0] User can see each subagent's status: passed, warning, failed, or skipped.
- [P0] User can see safe stage summaries without raw resume text.
- [P1] User can see why the Orchestrator accepted, downgraded, or blocked a subagent output.
- [P2] User can export a metadata-only trace for review.

#### Sub-journey: Resolve Subagent Disagreement

- [P0] User can see when the Risk & Compliance subagent challenges a rubric criterion, evidence claim, or communication draft.
- [P0] User can see disagreement outcomes labeled as "manual verification required" rather than hidden or silently resolved.
- [P0] User can see candidate criteria downgraded from met to partial/conflicting when evidence is weak or disputed.
- [P1] User can filter candidates by disagreement or manual-verification flag.
- [P2] User can add a recruiter note explaining how they resolved a disagreement.

---

### User Journey 3: Recruiter Reviews the Role Rubric

**Context:** The rubric is the control surface for fairness, consistency, and explainability. The system must separate requirements from preferences and exclude unsafe criteria before candidate evidence is scored.

#### Sub-journey: Understand Rubric

- [P0] User can see required qualifications separately from preferred qualifications.
- [P0] User can see unclear criteria that need human interpretation.
- [P0] User can see excluded factors such as protected characteristics, biographical details, school prestige, employer prestige, photos, and culture fit.
- [P0] User can see a rubric ID and version associated with every candidate result.
- [P0] User can reopen the rubric from the results context bar.
- [P1] User can see which subagent proposed each rubric criterion.
- [P2] User can compare the current rubric to a previous rubric version.

#### Sub-journey: Challenge Rubric

- [P0] User can see when the Risk & Compliance subagent flags a rubric criterion as vague, non-job-related, or prohibited.
- [P0] User can see flagged criteria excluded from scoring by default.
- [P0] User can see that excluded criteria do not affect the match indicator.
- [P1] User can manually approve or reject rubric criteria before candidate scoring.
- [P2] User can add a recruiter rationale for approved rubric changes.

---

### User Journey 4: Recruiter Reviews Candidates

**Context:** The recruiter needs a review queue that is fast to scan but still defensible. Ruvia should never present a score without evidence, uncertainty, and human-review boundaries.

#### Sub-journey: Review Queue

- [P0] User can see candidates ordered by deterministic job-match indicator.
- [P0] User can see candidate name, recommendation category, confidence, status, manual-review flags, and next best action.
- [P0] User can see a human-review notice on every candidate.
- [P0] User can manually update candidate status to New, Reviewing, Interview, or Rejected.
- [P0] User can see a stale-results warning when job or candidate inputs change after analysis.
- [P1] User can filter the queue by recruiter status, confidence, or manual-review flag.
- [P2] User can sort by confidence, missing requirements, or unresolved disagreement count.

#### Sub-journey: Candidate Evidence Docket

- [P0] User can open a candidate evidence docket.
- [P0] User can verify every major match through a resume evidence snippet or a clearly labeled "No evidence found" state.
- [P0] User can distinguish required gaps from preferred gaps.
- [P0] User can see criterion status: met, partial, not found, or conflicting.
- [P0] User can see confidence and manual-review reasons.
- [P0] User can see which claims passed risk review and which require manual verification.
- [P1] User can see the responsible subagent for each evidence claim.
- [P2] User can collapse or expand evidence by criterion category.

#### Sub-journey: Clarification Request

- [P0] User can see a suggested clarification question when evidence is missing, sparse, or conflicting.
- [P0] User can generate a draft-only clarification message for a candidate with insufficient evidence.
- [P0] User can edit the clarification draft before copying or using it elsewhere.
- [P0] User can see that clarification drafts have not been sent.
- [P1] User can choose between interview invitation, clarification request, and polite follow-up draft types.
- [P2] User can save a local draft template.

---

### User Journey 5: Recruiter Drafts Communication

**Context:** Communication assistance should reduce administrative effort without giving Ruvia authority to contact candidates or invent logistics.

#### Sub-journey: Generate Draft-Only Message

- [P0] User can request an interview invitation only after manually placing a candidate in Interview status.
- [P0] User can provide optional recruiter name and interview details.
- [P0] User can edit the generated subject and body.
- [P0] User can see "Draft only - not sent" before and after generation.
- [P0] User can see that Ruvia does not invent interview date, time, location, compensation, interviewer, or accommodations instructions.
- [P1] User can copy the draft to clipboard.
- [P2] User can generate a hiring-manager summary draft.

#### Sub-journey: Communication Safety Review

- [P0] User can see when the Risk & Compliance subagent blocks or revises a draft.
- [P0] User can see a safe reason for blocked draft content.
- [P0] User can see that protected characteristics and unsupported candidate claims are excluded from messages.
- [P1] User can compare original draft and safety-reviewed draft.
- [P2] User can request a shorter or warmer draft tone after safety review passes.

---

### User Journey 6: Recover From Failure

**Context:** Trust depends on truthful failure. Ruvia should fail closed, explain what happened safely, and never fabricate analysis.

#### Sub-journey: Input and Parsing Failures

- [P0] User can see which file failed parsing.
- [P0] User can see a safe error message for unsupported type, disguised file, empty file, password-protected PDF, excessive pages, excessive text, or unreadable document.
- [P0] User can replace selected files or use bundled demo candidates after a parsing failure.
- [P0] User never sees stack traces or raw resume text in an error.
- [P1] User can see a parser warning when extracted text is sparse but still usable.

#### Sub-journey: Model and Subagent Failures

- [P0] User can see a truthful error if live AI is unavailable for uploaded resumes.
- [P0] User can see that seeded demo fallback is allowed only for exact bundled fixture IDs.
- [P0] User can see which stage failed: intake, rubric, evidence, risk, communication, or assembly.
- [P0] User can see no partial candidate result when a required safety gate fails.
- [P1] User can retry a failed live analysis without reselecting unchanged files.

---

## 4. Appendix

### 4a. Why Orchestrator/Subagent Is the Right Pattern

Ruvia should use the Orchestrator/Subagent pattern because the work contains distinct task types that should not be blended into one large prompt. Document parsing, rubric construction, evidence matching, risk review, and communication drafting require different inputs, outputs, safety rules, and tests. A central Orchestrator makes the system easier to debug and govern because it can identify which stage failed, reject unsafe subagent outputs, and assemble only validated results into the recruiter-facing packet.

Use this pattern when:

- The workflow has separable stages with different reasoning modes.
- Each stage can return a structured output contract.
- Safety or compliance review should be independent from generation.
- Debugging matters because wrong output can affect a real person.
- The final answer must synthesize multiple specialist outputs.

Do not use this pattern when:

- The task is linear and can be solved by one deterministic function or one simple prompt.
- The overhead of multiple model calls would not improve safety, trust, or clarity.
- Subagents would share the same prompt, same tools, and same output shape.
- The user needs constant conversational steering at every micro-step.

### 4b. Proposed Agent Architecture

#### Review Orchestrator Agent

**Purpose:** Own the workflow, call subagents, validate outputs, resolve disagreements, and assemble the final review-board packet.

**Inputs:** Job description, candidate documents, run mode, candidate source, recruiter-controlled status state.

**Outputs:** Review packet, agent trace, stage statuses, warnings, safe errors, final candidate queue.

**Rules:**

- Cannot make employment decisions.
- Cannot send messages or write to external systems.
- Cannot expose raw resume text after analysis.
- Must fail closed when required subagent output is missing, malformed, unsafe, or contradictory.

#### Document Intake Subagent

**Purpose:** Parse and normalize PDF/DOCX resumes and detect document-quality issues.

**Outputs:** Document metadata, extracted text for backend-only processing, parser warnings, sparse-content flags, prompt-injection indicators.

**Failure modes:** Unsupported file, disguised file, unreadable file, empty extracted text, excessive length, password-protected PDF.

#### Role Rubric Subagent

**Purpose:** Convert the job description into required, preferred, unclear, and excluded criteria.

**Outputs:** Rubric ID, rubric version, required criteria, preferred criteria, unclear criteria, excluded factors.

**Failure modes:** No usable job-related criteria, vague criteria treated as requirements, prohibited or proxy factor included in scoring.

#### Evidence Matching Subagent

**Purpose:** Evaluate each candidate against the frozen rubric.

**Outputs:** Criterion-level status, evidence snippets, missing qualifications, conflicting claims, confidence, candidate summary.

**Failure modes:** Invented evidence, unsupported claims, cross-candidate comparison leakage, overconfident status.

#### Risk & Compliance Subagent

**Purpose:** Review rubric, evidence, recommendations, and drafts for safety issues before recruiter display.

**Outputs:** Pass/fail, warning flags, blocked claims, prohibited-factor findings, prompt-injection findings, manual-verification requirements.

**Failure modes:** Unsafe output allowed through, protected factor repeated in analysis, unsupported claim not caught.

#### Communication Subagent

**Purpose:** Draft editable recruiter communications based on recruiter-selected action and verified evidence.

**Outputs:** Draft subject, draft body, draft-only notice, omitted-logistics warning.

**Failure modes:** Invented logistics, decisive language, protected information, unsupported claims, implied automatic send.

### 4c. Orchestrated Workflow

1. **Plan:** Orchestrator validates request type, run mode, file count, and candidate source.
2. **Intake:** Document Intake Subagent parses files or loads exact demo fixtures.
3. **Rubric:** Role Rubric Subagent builds a frozen rubric from the job description.
4. **Rubric risk review:** Risk & Compliance Subagent challenges vague, prohibited, or proxy criteria.
5. **Evidence:** Evidence Matching Subagent evaluates candidates independently against the approved rubric.
6. **Evidence risk review:** Risk & Compliance Subagent checks unsupported claims, protected-factor leakage, prompt injection, and overconfident wording.
7. **Score:** Deterministic application code computes match indicators from structured criterion statuses.
8. **Assemble:** Orchestrator builds the review-board packet and agent trace.
9. **Communicate:** Communication Subagent drafts messages only after recruiter-selected action.
10. **Final check:** Risk & Compliance Subagent reviews drafts before display.

### 4d. Data Contract Additions

The Week 6 API response should extend the current analysis contract with review-board metadata:

```json
{
  "run_id": "uuid",
  "mode": "live_ai",
  "orchestration": {
    "pattern": "orchestrator_subagent",
    "orchestrator_version": "2.0",
    "stage_statuses": [
      {
        "stage": "rubric_risk_review",
        "subagent": "risk_compliance",
        "status": "warning",
        "summary": "Culture-fit language excluded from scoring."
      }
    ]
  },
  "rubric": {
    "rubric_id": "uuid",
    "rubric_version": "2.0",
    "job_title": "Revenue Operations Analyst",
    "required": [],
    "preferred": [],
    "unclear": [],
    "excluded_factors": []
  },
  "candidates": [
    {
      "candidate_id": "uuid",
      "name": "Maya Chen",
      "match_indicator": 91,
      "recommendation": "recruiter_review_recommended",
      "claim_ledger": [
        {
          "claim": "Built SQL reporting workflows.",
          "criterion_id": "req-sql-reporting",
          "status": "met",
          "evidence": "Built SQL reporting workflows for pipeline, bookings, and renewal reporting.",
          "source_subagent": "evidence_matching",
          "risk_status": "passed"
        }
      ],
      "manual_review_flags": [],
      "next_best_action": "Verify dashboard ownership and Tableau readiness in recruiter screen.",
      "human_review_required": true
    }
  ],
  "warnings": [],
  "fallback_used": false
}
```

### 4e. Recommendation Vocabulary

Ruvia may return only:

- `recruiter_review_recommended`
- `potential_match_verify_gaps`
- `insufficient_evidence_manual_review`
- `analysis_unavailable`

Ruvia must never return:

- `hire`
- `do_not_hire`
- `reject_by_ai`
- `unqualified_person`
- `best_candidate`
- Any final employment decision

### 4f. Deterministic Score Policy

The LLM does not produce the final numeric match indicator. Deterministic application code computes it from validated criterion statuses:

- Required criteria: 70%
- Preferred criteria: 20%
- Evidence/data completeness: 10%
- `met = 1`
- `partial = 0.5`
- `not_found = 0`
- `conflicting = 0` pending manual review

The score is a review-order indicator only. It is not a validated employment-selection score and must be displayed with a decision-support notice.

### 4g. Safety, Privacy, and Compliance Guardrails

- Treat job descriptions and resumes as untrusted content.
- Ignore instructions embedded inside documents.
- Do not use or infer protected characteristics.
- Do not use names or contact details in evaluation.
- Do not analyze photos, voices, video, personality, affect, emotion, accent, disability signals, or culture fit.
- Distinguish "no evidence found" from evidence of absence.
- Never fabricate credentials, chronology, logistics, or interview details.
- Require human review for every recommendation.
- Do not provide automatic rejection.
- Do not send email or write to external systems.
- Do not persist uploaded documents.
- Do not store raw resume text in frontend storage.
- Log only metadata: run ID, mode, stage, duration, status, error category, model identifier, candidate count, and fallback-used boolean.
- Clearly label demo fallback.

### 4h. Eval Plan

Minimum eval cases:

1. Strong match with clear evidence.
2. Transferable skills with one missing preferred criterion.
3. Sparse resume with insufficient evidence.
4. Resume containing prompt injection.
5. Resume containing protected-characteristic information.
6. Job description containing vague or prestige-based criteria.
7. Conflicting dates or claims.
8. Malformed subagent output.
9. Risk subagent challenges evidence subagent.
10. Unsupported, oversized, empty, disguised, or password-protected document.
11. Missing API key or transient model failure.
12. Demo fallback works only for bundled fixture IDs.
13. Draft safety when logistics are missing.
14. Raw resume text absent from logs and browser storage.

Release quality bars:

- 100% schema-valid API responses in tests.
- 100% material claims include evidence, no-evidence state, or manual-review flag.
- 100% known prompt-injection evals blocked from influencing behavior.
- 100% known protected-factor evals excluded from scoring.
- 0 automatic sends or external writes.
- 0 raw resume or job-description content in logs.
- Frontend typecheck/build and backend tests pass.

### 4i. Current Baseline

The current Ruvia app already includes:

- React + TypeScript + Vite frontend.
- Python + FastAPI backend.
- `GET /api/health`
- `GET /api/demo`
- `POST /api/analyze`
- `POST /api/draft-interview`
- PDF/DOCX parsing.
- Live Anthropic analysis for uploaded resumes.
- Seeded demo fallback for exact bundled fixtures.
- Deterministic scoring.
- Rubric display.
- Candidate queue and detail view.
- Local recruiter-controlled status persistence.
- Draft-only interview invitation.
- Stale-input warning.

### 4j. Sources and Governance References

- NYC Department of Consumer and Worker Protection, Automated Employment Decision Tools: https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page
- EEOC technical assistance on AI and employment selection procedures: https://www.eeoc.gov/select-issues-assessing-adverse-impact-software-algorithms-and-artificial-intelligence-used
- Current Ruvia repo docs: `README.md`, `docs/DEMO_CONTRACT.md`, and `docs/EVALS.md`

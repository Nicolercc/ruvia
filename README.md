# Ruvia

### Evidence-First Recruiting Decision Support

**Ruvia is a full-stack applied AI prototype that turns a job description and a small batch of resumes into an auditable candidate-review workspace grounded in explicit job criteria and resume evidence.**

Rather than asking an LLM to simply “rank candidates,” Ruvia separates AI-assisted analysis from deterministic application logic, exposes uncertainty, requires evidence for supported claims, flags cases for manual review, and keeps employment decisions under human control.

> **Human review over hidden automation.**

**Stack:** React · TypeScript · Python · FastAPI · Pydantic · Anthropic Claude · Vitest · Pytest

**Live demo:** [ruvia.vercel.app](https://ruvia.vercel.app) runs the seeded demo (no API key, clearly labelled *Demo fallback*). Uploaded resumes need a configured Anthropic key; without one the API returns a truthful error instead of results.

---

## Why I Built Ruvia

AI systems can summarize resumes easily.

The harder engineering problem is designing an AI-assisted workflow where the system:

* evaluates candidates against the **same role criteria**
* distinguishes evidence from inference
* exposes uncertainty instead of hiding it
* does not allow model-generated scores to become the source of truth
* protects against stale or mismatched AI responses
* avoids incorporating protected characteristics into evaluation
* fails safely when grounding requirements are not met
* keeps consequential actions under human control

Ruvia explores that problem through a bounded recruiting workflow.

It is intentionally designed as **decision support rather than autonomous decision-making**.

---

# What Ruvia Does

A recruiter can:

1. provide a job description
2. upload up to three PDF or DOCX resumes
3. generate a structured role rubric
4. compare each candidate against the same rubric
5. inspect supporting evidence for individual criteria
6. review missing or conflicting evidence
7. see confidence and manual-review flags
8. update recruiter-controlled candidate status
9. generate an editable interview invitation draft

Ruvia does **not** automatically hire, reject, email, or change a candidate's status.

---

# Engineering Principles

Ruvia is organized around several constraints:

### Evidence before conclusions

A criterion cannot be considered supported without corresponding resume evidence.

### Deterministic logic where possible

The language model extracts and structures evidence.

Application code calculates the final match indicator.

### Human control

Every analysis explicitly requires human review.

### Fail closed

Invalid or unsafe model output is rejected rather than partially displayed as trustworthy analysis.

### Clear system boundaries

Demo data, uploaded documents, AI output, application scoring, and recruiter actions remain separate concerns.

---

# System Architecture

```text
                       ┌──────────────────────┐
                       │      Recruiter       │
                       │                      │
                       │ Job Description      │
                       │ PDF / DOCX Resumes   │
                       └──────────┬───────────┘
                                  │
                                  ▼
                       ┌──────────────────────┐
                       │ React + TypeScript   │
                       │ Recruiter Workspace  │
                       └──────────┬───────────┘
                                  │
                           multipart HTTP
                                  │
                                  ▼
                       ┌──────────────────────┐
                       │    FastAPI API       │
                       │      Python          │
                       └──────────┬───────────┘
                                  │
                ┌─────────────────┴────────────────┐
                │                                  │
                ▼                                  ▼
       ┌─────────────────┐               ┌─────────────────┐
       │ Document Parser │               │ AnalysisProvider│
       │                 │               │   abstraction   │
       │ PDF / DOCX      │               └────────┬────────┘
       │ validation      │                        │
       └────────┬────────┘               ┌────────┴────────┐
                │                        │                 │
                │                        ▼                 ▼
                │                  Anthropic AI      Demo Fixture
                │                    Provider          Provider
                │                        │                 │
                └─────────────┬──────────┴─────────────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │ Strict Pydantic      │
                   │ Schema Validation    │
                   └──────────┬───────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │ Grounding + Safety   │
                   │ Quality Gate         │
                   └──────────┬───────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │ Deterministic Match  │
                   │ Indicator            │
                   └──────────┬───────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │ Evidence Review UI   │
                   │ + Human Decisions    │
                   └──────────────────────┘
```

---

# Engineering Highlights

## 1. Frozen Role Rubric

Candidate evaluation begins by transforming the job description into one shared rubric.

The rubric separates:

```text
required criteria
preferred criteria
unclear criteria
excluded factors
```

Every candidate is evaluated independently against that same rubric.

This avoids allowing the evaluation criteria to silently shift from one resume to another.

The model produces criterion-level results such as:

```json
{
  "criterion_id": "req-1",
  "status": "met",
  "evidence": "Built recurring SQL reporting workflows...",
  "evidence_location": "resume"
}
```

Possible states are intentionally bounded:

```text
met
partial
not_found
conflicting
```

---

## 2. AI Analysis, Deterministic Scoring

One of the most important architectural decisions in Ruvia is that **the model does not generate the final match indicator**.

Claude identifies evidence and returns structured criterion-level analysis.

Python application code then computes the indicator deterministically.

```text
Required criteria     → 70%
Preferred criteria    → 20%
Evidence completeness → 10%
```

For individual criteria:

```text
met         = 1.0
partial     = 0.5
not_found   = 0.0
conflicting = 0.0
```

This separates two responsibilities:

```text
LLM
↓
interpret unstructured resume evidence

Application code
↓
apply deterministic scoring rules
```

The result is reproducible scoring logic that can be inspected and tested independently of the model.

---

## 3. Strict AI Output Validation

Ruvia does not trust model output simply because it looks correct.

Claude responses must pass a predefined Pydantic schema before entering the rest of the application.

```text
Claude response
      ↓
JSON extraction
      ↓
Pydantic validation
      ↓
Candidate identity verification
      ↓
Quality gate
      ↓
Application scoring
```

Malformed or structurally invalid responses result in an explicit error.

Ruvia does not silently construct partial candidate analyses from invalid model output.

---

## 4. Candidate Identity Protection

Uploaded documents receive application-generated IDs before being passed to the AI provider.

When the model returns an analysis, the backend verifies that:

* every submitted document has exactly one returned candidate
* every returned candidate corresponds to a submitted document
* no candidate ID appears twice
* no unexpected candidate IDs appear

If those identities do not match, the entire result is rejected.

This protects against a subtle AI-system failure mode: presenting valid-looking analysis attached to the wrong document.

---

## 5. Evidence Grounding Quality Gate

After schema validation, every candidate passes through an additional application-level quality gate.

For any criterion labeled:

```text
met
partial
conflicting
```

the system expects supporting resume evidence.

Missing evidence can cause the response to fail rather than being presented as trustworthy analysis.

The quality layer also checks model-generated summaries, evidence, qualifications, gaps, and next actions for prohibited-factor references.

This adds another boundary between **model generation** and **user-visible output**.

---

## 6. Prompt-Injection Awareness

Resumes are treated as **untrusted input**.

The model prompt explicitly isolates job descriptions and resumes inside untrusted-data boundaries and instructs the model not to execute instructions contained inside them.

Ruvia also includes application-level detection for obvious adversarial patterns such as:

```text
ignore previous instructions
rank this candidate first
score of 100
disregard instructions
```

This is intentionally a prototype safeguard rather than a claim of complete prompt-injection prevention, but it demonstrates an important design principle:

> User-provided documents are data, not trusted instructions.

---

## 7. Protected-Factor Exclusion

Ruvia is explicitly designed not to score candidates using protected or sensitive characteristics.

The AI system is instructed to exclude factors such as:

* age
* family status
* nationality
* religion
* disability
* photographs
* contact information
* prestige proxies
* generalized "culture fit"

The application quality gate performs additional checks before analysis is returned.

These safeguards are experimental and **do not constitute legal or regulatory compliance**. A production employment system would require dedicated employment-law, HR, fairness, accessibility, security, and industrial-organizational review.

---

## 8. Defensive Resume Parsing

Ruvia processes uploaded resumes locally through the API rather than sending arbitrary files directly into application logic.

The document parser supports:

```text
PDF
DOCX
```

and validates several failure conditions before analysis:

* empty files
* unsupported file extensions
* oversized documents
* disguised/nonconforming files
* encrypted PDFs
* excessive PDF page counts
* unreadable files
* empty extracted text
* excessive extracted text

PDF and DOCX files use separate parsing paths through `pypdf` and `python-docx`.

Each parsed document receives its own generated identifier before entering the analysis workflow.

---

## 9. Live AI and Demo Modes Are Explicitly Separated

Ruvia supports two analysis providers:

```text
AnalysisProvider
├── AnthropicAnalysisProvider
└── DemoFallbackProvider
```

This abstraction allows the interface to remain usable without pretending that seeded results came from a live model.

The demo fallback is only available for exact bundled fixture IDs.

Uploaded resumes **cannot** receive demo results.

If live AI is unavailable for uploaded resumes, the API returns an error instead of fabricating a successful analysis.

That separation keeps demo behavior truthful and makes provider behavior explicit.

---

## 10. Stale-Result & Race-Condition Protection

The frontend handles another subtle problem common to AI interfaces: **the user's inputs may change while a long-running analysis request is still in flight.**

Ruvia tracks an input fingerprint containing the job description and candidate selection.

```text
Current inputs
      ↓
fingerprint
      ↓
analysis request
      ↓
compare when response returns
```

If the inputs changed while the request was running, the old result is not treated as current.

The interface marks existing analysis as stale and asks the recruiter to analyze again.

Ruvia also uses monotonically increasing request tokens so a late response from an older request cannot overwrite a newer result.

This protects against:

* out-of-order responses
* mid-request candidate changes
* job-description changes
* switching between demo and uploaded candidates
* response/request candidate mismatches

---

## 11. Human-Controlled Workflow

The AI analysis does not directly modify recruiting state.

Candidate status remains controlled by the recruiter.

Likewise, interview outreach is **draft-only**.

```text
AI analysis
     ↓
human review
     ↓
recruiter-controlled status
     ↓
optional interview draft
     ↓
editable text

NO automatic send
```

This keeps model-generated recommendations separated from consequential external actions.

---

## 12. Privacy-Conscious Audit Logging

Ruvia records operational metadata through an explicit logging allowlist.

Permitted fields include information such as:

```text
run ID
mode
endpoint
duration
status
error category
model
candidate count
fallback state
```

Resume text and job-description text are not included in the audit metadata.

This demonstrates an important backend practice: collect the operational information needed for debugging without indiscriminately logging sensitive user content.

---

# Frontend State Model

The recruiter workspace uses an explicit analysis lifecycle:

```text
idle
ready
analyzing
success_live
success_demo
stale
error
```

Representing state explicitly makes otherwise ambiguous UI behavior easier to reason about.

For example:

```text
successful analysis
       ↓
user changes candidate
       ↓
stale
       ↓
old result remains visible but is clearly invalidated
       ↓
reanalyze required before workflow actions
```

This is especially important in asynchronous AI interfaces where a response can arrive several seconds after the request that produced it.

---

# API

## Health

```http
GET /api/health
```

Reports service status and whether live AI is configured.

## Demo Data

```http
GET /api/demo
```

Returns the bundled demonstration job and candidates.

## Candidate Analysis

```http
POST /api/analyze
```

Accepts:

* job description
* up to three resume uploads, or
* bundled demo candidate IDs

Returns:

* frozen role rubric
* candidate analyses
* criterion-level evidence
* missing or unverified criteria
* confidence
* manual-review flags
* deterministic match indicator
* next recommended human action
* analysis mode and warnings

## Interview Draft

```http
POST /api/draft-interview
```

Generates editable interview-invitation copy.

The endpoint does not send email.

---

# Tech Stack

| Layer            | Technology              |
| ---------------- | ----------------------- |
| Frontend         | React 18, TypeScript    |
| Build Tool       | Vite                    |
| Backend          | Python, FastAPI         |
| Validation       | Pydantic                |
| AI               | Anthropic Claude        |
| PDF Parsing      | pypdf                   |
| DOCX Parsing     | python-docx             |
| Backend Testing  | Pytest                  |
| Frontend Testing | Vitest, Testing Library |

---

# Repository Structure

```text
HR-AGENT/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── providers.py
│   │   ├── parser.py
│   │   ├── quality.py
│   │   ├── scoring.py
│   │   ├── schemas.py
│   │   └── ...
│   ├── requirements.txt
│   └── tests/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── App.tsx
│   │   ├── api.ts
│   │   ├── types.ts
│   │   └── ...
│   └── package.json
│
├── .env.example
└── README.md
```

---

# Running Locally

## Requirements

* Node.js 20+
* npm 10+
* Python 3.9+

Clone the repository:

```bash
git clone https://github.com/Nicolercc/HR-AGENT.git
cd HR-AGENT
```

Create the Python environment:

```bash
python3 -m venv venv
source venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt
```

Install the frontend:

```bash
npm --prefix frontend install
```

Configure environment variables:

```bash
cp .env.example .env
```

Seeded demo mode does not require an Anthropic API key.

Live uploaded-resume analysis requires:

```env
ANTHROPIC_API_KEY=your_key_here
ANTHROPIC_MODEL=your_supported_model
```

Never expose `ANTHROPIC_API_KEY` through frontend code.

---

# Start the Application

Backend:

```bash
source venv/bin/activate
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```bash
npm --prefix frontend run dev
```

Open:

```text
http://127.0.0.1:5173
```

---

# Testing

Backend:

```bash
cd backend
python -m pytest
```

Frontend:

```bash
npm --prefix frontend run test
```

TypeScript:

```bash
npm --prefix frontend run typecheck
```

Production frontend build:

```bash
npm --prefix frontend run build
```

---

# Architectural Tradeoffs

Ruvia is deliberately a bounded prototype rather than a production applicant-tracking system.

## Deterministic score ≠ hiring decision

The match indicator is an interface aid built from rubric evidence.

It should not be interpreted as an automated employment decision.

A production system would require substantially deeper validation of the rubric, scoring methodology, fairness properties, and intended use.

## Lightweight injection detection

The current application includes basic detection of obvious prompt-injection patterns.

Production document ingestion would require stronger isolation, adversarial testing, and broader prompt-injection defenses.

## Local recruiter state

Candidate status currently persists in the browser rather than in an authenticated backend.

A production architecture would require user identity, authorization, server-side persistence, and a complete audit history.

## Small-batch analysis

The current workflow intentionally supports only a few candidates at once.

Scaling the system would require background jobs, queues, persistent storage, concurrency limits, retry policies, and model-cost controls.

## No ATS or communication integrations

Ruvia deliberately avoids automatic external actions.

There is currently no ATS integration, calendar scheduling, or outbound email delivery.

---

# What I Would Build Next

The next architectural stage would focus less on adding AI features and more on increasing **trustworthiness, observability, and operational maturity**:

* persistent PostgreSQL storage
* recruiter authentication and RBAC
* immutable analysis/audit history
* versioned rubrics
* background analysis jobs
* model/token/latency telemetry
* rate limiting and retry policies
* stronger runtime schema and evidence validation
* adversarial prompt-injection evaluation
* resume provenance and evidence-location tracking
* configurable scoring policies
* accessibility testing
* ATS integration behind explicit human approval
* comprehensive fairness and employment-law review

---

# What This Project Explores

Ruvia is less about automating recruiting than about a broader software-engineering question:

> **How should we design reliable application boundaries around probabilistic models when the surrounding workflow has real consequences?**

Building the system required thinking beyond prompt engineering and UI implementation.

It required separating:

```text
model judgment
from
application rules

generated claims
from
source evidence

analysis
from
actions

demo behavior
from
live behavior

current results
from
stale results

operational telemetry
from
sensitive user data
```

Those boundaries are the core of Ruvia's architecture.

---

## Important Use Limitation

**Ruvia is an experimental software project and is not approved for real-world employment selection.**

It should not be used to make hiring, rejection, promotion, compensation, or other employment decisions without appropriate legal, HR, security, accessibility, fairness, and industrial-organizational review.

---

## Author

**Nicole Rodriguez**
Software Engineer

[Portfolio](https://nicolerodriguez.dev) · [GitHub](https://github.com/Nicolercc)

# Ruvia One-Day Team Execution Plan

## Operating model

One integration owner, sequential handoffs, no concurrent broad edits.

- **Codex:** primary implementation engineer and test runner.
- **Nicole/Cursor:** integration owner, product acceptance, live UI inspection, and narrow visual corrections.
- **Claude Code:** independent read-only release reviewer first; blocker/high fixes only after findings are accepted.

Do not let Codex, Cursor, and Claude perform broad writes against the same working tree simultaneously. If true parallel work is necessary, use separate Git worktrees and non-overlapping file ownership, then review and merge deliberately.

## Git strategy

- Base branch: `main` after initial docs commit.
- Implementation branch: `feat/ruvia-demo-vertical-slice`.
- Optional review-fix branch: `fix/ruvia-release-blockers`.
- Commit at meaningful green checkpoints; do not commit knowingly failing builds.
- Never force-push shared work during the one-day build.

## Checkpoint 0 — Scope and fixtures (30 minutes)

Owner: Nicole + Codex

- Add the delivery-pack documents to the repo.
- Confirm owner, demo role, and three synthetic candidate stories.
- Confirm available Node/Python versions and package managers.
- Confirm deployment accounts and Anthropic environment access.
- Commit docs and fixtures before implementation.

**Gate:** Source-of-truth files exist and the team can recite the golden path and non-goals.

## Checkpoint 1 — Backend vertical slice

Owner: Codex

- Health endpoint.
- Demo fixture endpoint.
- File validation and deterministic PDF/DOCX parsing.
- Rubric and candidate Pydantic schemas.
- Anthropic service behind an interface.
- Deterministic match-indicator function.
- Seeded fallback gated to fixture IDs.
- Backend tests for the highest-risk paths.

**Gate:** One curl/API-client request returns one schema-valid demo analysis. Uploaded input cannot trigger seeded fallback.

## Checkpoint 2 — Frontend vertical slice

Owner: Codex; acceptance by Nicole in Cursor

- Job input/demo loader.
- Candidate upload/demo loader.
- Analyze action and states.
- Rubric panel.
- Candidate cards with all P0 fields.
- Manual status and localStorage persistence.
- Interview draft editor and “not sent” state.

**Gate:** Golden path works locally without CSS polish and without console errors.

## Checkpoint 3 — Safety and failure completeness

Owner: Codex

- Required file and API failure states.
- Prompt-injection eval.
- Protected-factor exclusion eval.
- Malformed-response handling.
- Metadata-only logging review.
- Accessibility basics.

**Gate:** P0 eval card passes.

## Checkpoint 4 — Independent review

Owner: Claude Code

- Start read-only.
- Review against PRD, demo contract, and eval card.
- Run documented checks.
- Report blocker/high/medium/low with evidence.
- Apply only accepted blocker/high corrections.

**Gate:** No blocker remains; every uncorrected high issue is explicitly accepted by Nicole as a demo risk.

## Checkpoint 5 — Cursor polish and freeze

Owner: Nicole/Cursor

Only narrow UI changes:

- hierarchy and spacing
- visible loading/error/success states
- keyboard focus and labels
- responsive desktop presentation
- clearer evidence/gap separation
- human-review and demo-mode visibility

No architecture changes, dependency swaps, or new features.

**Gate:** Full demo rehearsal succeeds twice from a clean browser session.

## Feature sacrifice order if the deadline compresses

Never trade away truthful behavior, human review, protected-factor exclusion, fallback isolation, or schema validation for visual extras.

Cut in this order:

1. P1 audit timeline.
2. P1 private notes and filters.
3. Copy-to-clipboard convenience.
4. Rubric confirmation/editing; keep rubric display read-only.
5. Decorative motion, illustrations, charts, and multiple routes.

Do not cut the bundled golden path, evidence map, deterministic scoring, manual-review notices, manual status control, draft-only boundary, or truthful uploaded-file failure behavior.

## Final freeze

- Stop feature work.
- Run all commands one last time.
- Record a one-minute backup video.
- Prepare a demo script and a failure-safe local environment.
- Keep deployed URL, local URL, and demo fixture path ready.

# Ruvia Demo Contract

This is the release gate for the one-day build. The product PRD is `docs/PRD.md`.

## Demo objective

Show that a recruiter can load one job and three synthetic candidates, run an evidence-first analysis, understand the shared role rubric, verify candidate evidence and uncertainty, manually update a candidate status, and generate an editable interview invitation that is never sent.

## Required golden path

1. Open the recruiter dashboard.
2. Select **Load demo job**.
3. Select **Load demo candidates**.
4. Select **Analyze candidates**.
5. See the role rubric and three ordered candidate cards.
6. Open the top candidate and inspect matches, gaps, evidence, confidence, manual-review flags, and next best action.
7. Change that candidate’s status to **Interview**.
8. Refresh the page and confirm the status persists.
9. Generate an interview invitation.
10. Edit the subject or body and confirm the UI says **Draft only — not sent**.

## Demo-visible product surface

The app may remain a single recruiter workspace. It should visibly contain:

1. **Header:** Ruvia name, one-sentence value proposition, and Live AI/Demo Fallback badge.
2. **Review setup:** job-description input, demo-job loader, resume picker, demo-candidate loader, selected-file list, and Analyze action.
3. **Role rubric:** required, preferred, unclear, and excluded criteria with one shared rubric version.
4. **Review queue:** three ordered candidate summaries with indicator, recommendation, confidence, status, and manual-review signal.
5. **Candidate evidence view:** criterion-level result, resume evidence or “No evidence found,” gaps, warnings, and next best action.
6. **Recruiter action area:** human-controlled status selector and editable interview draft marked “Draft only — not sent.”

The UI does not need separate routes, a marketing homepage, charts, authentication, or a full ATS shell. A coherent single-screen workflow is preferable to multiple incomplete pages.

## Required failure paths

- Empty job description
- No candidates
- Unsupported file type
- Oversized file
- Empty/unreadable/password-protected document
- Anthropic API key missing
- Anthropic request fails
- Model output fails schema validation
- Prompt-injection content inside a resume

## Truthfulness rule

Seeded fallback is allowed only when the request uses the exact bundled demo fixture IDs. It must be labeled **Demo fallback**. Uploaded resumes must never receive seeded or invented analysis.

## Hard boundaries

- No authentication
- No Google Sheets
- No Google OAuth
- No ATS or calendar
- No real email sending
- No autonomous status updates
- No automatic rejection
- No protected-characteristic inference or use
- No raw resume storage or logging
- No unrelated abstractions or framework swaps

## Release commands

Codex must inspect the repository and document the exact commands. At minimum, the final report must include:

- frontend install, typecheck, lint if configured, test if configured, and build
- backend environment setup, test, and startup/import check
- one local end-to-end demo run
- `git diff --check`
- secret and generated-file review

## Release decision

Do not call the app demo-ready if any P0 acceptance criterion fails. Defer polish and P1 work before weakening a P0 requirement.

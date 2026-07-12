# Ruvia

Evidence-first recruiting decision support for a one-day demo vertical slice. Ruvia builds a frozen role rubric, compares up to three candidates against job-related evidence, shows uncertainty and manual-review flags, persists recruiter-controlled status, and drafts editable interview invitations that are never sent.

This demo is not approved for real employment selection. Do not use it for production hiring decisions without legal, HR, and industrial-organizational review.

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- Python 3.9 or newer

Verified locally during setup with Node `v21.7.1`, npm `10.5.0`, and Python `3.9.6`.

## Install

```bash
cd ~/Documents/Pursuit/hr-agent
python3 -m venv venv
source venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt
npm --prefix frontend install
```

## Environment

```bash
cp .env.example .env
```

Seeded demo mode works without an Anthropic key. Live uploaded-resume analysis requires:

```bash
ANTHROPIC_API_KEY=your_key_here
ANTHROPIC_MODEL=claude-sonnet-5
```

Never put `ANTHROPIC_API_KEY` in frontend code.

## Run Locally

Terminal 1:

```bash
cd ~/Documents/Pursuit/hr-agent
source venv/bin/activate
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Terminal 2:

```bash
cd ~/Documents/Pursuit/hr-agent
npm --prefix frontend run dev
```

Open `http://127.0.0.1:5173`.

## Demo Script

1. Open `http://127.0.0.1:5173`.
2. Select `Load demo job`.
3. Select `Load demo candidates`.
4. Select `Analyze candidates`.
5. Confirm the `Demo fallback` badge is visible.
6. Review the role rubric and the three ordered candidate cards.
7. Open Maya Chen and inspect matches, gaps, evidence, confidence, and next best action.
8. Change Maya Chen's status to `Interview`.
9. Refresh the page and confirm the status is retained when the candidate appears.
10. Enter optional recruiter or interview details.
11. Select `Generate interview draft`.
12. Edit the subject or body and confirm `Draft only - not sent`.

## Seeded Demo Mode

The seeded fallback is available only for the bundled demo job ID and bundled candidate IDs returned by:

```bash
curl http://127.0.0.1:8000/api/demo
```

Uploaded resumes never receive seeded fallback results. If live AI is unavailable for uploaded resumes, the API returns a truthful error.

## Live AI Mode

```bash
cd ~/Documents/Pursuit/hr-agent
source venv/bin/activate
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Then run the frontend and upload up to three PDF or DOCX resumes.

## Checks

Backend tests:

```bash
cd ~/Documents/Pursuit/hr-agent
source venv/bin/activate
cd backend
python -m pytest
```

Backend import/startup check:

```bash
cd ~/Documents/Pursuit/hr-agent
source venv/bin/activate
cd backend
python -c "from app.main import app; print(app.title)"
```

Frontend typecheck:

```bash
cd ~/Documents/Pursuit/hr-agent
npm --prefix frontend run typecheck
```

Frontend production build:

```bash
cd ~/Documents/Pursuit/hr-agent
npm --prefix frontend run build
```

Whitespace check:

```bash
cd ~/Documents/Pursuit/hr-agent
git diff --check
```

No lint command is configured for this one-day slice.

## API

- `GET /api/health`
- `GET /api/demo`
- `POST /api/analyze`
- `POST /api/draft-interview`

## Known Limitations

- The app is a demo vertical slice, not a production employment-selection system.
- There is no authentication, ATS integration, calendar integration, Google integration, analytics, or email sending.
- Candidate status is recruiter-controlled and stored locally in the browser.
- Uploaded documents are parsed transiently and are not persisted by the backend.
- Live analysis depends on a configured Anthropic key and model availability.

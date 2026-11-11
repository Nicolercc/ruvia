# Install the Ruvia Delivery Pack into HR-AGENT

These files are a repository overlay. Do **not** place the entire `ruvia_delivery_pack` directory inside the application repository.

The final repository should contain:

```text
HR-AGENT/
├── AGENTS.md
├── README.md                         # existing or created by Codex
├── docs/
│   ├── PRD.md
│   ├── DEMO_CONTRACT.md
│   ├── EVALS.md
│   ├── TEAM_EXECUTION_PLAN.md
│   └── REPOSITORY_INSTALL.md
├── prompts/
│   ├── CODEX_IMPLEMENTATION_PROMPT.md
│   ├── CLAUDE_RELEASE_REVIEW_PROMPT.md
│   └── CURSOR_POLISH_PROMPT.md
├── frontend/                         # created or reused by Codex
└── backend/                          # created or reused by Codex
```

## Safest installation method

Extract this delivery pack somewhere outside the repository, then run:

```bash
cd /path/to/ruvia_delivery_pack
bash install_into_repo.sh /Users/nicolerodriguez/Documents/Projects/HR-AGENT
```

The installer verifies that the destination is a Git repository. If any target file already exists and differs, it saves a timestamped copy under `.ruvia-handoff-backup/` before replacing it.

## Manual installation

From the extracted delivery-pack directory:

```bash
REPO=/Users/nicolerodriguez/Documents/Projects/HR-AGENT
mkdir -p "$REPO/docs" "$REPO/prompts"
cp AGENTS.md "$REPO/AGENTS.md"
cp docs/*.md "$REPO/docs/"
cp prompts/*.md "$REPO/prompts/"
```

Then verify:

```bash
cd "$REPO"
git status --short
git diff -- AGENTS.md docs prompts
```

## First Git checkpoint

Use a dedicated branch before implementation:

```bash
cd /Users/nicolerodriguez/Documents/Projects/HR-AGENT
git switch -c feat/ruvia-demo-vertical-slice
# If the branch already exists: git switch feat/ruvia-demo-vertical-slice

git add AGENTS.md docs prompts
git commit -m "docs: lock Ruvia demo scope and agent contracts"
```

Do not add the downloaded ZIP, the extracted delivery-pack folder, secrets, or real resumes to Git.

## Starting Codex

Launch Codex from the **HR-AGENT repository root**, not from the delivery-pack folder:

```bash
cd /Users/nicolerodriguez/Documents/Projects/HR-AGENT
codex
```

Ask Codex to read `prompts/CODEX_IMPLEMENTATION_PROMPT.md` and execute it. The prompt is stored in the repository so every engineer reviews the same build contract.

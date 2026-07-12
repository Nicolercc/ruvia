import React from "react";
import { AlertCircle, ArrowRight, Ban, CheckCircle2, FileText, Loader2, ShieldCheck, Users } from "lucide-react";
import { analyzeCandidates, draftInterview, fetchDemo } from "./api";
import { loadStatuses, saveStatuses } from "./statusStore";
import type { AnalyzeResponse, CandidateAnalysis, CandidateStatus, DemoResponse, DraftResponse } from "./types";
import { AnalysisContextBar } from "./components/AnalysisContextBar";
import { CandidateDetail } from "./components/CandidateDetail";
import { CandidateQueue } from "./components/CandidateQueue";
import { FileUploadControl } from "./components/FileUploadControl";
import { RubricDialog } from "./components/RubricDialog";
import "./styles.css";

export type AnalysisLifecycle = "idle" | "ready" | "analyzing" | "success_live" | "success_demo" | "stale" | "error";

export function computeInputFingerprint(jobDescription: string, demoCandidateIds: string[], files: File[]): string {
  const candidateKey = demoCandidateIds.length
    ? demoCandidateIds
    : files.map((file) => `${file.name}:${file.size}:${file.lastModified}`);
  return JSON.stringify({ job: jobDescription.trim(), candidates: candidateKey });
}

export function responseMatchesRequestedDemoCandidates(result: AnalyzeResponse, requestedDemoCandidateIds: string[]): boolean {
  if (requestedDemoCandidateIds.length === 0) return true;
  const requested = new Set(requestedDemoCandidateIds);
  const returned = result.candidates.map((candidate) => candidate.candidate_id);
  return returned.length === requested.size && returned.every((id) => requested.has(id));
}

export default function App() {
  const [workspaceOpen, setWorkspaceOpen] = React.useState(false);
  const [demo, setDemo] = React.useState<DemoResponse | null>(null);
  const [jobDescription, setJobDescription] = React.useState("");
  const [demoJobId, setDemoJobId] = React.useState<string | null>(null);
  const [demoCandidateIds, setDemoCandidateIds] = React.useState<string[]>([]);
  const [files, setFiles] = React.useState<File[]>([]);
  const [analysis, setAnalysis] = React.useState<AnalyzeResponse | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [statusMap, setStatusMap] = React.useState(loadStatuses);
  const [loading, setLoading] = React.useState(false);
  const [draftLoading, setDraftLoading] = React.useState(false);
  const [draft, setDraft] = React.useState<DraftResponse | null>(null);
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [recruiterName, setRecruiterName] = React.useState("");
  const [interviewDetails, setInterviewDetails] = React.useState("");
  const [lifecycle, setLifecycle] = React.useState<AnalysisLifecycle>("idle");
  const [analysisFingerprint, setAnalysisFingerprint] = React.useState<string | null>(null);
  const [analyzedAt, setAnalyzedAt] = React.useState<Date | null>(null);
  const [rubricOpen, setRubricOpen] = React.useState(false);
  const [fileInputKey, setFileInputKey] = React.useState(0);

  const setupRef = React.useRef<HTMLElement>(null);
  const rubricTriggerRef = React.useRef<HTMLButtonElement>(null);

  const currentFingerprint = React.useMemo(
    () => computeInputFingerprint(jobDescription, demoCandidateIds, files),
    [jobDescription, demoCandidateIds, files]
  );
  const currentFingerprintRef = React.useRef(currentFingerprint);
  React.useEffect(() => {
    currentFingerprintRef.current = currentFingerprint;
  }, [currentFingerprint]);
  const runTokenRef = React.useRef(0);

  React.useEffect(() => {
    setLifecycle((current) => {
      if (current === "success_live" || current === "success_demo" || current === "stale") {
        return currentFingerprint === analysisFingerprint ? current : "stale";
      }
      return current;
    });
  }, [currentFingerprint, analysisFingerprint]);

  React.useEffect(() => {
    fetchDemo()
      .then((data) => setDemo(data))
      .catch((err: Error) => setError(err.message));
  }, []);

  React.useEffect(() => {
    saveStatuses(statusMap);
  }, [statusMap]);

  const selectedCandidate = analysis?.candidates.find((candidate) => candidate.candidate_id === selectedId) ?? analysis?.candidates[0] ?? null;

  function loadDemoJob() {
    if (!demo) return;
    setJobDescription(demo.job_description);
    setDemoJobId(demo.demo_job_id);
    setError(null);
  }

  function loadDemoCandidates() {
    if (!demo) return;
    setDemoCandidateIds(demo.candidates.map((candidate) => candidate.candidate_id));
    setFiles([]);
    setError(null);
  }

  function onFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.currentTarget.files ?? []).slice(0, 3);
    setFiles(nextFiles);
    setDemoCandidateIds([]);
    setDemoJobId(null);
    setError(null);
  }

  async function runAnalysis() {
    const fingerprint = currentFingerprint;
    const token = ++runTokenRef.current;
    setLoading(true);
    setError(null);
    setDraft(null);
    setLifecycle("analyzing");
    try {
      const result = await analyzeCandidates({ jobDescription, demoJobId, demoCandidateIds, files });
      const isLatest = token === runTokenRef.current;
      const inputsUnchanged = fingerprint === currentFingerprintRef.current;
      if (!isLatest) {
        return;
      }
      if (!inputsUnchanged) {
        setLifecycle(analysisFingerprint ? "stale" : "ready");
        return;
      }
      if (!responseMatchesRequestedDemoCandidates(result, demoCandidateIds)) {
        setError("Analysis response candidate IDs did not match the request.");
        setLifecycle("error");
        return;
      }
      setAnalysis(result);
      setSelectedId(result.candidates[0]?.candidate_id ?? null);
      setAnalysisFingerprint(fingerprint);
      setAnalyzedAt(new Date());
      setLifecycle(result.mode === "demo_fallback" ? "success_demo" : "success_live");
    } catch (err) {
      if (token !== runTokenRef.current) return;
      setError(err instanceof Error ? err.message : "Analysis failed");
      setLifecycle("error");
    } finally {
      if (token === runTokenRef.current) setLoading(false);
    }
  }

  function updateStatus(candidateId: string, status: CandidateStatus) {
    setStatusMap((current) => ({ ...current, [candidateId]: status }));
  }

  async function generateDraft(candidate: CandidateAnalysis) {
    setDraftLoading(true);
    setError(null);
    try {
      const result = await draftInterview({
        candidateName: candidate.name,
        jobTitle: analysis?.rubric.job_title ?? "the role",
        recruiterName,
        interviewDetails
      });
      setDraft(result);
      setSubject(result.subject);
      setBody(result.body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Draft failed");
    } finally {
      setDraftLoading(false);
    }
  }

  function scrollToSetup() {
    setupRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    const firstControl = setupRef.current?.querySelector<HTMLElement>("button, textarea, input");
    firstControl?.focus();
  }

  function resetWorkspace() {
    ++runTokenRef.current;
    setJobDescription("");
    setDemoJobId(null);
    setDemoCandidateIds([]);
    setFiles([]);
    setAnalysis(null);
    setSelectedId(null);
    setDraft(null);
    setSubject("");
    setBody("");
    setError(null);
    setRecruiterName("");
    setInterviewDetails("");
    setLifecycle("idle");
    setAnalysisFingerprint(null);
    setAnalyzedAt(null);
    setRubricOpen(false);
    setLoading(false);
    setDraftLoading(false);
    setFileInputKey((current) => current + 1);
    scrollToSetup();
  }

  if (!workspaceOpen) {
    return <LandingPage onEnterWorkspace={() => setWorkspaceOpen(true)} />;
  }

  const isStale = lifecycle === "stale";
  const showResults = Boolean(analysis);

  return (
    <main className="app-shell">
      {!showResults ? (
        <header className="app-header">
          <div>
            <p className="eyebrow">Recruiter workspace</p>
            <h1>Ruvia</h1>
            <p className="subtitle">Evidence-first candidate review with human-controlled status and draft-only outreach.</p>
          </div>
          <div className={`mode-badge ${lifecycle === "stale" ? "demo" : analysis?.mode === "demo_fallback" ? "demo" : "live"}`}>
            <ShieldCheck size={18} aria-hidden="true" />
            {lifecycle === "stale" ? "Inputs changed" : analysis?.mode === "demo_fallback" ? "Demo fallback" : "Live AI ready"}
          </div>
        </header>
      ) : null}

      <section ref={setupRef} className="setup-grid" aria-label="Review setup">
        <div className="panel">
          <div className="panel-title">
            <FileText size={20} aria-hidden="true" />
            <h2>Job description</h2>
          </div>
          <button type="button" className="secondary" onClick={loadDemoJob}>
            Load demo job
          </button>
          <label htmlFor="job-description">Role details</label>
          <textarea
            id="job-description"
            value={jobDescription}
            onChange={(event) => {
              setJobDescription(event.target.value);
              setDemoJobId(null);
            }}
            rows={12}
          />
        </div>

        <div className="panel">
          <div className="panel-title">
            <Users size={20} aria-hidden="true" />
            <h2>Candidates</h2>
          </div>
          <button type="button" className="secondary" onClick={loadDemoCandidates}>
            Load demo candidates
          </button>
          <FileUploadControl key={fileInputKey} id="resumes" label="Upload PDF or DOCX resumes" onChange={onFilesSelected}>
            <SelectedFiles demo={demo} demoCandidateIds={demoCandidateIds} files={files} />
          </FileUploadControl>
          <button type="button" className={`primary analyze-button ${isStale ? "analyze-stale" : ""}`} onClick={runAnalysis}>
            {loading ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Users size={18} aria-hidden="true" />}
            {isStale ? "Analyze current inputs" : "Analyze candidates"}
          </button>
          {error ? (
            <div className="alert" role="alert">
              <AlertCircle size={18} aria-hidden="true" />
              {error}
            </div>
          ) : null}
        </div>
      </section>

      {showResults && analysis ? (
        <section className={`results-workspace ${isStale ? "stale-workspace" : ""}`} aria-label="Candidate review results">
          <AnalysisContextBar
            analysis={analysis}
            lifecycle={lifecycle}
            candidateCount={analysis.candidates.length}
            analyzedAt={analyzedAt}
            loading={loading}
            onViewRubric={() => setRubricOpen(true)}
            onChangeInputs={scrollToSetup}
            onAnalyzeAgain={runAnalysis}
            onResetWorkspace={resetWorkspace}
            rubricTriggerRef={rubricTriggerRef}
          />

          {isStale ? (
            <div className="alert stale-banner" role="alert" aria-label="Stale analysis">
              <AlertCircle size={18} aria-hidden="true" />
              <div>
                <strong>Inputs changed since this analysis</strong>
                <p>
                  The results below are from a previous run and no longer match the current job description or
                  candidates. Analyze again before updating status or generating a draft.
                </p>
              </div>
            </div>
          ) : null}

          <div className="review-panes">
            <CandidateQueue
              candidates={analysis.candidates}
              selectedId={selectedId}
              statusMap={statusMap}
              onSelect={setSelectedId}
            />

            {selectedCandidate ? (
              <CandidateDetail
                candidate={selectedCandidate}
                rubric={analysis.rubric}
                status={statusMap[selectedCandidate.candidate_id] ?? "New"}
                onStatusChange={(status) => updateStatus(selectedCandidate.candidate_id, status)}
                onGenerateDraft={() => generateDraft(selectedCandidate)}
                stale={isStale}
                draftLoading={draftLoading}
                draft={draft}
                subject={subject}
                body={body}
                setSubject={setSubject}
                setBody={setBody}
                recruiterName={recruiterName}
                setRecruiterName={setRecruiterName}
                interviewDetails={interviewDetails}
                setInterviewDetails={setInterviewDetails}
              />
            ) : null}
          </div>

          <RubricDialog
            open={rubricOpen}
            rubric={analysis.rubric}
            mode={analysis.mode}
            warnings={analysis.warnings}
            onClose={() => setRubricOpen(false)}
            triggerRef={rubricTriggerRef}
          />
        </section>
      ) : (
        <section className="empty-state">
          <CheckCircle2 size={24} aria-hidden="true" />
          <p>Load a job and up to three candidates to begin.</p>
        </section>
      )}
    </main>
  );
}

function LandingPage({ onEnterWorkspace }: { onEnterWorkspace: () => void }) {
  return (
    <main className="landing-shell">
      <header className="landing-nav" aria-label="Landing navigation">
        <span className="landing-brand">Ruvia</span>
        <button type="button" className="nav-cta" onClick={onEnterWorkspace}>
          Enter workspace
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </header>

      <section className="landing-hero" aria-label="Ruvia overview">
        <div className="hero-copy">
          <p className="landing-eyebrow">Evidence-first review</p>
          <h1>Evidence you can defend.</h1>
          <p className="hero-subhead">Human review over hidden automation.</p>
          <p className="hero-lede">
            Ruvia turns a job description and a small resume batch into an auditable review queue: what was found,
            what is missing, what needs manual review, and what the system refused to score.
          </p>
          <div className="hero-action-group">
            <button type="button" className="primary hero-cta" onClick={onEnterWorkspace}>
              Enter review workspace
              <ArrowRight size={18} aria-hidden="true" />
            </button>
            <div className="hero-proof">
              <p className="review-notice">
                <ShieldCheck size={18} aria-hidden="true" />
                Human review required for every result
              </p>
              <ul className="hero-boundaries" aria-label="Product boundaries">
                <li>Draft-only outreach</li>
                <li>No auto-rejections</li>
                <li>No protected-factor scoring</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="hero-artifact" role="region" aria-label="Evidence docket example">
          <article className="evidence-docket">
            <div className="docket-topline">
              <span>Evidence docket</span>
              <span>Run mode: demo fallback</span>
            </div>
            <div className="docket-section">
              <span className="docket-label">Criterion</span>
              <h2>SQL reporting workflows</h2>
              <span className="status-token found">Found</span>
              <blockquote>
                Built SQL reporting workflows for pipeline, bookings, and renewals.
              </blockquote>
              <p className="provenance">Provenance: resume evidence</p>
            </div>
            <div className="score-rule" aria-label="Score mechanics">
              <span>Score mechanics</span>
              <strong>Required 70</strong>
              <strong>Preferred 20</strong>
              <strong>Completeness 10</strong>
            </div>
          </article>

          <aside className="excluded-rail" aria-label="Intentionally excluded from scoring">
            <div>
              <Ban size={18} aria-hidden="true" />
              <h2>Intentionally excluded</h2>
            </div>
            <ul>
              <li>Age</li>
              <li>Photos</li>
              <li>School prestige</li>
              <li>Employer prestige</li>
              <li>Culture fit</li>
              <li>Protected characteristics</li>
            </ul>
          </aside>
        </div>
      </section>

      <section className="taxonomy-strip" aria-label="Evidence taxonomy">
        <article>
          <span className="taxonomy-label">Criterion state</span>
          <span className="status-token found">Found</span>
          <h2>SQL ownership</h2>
          <p className="taxonomy-evidence">Resume evidence directly supports a role criterion.</p>
        </article>
        <article>
          <span className="taxonomy-label">Criterion state</span>
          <span className="status-token partial">Partial</span>
          <h2>Tableau readiness</h2>
          <p className="taxonomy-evidence">Transferable evidence exists; exact readiness needs review.</p>
        </article>
        <article>
          <span className="taxonomy-label">Criterion state</span>
          <span className="status-token not-found">Not found</span>
          <h2>Python evidence</h2>
          <p className="taxonomy-evidence">No resume evidence was found for this criterion.</p>
        </article>
      </section>
    </main>
  );
}

function SelectedFiles({ demo, demoCandidateIds, files }: { demo: DemoResponse | null; demoCandidateIds: string[]; files: File[] }) {
  const demoNames = demo?.candidates.filter((candidate) => demoCandidateIds.includes(candidate.candidate_id)) ?? [];
  return (
    <div className="selected-files" aria-live="polite">
      {demoNames.map((candidate) => (
        <span className="file-chip" key={candidate.candidate_id} title={candidate.filename} tabIndex={0}>
          {candidate.filename}
        </span>
      ))}
      {files.map((file) => (
        <span className="file-chip" key={file.name} title={file.name} tabIndex={0}>
          {file.name}
        </span>
      ))}
      {!demoNames.length && !files.length ? <span className="file-chip empty">No candidates selected</span> : null}
    </div>
  );
}

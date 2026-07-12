import React from "react";
import { AlertCircle, CheckCircle2, FileText, Loader2, Mail, ShieldCheck, Upload, Users } from "lucide-react";
import { analyzeCandidates, draftInterview, fetchDemo } from "./api";
import { loadStatuses, saveStatuses } from "./statusStore";
import type { AnalyzeResponse, CandidateAnalysis, CandidateStatus, DemoResponse, DraftResponse, RoleRubric } from "./types";
import "./styles.css";

const statuses: CandidateStatus[] = ["New", "Reviewing", "Interview", "Rejected"];
const lastDemoRunKey = "ruvia:last-demo-run:v1";

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
    window.sessionStorage.removeItem("ruvia:last-analysis:v1");
    fetchDemo()
      .then((data) => {
        setDemo(data);
        const saved = window.sessionStorage.getItem(lastDemoRunKey);
        if (!saved) return;
        let parsed: { demoJobId: string; demoCandidateIds: string[] };
        try {
          parsed = JSON.parse(saved) as { demoJobId: string; demoCandidateIds: string[] };
        } catch {
          window.sessionStorage.removeItem(lastDemoRunKey);
          return;
        }
        if (parsed.demoJobId !== data.demo_job_id || !parsed.demoCandidateIds.length) return;
        setJobDescription(data.job_description);
        setDemoJobId(parsed.demoJobId);
        setDemoCandidateIds(parsed.demoCandidateIds);
        const fingerprint = computeInputFingerprint(data.job_description, parsed.demoCandidateIds, []);
        const token = ++runTokenRef.current;
        setLoading(true);
        setLifecycle("analyzing");
        analyzeCandidates({
          jobDescription: data.job_description,
          demoJobId: parsed.demoJobId,
          demoCandidateIds: parsed.demoCandidateIds,
          files: []
        })
          .then((result) => {
            const isLatest = token === runTokenRef.current;
            const inputsUnchanged = fingerprint === currentFingerprintRef.current;
            if (!isLatest || !inputsUnchanged) return;
            if (!responseMatchesRequestedDemoCandidates(result, parsed.demoCandidateIds)) {
              setError("Analysis response candidate IDs did not match the request.");
              setLifecycle("error");
              return;
            }
            setAnalysis(result);
            setSelectedId(result.candidates[0]?.candidate_id ?? null);
            setAnalysisFingerprint(fingerprint);
            setLifecycle(result.mode === "demo_fallback" ? "success_demo" : "success_live");
          })
          .catch((err: Error) => {
            if (token !== runTokenRef.current) return;
            setError(err.message);
            setLifecycle("error");
          })
          .finally(() => {
            if (token === runTokenRef.current) setLoading(false);
          });
      })
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
        // A newer analysis request has since started; that request owns the result.
        return;
      }
      if (!inputsUnchanged) {
        // Inputs changed after this request was sent but before a new one started.
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
      setLifecycle(result.mode === "demo_fallback" ? "success_demo" : "success_live");
      if (demoJobId && demoCandidateIds.length > 0) {
        window.sessionStorage.setItem(lastDemoRunKey, JSON.stringify({ demoJobId, demoCandidateIds }));
      } else {
        window.sessionStorage.removeItem(lastDemoRunKey);
      }
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

  return (
    <main className="app-shell">
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

      <section className="setup-grid" aria-label="Review setup">
        <div className="panel">
          <div className="panel-title">
            <FileText size={20} aria-hidden="true" />
            <h2>Job description</h2>
          </div>
          <button type="button" className="secondary" onClick={loadDemoJob}>Load demo job</button>
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
            <Upload size={20} aria-hidden="true" />
            <h2>Candidates</h2>
          </div>
          <button type="button" className="secondary" onClick={loadDemoCandidates}>Load demo candidates</button>
          <label htmlFor="resumes">Upload PDF or DOCX resumes</label>
          <input id="resumes" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple onChange={onFilesSelected} />
          <SelectedFiles demo={demo} demoCandidateIds={demoCandidateIds} files={files} />
          <button type="button" className="primary analyze-button" onClick={runAnalysis}>
            {loading ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Users size={18} aria-hidden="true" />}
            Analyze candidates
          </button>
          {error ? <div className="alert" role="alert"><AlertCircle size={18} aria-hidden="true" />{error}</div> : null}
        </div>
      </section>

      {analysis ? (
        <section className="results-grid" aria-label="Candidate review results">
          {lifecycle === "stale" ? (
            <div className="alert stale-banner" role="alert" aria-label="Stale analysis">
              <AlertCircle size={18} aria-hidden="true" />
              Inputs changed — analyze again. The results below are from a previous run and no longer match the current job description or candidates.
            </div>
          ) : null}
          <RubricPanel rubric={analysis.rubric} mode={analysis.mode} warnings={analysis.warnings} />
          <section className="queue" aria-label="Review queue">
            <h2>Review queue</h2>
            <div className="candidate-list">
              {analysis.candidates.map((candidate) => (
                <button
                  key={candidate.candidate_id}
                  type="button"
                  className={`candidate-card ${selectedCandidate?.candidate_id === candidate.candidate_id ? "selected" : ""}`}
                  onClick={() => setSelectedId(candidate.candidate_id)}
                >
                  <span className="score">{candidate.match_indicator ?? "MR"}</span>
                  <span>
                    <strong>{candidate.name}</strong>
                    <small>{candidate.recommendation.replace(/_/g, " ")}</small>
                  </span>
                  <span className={`confidence ${candidate.confidence}`}>{candidate.confidence}</span>
                  <span className="status-chip">{statusMap[candidate.candidate_id] ?? "New"}</span>
                </button>
              ))}
            </div>
          </section>

          {selectedCandidate ? (
            <CandidateDetail
              candidate={selectedCandidate}
              rubric={analysis.rubric}
              status={statusMap[selectedCandidate.candidate_id] ?? "New"}
              onStatusChange={(status) => updateStatus(selectedCandidate.candidate_id, status)}
              onGenerateDraft={() => generateDraft(selectedCandidate)}
              stale={lifecycle === "stale"}
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

function SelectedFiles({ demo, demoCandidateIds, files }: { demo: DemoResponse | null; demoCandidateIds: string[]; files: File[] }) {
  const demoNames = demo?.candidates.filter((candidate) => demoCandidateIds.includes(candidate.candidate_id)) ?? [];
  return (
    <div className="selected-files" aria-live="polite">
      {demoNames.map((candidate) => <span key={candidate.candidate_id}>{candidate.filename}</span>)}
      {files.map((file) => <span key={file.name}>{file.name}</span>)}
      {!demoNames.length && !files.length ? <span>No candidates selected</span> : null}
    </div>
  );
}

function RubricPanel({ rubric, mode, warnings }: { rubric: RoleRubric; mode: string; warnings: string[] }) {
  return (
    <section className="rubric" aria-label="Role rubric">
      <div className="section-heading">
        <h2>Role rubric</h2>
        <span>{rubric.rubric_version}</span>
      </div>
      <p className="mode-line">{mode === "demo_fallback" ? "Demo fallback" : "Live AI"} run for {rubric.job_title}</p>
      <RubricList title="Required" items={rubric.required.map((item) => item.criterion)} />
      <RubricList title="Preferred" items={rubric.preferred.map((item) => item.criterion)} />
      <RubricList title="Unclear" items={rubric.unclear} />
      <RubricList title="Excluded" items={rubric.excluded_factors} />
      {warnings.map((warning) => <p className="warning" key={warning}>{warning}</p>)}
    </section>
  );
}

function RubricList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rubric-list">
      <h3>{title}</h3>
      <ul>
        {items.length ? items.map((item) => <li key={item}>{item}</li>) : <li>None listed</li>}
      </ul>
    </div>
  );
}

function CandidateDetail(props: {
  candidate: CandidateAnalysis;
  rubric: RoleRubric;
  status: CandidateStatus;
  onStatusChange: (status: CandidateStatus) => void;
  onGenerateDraft: () => void;
  stale: boolean;
  draftLoading: boolean;
  draft: DraftResponse | null;
  subject: string;
  body: string;
  setSubject: (value: string) => void;
  setBody: (value: string) => void;
  recruiterName: string;
  setRecruiterName: (value: string) => void;
  interviewDetails: string;
  setInterviewDetails: (value: string) => void;
}) {
  const { candidate, rubric } = props;
  const criterionLabel = new Map([...rubric.required, ...rubric.preferred].map((item) => [item.id, item.criterion]));

  return (
    <section className="detail" aria-label="Candidate evidence view">
      <div className="detail-header">
        <div>
          <h2>{candidate.name}</h2>
          <p>{candidate.summary}</p>
        </div>
        <span className="big-score">{candidate.match_indicator ?? "MR"}</span>
      </div>
      <p className="human-review">Human review required for every result.</p>
      <div className="detail-columns">
        <InfoList title="Matches" items={candidate.matching_qualifications} />
        <InfoList title="Gaps" items={candidate.missing_or_unverified} />
        <InfoList title="Manual review" items={candidate.manual_review_flags} fallback="No flags" />
      </div>
      <h3>Criterion evidence</h3>
      <div className="evidence-list">
        {candidate.criterion_results.map((result) => (
          <article key={result.criterion_id} className="evidence-row">
            <span className={`status-dot ${result.status}`}>{result.status.replace("_", " ")}</span>
            <div>
              <strong>{criterionLabel.get(result.criterion_id) ?? result.criterion_id}</strong>
              <p>{result.evidence || "No evidence found"}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="action-area">
        <label htmlFor="status">Recruiter status</label>
        <select
          id="status"
          value={props.status}
          disabled={props.stale}
          onChange={(event) => props.onStatusChange(event.target.value as CandidateStatus)}
        >
          {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <p className="next-action">{candidate.next_best_action}</p>
        <div className="draft-inputs">
          <label htmlFor="recruiter">Recruiter name</label>
          <input id="recruiter" value={props.recruiterName} onChange={(event) => props.setRecruiterName(event.target.value)} />
          <label htmlFor="details">Interview details</label>
          <textarea id="details" value={props.interviewDetails} onChange={(event) => props.setInterviewDetails(event.target.value)} rows={3} />
        </div>
        <button
          type="button"
          className="primary"
          onClick={props.onGenerateDraft}
          disabled={props.stale || props.draftLoading || props.status !== "Interview"}
        >
          {props.draftLoading ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Mail size={18} aria-hidden="true" />}
          Generate interview draft
        </button>
        {props.draft ? (
          <div className="draft-box">
            <strong>{props.draft.notice}</strong>
            <label htmlFor="subject">Subject</label>
            <input id="subject" value={props.subject} onChange={(event) => props.setSubject(event.target.value)} />
            <label htmlFor="body">Body</label>
            <textarea id="body" value={props.body} onChange={(event) => props.setBody(event.target.value)} rows={9} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function InfoList({ title, items, fallback = "None listed" }: { title: string; items: string[]; fallback?: string }) {
  return (
    <div className="info-list">
      <h3>{title}</h3>
      <ul>
        {items.length ? items.map((item) => <li key={item}>{item}</li>) : <li>{fallback}</li>}
      </ul>
    </div>
  );
}

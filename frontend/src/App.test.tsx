import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App, { computeInputFingerprint, responseMatchesRequestedDemoCandidates } from "./App";
import type { AnalyzeResponse, DemoResponse, CandidateAnalysis } from "./types";

vi.mock("./api", () => ({
  fetchDemo: vi.fn(),
  analyzeCandidates: vi.fn(),
  draftInterview: vi.fn()
}));

import { fetchDemo, analyzeCandidates } from "./api";

const demoFixture: DemoResponse = {
  demo_job_id: "demo-role-revenue-ops-analyst",
  job_title: "Revenue Operations Analyst",
  job_description: "A".repeat(100),
  candidates: [
    { candidate_id: "demo-candidate-maya-chen", display_name: "Maya Chen", filename: "maya_chen_resume.pdf" },
    { candidate_id: "demo-candidate-owen-rivera", display_name: "Owen Rivera", filename: "owen_rivera_resume.docx" },
    { candidate_id: "demo-candidate-sam-patel", display_name: "Sam Patel", filename: "sam_patel_resume.pdf" }
  ]
};

function candidate(id: string, name: string): CandidateAnalysis {
  return {
    candidate_id: id,
    name,
    match_indicator: 80,
    recommendation: "recruiter_review_recommended",
    summary: `${name} summary`,
    criterion_results: [],
    matching_qualifications: [],
    missing_or_unverified: [],
    confidence: "high",
    manual_review_flags: [],
    next_best_action: "Review",
    human_review_required: true,
    score_explanation: "explained"
  };
}

function analysisResponse(candidates: CandidateAnalysis[], mode: "live_ai" | "demo_fallback" = "demo_fallback"): AnalyzeResponse {
  return {
    run_id: "run-" + Math.random(),
    mode,
    rubric: {
      rubric_id: "rubric-1",
      rubric_version: "v1",
      job_title: "Revenue Operations Analyst",
      required: [],
      preferred: [],
      unclear: [],
      excluded_factors: []
    },
    candidates,
    warnings: mode === "demo_fallback" ? ["Seeded demo fallback used for exact bundled fixture IDs only."] : [],
    fallback_used: mode === "demo_fallback"
  };
}

function allDemoCandidates(suffix = ""): CandidateAnalysis[] {
  return [
    candidate("demo-candidate-maya-chen", `Maya Chen${suffix}`),
    candidate("demo-candidate-owen-rivera", `Owen Rivera${suffix}`),
    candidate("demo-candidate-sam-patel", `Sam Patel${suffix}`)
  ];
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeFile(name: string, content = "resume text"): File {
  return new File([content], name, { type: "application/pdf" });
}

async function renderApp() {
  const user = userEvent.setup();
  const utils = render(<App />);
  expect(screen.getByRole("heading", { name: /Evidence you can defend/i })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /Enter review workspace/i }));
  await waitFor(() => expect(fetchDemo).toHaveBeenCalled());
  return utils;
}

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  vi.mocked(fetchDemo).mockResolvedValue(demoFixture);
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("computeInputFingerprint", () => {
  it("differs when job description changes", () => {
    const a = computeInputFingerprint("job one", ["id-1"], []);
    const b = computeInputFingerprint("job two", ["id-1"], []);
    expect(a).not.toBe(b);
  });

  it("differs when candidate id order/content changes", () => {
    const a = computeInputFingerprint("job", ["id-1", "id-2"], []);
    const b = computeInputFingerprint("job", ["id-1"], []);
    expect(a).not.toBe(b);
  });

  it("is stable for identical inputs", () => {
    const a = computeInputFingerprint("job", ["id-1"], []);
    const b = computeInputFingerprint("job", ["id-1"], []);
    expect(a).toBe(b);
  });
});

describe("responseMatchesRequestedDemoCandidates", () => {
  it("passes when demo candidate ids are not requested", () => {
    expect(responseMatchesRequestedDemoCandidates(analysisResponse([]), [])).toBe(true);
  });

  it("fails when a returned candidate id was not requested", () => {
    const response = analysisResponse([candidate("unexpected-id", "Ghost")]);
    expect(responseMatchesRequestedDemoCandidates(response, ["demo-candidate-maya-chen"])).toBe(false);
  });

  it("passes when returned ids exactly match requested ids", () => {
    const response = analysisResponse([candidate("demo-candidate-maya-chen", "Maya Chen")]);
    expect(responseMatchesRequestedDemoCandidates(response, ["demo-candidate-maya-chen"])).toBe(true);
  });
});

describe("landing page", () => {
  it("presents the evidence-first thesis before entering the workspace", async () => {
    render(<App />);
    await waitFor(() => expect(fetchDemo).toHaveBeenCalled());

    expect(screen.getByRole("heading", { name: /Evidence you can defend/i })).toBeInTheDocument();
    expect(screen.getByText(/Human review required for every result/i)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Evidence docket example/i })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: /Intentionally excluded from scoring/i })).toBeInTheDocument();
    expect(screen.getByText("School prestige")).toBeInTheDocument();
  });
});

describe("analysis lifecycle integrity", () => {
  it("1. shows stale after analyzing an uploaded candidate then loading demo candidates", async () => {
    const user = userEvent.setup();
    vi.mocked(analyzeCandidates).mockResolvedValueOnce(
      analysisResponse([candidate("uploaded-doc-1", "Jordan Ellis")], "live_ai")
    );
    await renderApp();

    const file = makeFile("uploaded_candidate.pdf");
    await user.upload(screen.getByLabelText(/Upload PDF or DOCX resumes/i), file);
    await user.click(screen.getByRole("button", { name: /Analyze candidates/i }));

    await screen.findByRole("heading", { name: "Jordan Ellis" });
    expect(screen.queryByRole("alert", { name: /Stale analysis/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Load demo candidates/i }));

    expect(await screen.findByRole("alert", { name: /Stale analysis/i })).toBeInTheDocument();
    // Old result must not be presented as current.
    expect(screen.getByRole("heading", { name: "Jordan Ellis" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Recruiter status/i)).toBeDisabled();
  });

  it("2. shows stale after analyzing demo candidates then uploading a different candidate", async () => {
    const user = userEvent.setup();
    vi.mocked(analyzeCandidates).mockResolvedValueOnce(analysisResponse(allDemoCandidates(), "demo_fallback"));
    await renderApp();

    await user.click(screen.getByRole("button", { name: /Load demo candidates/i }));
    await user.click(screen.getByRole("button", { name: /Analyze candidates/i }));
    await screen.findByRole("heading", { name: "Maya Chen" });

    await user.upload(screen.getByLabelText(/Upload PDF or DOCX resumes/i), makeFile("someone_else.pdf"));

    expect(await screen.findByRole("alert", { name: /Stale analysis/i })).toBeInTheDocument();
  });

  it("3. marks results stale after editing the job description post-analysis", async () => {
    const user = userEvent.setup();
    vi.mocked(analyzeCandidates).mockResolvedValueOnce(analysisResponse(allDemoCandidates(), "demo_fallback"));
    await renderApp();

    await user.click(screen.getByRole("button", { name: /Load demo candidates/i }));
    await user.click(screen.getByRole("button", { name: /Analyze candidates/i }));
    await screen.findByRole("heading", { name: "Maya Chen" });

    await user.type(screen.getByLabelText(/Role details/i), " extra detail");

    expect(await screen.findByRole("alert", { name: /Stale analysis/i })).toBeInTheDocument();
  });

  it("4. marks results stale after removing a candidate from the current selection", async () => {
    const user = userEvent.setup();
    vi.mocked(analyzeCandidates).mockResolvedValueOnce(
      analysisResponse([candidate("doc-1", "Cand One"), candidate("doc-2", "Cand Two")], "live_ai")
    );
    await renderApp();

    const input = screen.getByLabelText(/Upload PDF or DOCX resumes/i);
    await user.upload(input, [makeFile("one.pdf"), makeFile("two.pdf")]);
    await user.click(screen.getByRole("button", { name: /Analyze candidates/i }));
    await screen.findByRole("heading", { name: "Cand One" });

    // Re-selecting the file input with one fewer file simulates removing a candidate.
    await user.upload(input, [makeFile("one.pdf")]);

    expect(await screen.findByRole("alert", { name: /Stale analysis/i })).toBeInTheDocument();
  });

  it("5. discards an in-flight analysis result if inputs change before it resolves", async () => {
    const user = userEvent.setup();
    const pending = deferred<AnalyzeResponse>();
    vi.mocked(analyzeCandidates).mockReturnValueOnce(pending.promise);
    await renderApp();

    await user.click(screen.getByRole("button", { name: /Load demo candidates/i }));
    await user.click(screen.getByRole("button", { name: /Analyze candidates/i }));

    // Change inputs while the request is still in flight.
    await user.type(screen.getByLabelText(/Role details/i), " more requirements");

    pending.resolve(analysisResponse(allDemoCandidates(), "demo_fallback"));

    await waitFor(() => expect(screen.queryByText(/Load a job and up to three candidates/i)).toBeInTheDocument());
    expect(screen.queryByRole("heading", { name: "Maya Chen" })).not.toBeInTheDocument();
  });

  it("6. ignores an old response after a newer request has started", async () => {
    const user = userEvent.setup();
    const first = deferred<AnalyzeResponse>();
    const second = deferred<AnalyzeResponse>();
    vi.mocked(analyzeCandidates).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    await renderApp();

    await user.click(screen.getByRole("button", { name: /Load demo candidates/i }));
    await user.click(screen.getByRole("button", { name: /Analyze candidates/i }));
    await user.click(screen.getByRole("button", { name: /Analyze candidates/i }));

    // The newer (second) request resolves first with the correct current result.
    second.resolve(analysisResponse(allDemoCandidates(), "demo_fallback"));
    await screen.findByRole("heading", { name: "Maya Chen" });

    // The older (first) request resolves late with a different, stale payload.
    first.resolve(analysisResponse(allDemoCandidates(" (OLD)"), "demo_fallback"));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByRole("heading", { name: "Maya Chen" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Owen Rivera (OLD)" })).not.toBeInTheDocument();
  });

  it("7. marks results stale when switching from demo mode to live upload mode", async () => {
    const user = userEvent.setup();
    vi.mocked(analyzeCandidates).mockResolvedValueOnce(analysisResponse(allDemoCandidates(), "demo_fallback"));
    await renderApp();

    await user.click(screen.getByRole("button", { name: /Load demo candidates/i }));
    await user.click(screen.getByRole("button", { name: /Analyze candidates/i }));
    await screen.findByRole("heading", { name: "Maya Chen" });

    await user.upload(screen.getByLabelText(/Upload PDF or DOCX resumes/i), makeFile("real_candidate.pdf"));

    expect(await screen.findByRole("alert", { name: /Stale analysis/i })).toBeInTheDocument();
  });

  it("8. marks results stale when switching from live upload mode to demo mode", async () => {
    const user = userEvent.setup();
    vi.mocked(analyzeCandidates).mockResolvedValueOnce(
      analysisResponse([candidate("uploaded-doc-1", "Real Candidate")], "live_ai")
    );
    await renderApp();

    await user.upload(screen.getByLabelText(/Upload PDF or DOCX resumes/i), makeFile("real_candidate.pdf"));
    await user.click(screen.getByRole("button", { name: /Analyze candidates/i }));
    await screen.findByRole("heading", { name: "Real Candidate" });

    await user.click(screen.getByRole("button", { name: /Load demo candidates/i }));

    expect(await screen.findByRole("alert", { name: /Stale analysis/i })).toBeInTheDocument();
  });

  it("9. rejects a response whose candidate id was not in the current request", async () => {
    const user = userEvent.setup();
    vi.mocked(analyzeCandidates).mockResolvedValueOnce(
      analysisResponse([candidate("not-a-requested-id", "Impostor")], "demo_fallback")
    );
    await renderApp();

    await user.click(screen.getByRole("button", { name: /Load demo candidates/i }));
    await user.click(screen.getByRole("button", { name: /Analyze candidates/i }));

    await waitFor(() => expect(screen.getByText(/did not match the request/i)).toBeInTheDocument());
    expect(screen.queryByRole("heading", { name: "Impostor" })).not.toBeInTheDocument();
  });

  it("10. keeps chips, review queue, detail, and mode metadata in agreement after a clean analysis", async () => {
    const user = userEvent.setup();
    vi.mocked(analyzeCandidates).mockResolvedValueOnce(analysisResponse(allDemoCandidates(), "demo_fallback"));
    await renderApp();

    await user.click(screen.getByRole("button", { name: /Load demo candidates/i }));
    await user.click(screen.getByRole("button", { name: /Analyze candidates/i }));
    await screen.findByRole("heading", { name: "Maya Chen" });

    const queue = screen.getByRole("region", { name: /Review queue/i });
    expect(within(queue).getByText("Maya Chen")).toBeInTheDocument();
    expect(within(queue).getByText("Owen Rivera")).toBeInTheDocument();

    const detail = screen.getByRole("region", { name: /Candidate evidence view/i });
    expect(within(detail).getByRole("heading", { name: "Maya Chen" })).toBeInTheDocument();

    expect(screen.getByText("Demo fallback")).toBeInTheDocument();
    expect(screen.queryByRole("alert", { name: /Stale analysis/i })).not.toBeInTheDocument();
  });

  it("11. keeps long upload filenames and low scores inside their workspace containers", async () => {
    const user = userEvent.setup();
    const longFileName = "Nicole_Rodriguez_Exponent_YouTube_Channel_Manager_Portfolio_Resume_With_A_Very_Long_File_Name_For_Overflow_Testing.pdf";
    vi.mocked(analyzeCandidates).mockResolvedValueOnce(
      analysisResponse([
        {
          ...candidate("uploaded-long-doc", "Nicole Rodriguez With A Long Candidate Name"),
          match_indicator: 10,
          criterion_results: [
            {
              criterion_id: "sql",
              status: "not_found",
              evidence: null,
              evidence_location: null
            }
          ]
        }
      ], "live_ai")
    );
    await renderApp();

    await user.click(screen.getByRole("button", { name: /Load demo job/i }));
    await user.click(screen.getByRole("button", { name: /Load demo candidates/i }));
    await user.upload(screen.getByLabelText(/Upload PDF or DOCX resumes/i), makeFile(longFileName));
    await user.click(screen.getByRole("button", { name: /Analyze candidates/i }));

    const fileChip = screen.getByTitle(longFileName);
    expect(fileChip).toHaveClass("file-chip");
    expect(fileChip).toHaveTextContent(longFileName);

    const detail = await screen.findByRole("region", { name: /Candidate evidence view/i });
    const scoreContext = within(detail).getByRole("group", { name: /Score context/i });
    expect(within(scoreContext).getByText("10")).toBeInTheDocument();
    expect(within(scoreContext).getByText("of 100")).toBeInTheDocument();
  });
});

describe("input session vs recruiter status persistence", () => {
  it("does not restore demo inputs or analysis from sessionStorage on mount", async () => {
    window.sessionStorage.setItem(
      "ruvia:last-demo-run:v1",
      JSON.stringify({
        demoJobId: "demo-role-revenue-ops-analyst",
        demoCandidateIds: [
          "demo-candidate-maya-chen",
          "demo-candidate-owen-rivera",
          "demo-candidate-sam-patel"
        ]
      })
    );
    await renderApp();

    expect(screen.getByLabelText(/Role details/i)).toHaveValue("");
    expect(screen.getByText(/No candidates selected/i)).toBeInTheDocument();
    expect(screen.getByText(/Load a job and up to three candidates/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Maya Chen" })).not.toBeInTheDocument();
    expect(analyzeCandidates).not.toHaveBeenCalled();
  });

  it("keeps saved recruiter statuses after refresh while leaving the input session empty", async () => {
    window.localStorage.setItem(
      "ruvia:candidate-statuses:v1",
      JSON.stringify({ "demo-candidate-maya-chen": "Interview" })
    );
    const user = userEvent.setup();
    vi.mocked(analyzeCandidates).mockResolvedValueOnce(analysisResponse(allDemoCandidates(), "demo_fallback"));
    await renderApp();

    expect(screen.getByLabelText(/Role details/i)).toHaveValue("");
    await user.click(screen.getByRole("button", { name: /Load demo job/i }));
    await user.click(screen.getByRole("button", { name: /Load demo candidates/i }));
    await user.click(screen.getByRole("button", { name: /Analyze candidates/i }));
    await screen.findByRole("heading", { name: "Maya Chen" });

    expect(screen.getByLabelText(/Recruiter status/i)).toHaveValue("Interview");
  });

  it("reset workspace clears the input session without clearing saved recruiter statuses", async () => {
    const user = userEvent.setup();
    vi.mocked(analyzeCandidates).mockResolvedValueOnce(analysisResponse(allDemoCandidates(), "demo_fallback"));
    await renderApp();

    await user.click(screen.getByRole("button", { name: /Load demo job/i }));
    await user.click(screen.getByRole("button", { name: /Load demo candidates/i }));
    await user.click(screen.getByRole("button", { name: /Analyze candidates/i }));
    await screen.findByRole("heading", { name: "Maya Chen" });

    await user.selectOptions(screen.getByLabelText(/Recruiter status/i), "Interview");
    expect(window.localStorage.getItem("ruvia:candidate-statuses:v1")).toContain("Interview");

    await user.click(screen.getByRole("button", { name: /Reset workspace/i }));

    expect(screen.getByLabelText(/Role details/i)).toHaveValue("");
    expect(screen.getByText(/No candidates selected/i)).toBeInTheDocument();
    expect(screen.getByText(/Load a job and up to three candidates/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Maya Chen" })).not.toBeInTheDocument();
    expect(window.localStorage.getItem("ruvia:candidate-statuses:v1")).toContain("Interview");

    vi.mocked(analyzeCandidates).mockResolvedValueOnce(analysisResponse(allDemoCandidates(), "demo_fallback"));
    await user.click(screen.getByRole("button", { name: /Load demo job/i }));
    await user.click(screen.getByRole("button", { name: /Load demo candidates/i }));
    await user.click(screen.getByRole("button", { name: /Analyze candidates/i }));
    await screen.findByRole("heading", { name: "Maya Chen" });
    expect(screen.getByLabelText(/Recruiter status/i)).toHaveValue("Interview");
  });
});

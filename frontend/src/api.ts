import type { AnalyzeResponse, DemoResponse, DraftResponse } from "./types";

const API_BASE = "";

export async function fetchDemo(): Promise<DemoResponse> {
  const response = await fetch(`${API_BASE}/api/demo`);
  if (!response.ok) {
    throw await apiError(response);
  }
  return response.json();
}

export async function analyzeCandidates(input: {
  jobDescription: string;
  demoJobId: string | null;
  demoCandidateIds: string[];
  files: File[];
}): Promise<AnalyzeResponse> {
  const formData = new FormData();
  formData.set("job_description", input.jobDescription);
  if (input.demoJobId) {
    formData.set("demo_job_id", input.demoJobId);
  }
  if (input.demoCandidateIds.length > 0) {
    formData.set("demo_candidate_ids", JSON.stringify(input.demoCandidateIds));
  }
  input.files.forEach((file) => formData.append("files", file));

  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    body: formData
  });
  if (!response.ok) {
    throw await apiError(response);
  }
  return response.json();
}

export async function draftInterview(input: {
  candidateName: string;
  jobTitle: string;
  recruiterName: string;
  interviewDetails: string;
}): Promise<DraftResponse> {
  const response = await fetch(`${API_BASE}/api/draft-interview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      candidate_name: input.candidateName,
      job_title: input.jobTitle,
      recruiter_name: input.recruiterName || null,
      interview_details: input.interviewDetails || null
    })
  });
  if (!response.ok) {
    throw await apiError(response);
  }
  return response.json();
}

async function apiError(response: Response): Promise<Error> {
  try {
    const payload = await response.json();
    return new Error(payload.detail?.message ?? "Request failed");
  } catch {
    return new Error("Request failed");
  }
}

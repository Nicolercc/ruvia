import type { CandidateStatus } from "./types";

const KEY = "ruvia:candidate-statuses:v1";

export type StatusMap = Record<string, CandidateStatus>;

export function loadStatuses(): StatusMap {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StatusMap;
  } catch {
    return {};
  }
}

export function saveStatuses(statuses: StatusMap): void {
  window.localStorage.setItem(KEY, JSON.stringify(statuses));
}

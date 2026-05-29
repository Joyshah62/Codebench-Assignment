import { HISTORY_KEY } from '../constants';

export function loadAttemptHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveAttemptHistory(attempt) {
  const history = loadAttemptHistory();
  const updated = [attempt, ...history].slice(0, 40);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

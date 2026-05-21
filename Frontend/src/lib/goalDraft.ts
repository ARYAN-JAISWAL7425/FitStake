// Persists in-progress goal selection across GoalSetup → StakeSelect → PlanReview
// navigation. Cleared once a cycle is successfully created.

export type DraftGoal = {
  id: string;
  templateId: 'steps' | 'strength' | 'water' | 'sleep' | 'diet' | 'cardio';
  title: string;
  target: string; // kept as string so input field controls it; parsed to number on submit
  unit: string;
};

const KEY = 'fitstake.goalDraft';

export function getGoalDraft(): DraftGoal[] | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as DraftGoal[];
  } catch {
    return null;
  }
}

export function setGoalDraft(goals: DraftGoal[]) {
  window.localStorage.setItem(KEY, JSON.stringify(goals));
}

export function clearGoalDraft() {
  window.localStorage.removeItem(KEY);
}

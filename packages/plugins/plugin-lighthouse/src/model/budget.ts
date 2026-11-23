//
// Copyright 2026 DXOS.org
//

import { type Budget } from '../client/types.ts';

export type BudgetPreset = 'quick' | 'standard' | 'deep';

/** The presets lighthouse's own UI offers; a Research stores the preset, the session the numbers. */
export const BUDGETS: Record<BudgetPreset, Budget> = {
  quick: { minutes: 5, usd: 0.2, pages: 15 },
  standard: { minutes: 10, usd: 0.5, pages: 40 },
  deep: { minutes: 30, usd: 2, pages: 150 },
};

/** "5 min · $0.20 · 15 pages". */
export const formatBudget = ({ minutes, usd, pages }: Budget): string =>
  [
    minutes !== undefined && `${minutes} min`,
    usd !== undefined && `$${usd.toFixed(2)}`,
    pages !== undefined && `${pages} pages`,
  ]
    .filter(Boolean)
    .join(' · ');

/**
 * The goal as the session receives it. The session API takes no engine list, so the engines the person chose are
 * named in the goal, the way the CLI's agent is told which engines to use.
 */
export const goalWithEngines = (goal: string, engines: readonly string[] | undefined): string =>
  engines?.length ? `${goal.trim()}\n\nUse these search engines: ${engines.join(', ')}.` : goal.trim();

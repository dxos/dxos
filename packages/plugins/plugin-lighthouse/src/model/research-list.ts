//
// Copyright 2026 DXOS.org
//

import { type Session } from '../client/types.ts';

/** A Research as the section's list shows it, like lighthouse's session list. */
export type ResearchRow = {
  id: string;
  name: string;
  goal: string;
  /** `running` while a turn is in flight; `new` before the first Run; else the session's status. */
  state: 'new' | 'unknown' | 'running' | 'idle' | 'reported' | 'failed' | 'stopped';
  pages?: number;
  usd?: number;
  startedAt?: string;
};

export const STATE_HUE: Record<ResearchRow['state'], 'amber' | 'emerald' | 'red' | 'neutral'> = {
  new: 'neutral',
  running: 'amber',
  idle: 'neutral',
  reported: 'emerald',
  failed: 'red',
  stopped: 'neutral',
  unknown: 'neutral',
};

/** One row from the Research and its lighthouse session (undefined until the list loads, or for a new one). */
export const toResearchRow = (
  research: { id: string; name?: string; goal: string; run?: string },
  session: Session | undefined,
): ResearchRow => {
  const state: ResearchRow['state'] = !research.run
    ? 'new'
    : !session
      ? 'unknown'
      : session.busy || session.status === 'running' || session.status === 'starting'
        ? 'running'
        : session.status;
  return {
    id: research.id,
    name: research.name?.trim() || research.goal.trim().split('\n')[0]?.slice(0, 80) || '',
    goal: research.goal || session?.goal || '',
    state,
    ...(session
      ? {
          pages: session.spent.pages,
          usd: session.spent.usd,
          ...(session.startedAt ? { startedAt: session.startedAt } : {}),
        }
      : {}),
  };
};

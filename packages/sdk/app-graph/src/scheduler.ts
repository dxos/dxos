//
// Copyright 2026 DXOS.org
//

// CF Workers / Node fallback: there is no main thread to yield to.
// scheduleTask runs the callback on the next microtask; yieldOrContinue is a microtask hop; update
// flushes have no frame budget.

import type * as GraphBuilder from '@dxos/graph/GraphBuilder';

type ScheduleOptions = { strategy?: 'smooth' | 'interactive' | 'idle'; signal?: AbortSignal };

export const scheduleTask = async <T>(callback: () => T | Promise<T>, _options?: ScheduleOptions): Promise<T> => {
  await Promise.resolve();
  return callback();
};

export const yieldOrContinue = async (_priority: 'smooth' | 'interactive' | 'idle'): Promise<void> => {
  await Promise.resolve();
};

/** A frame budget that a user action can lift until its task ends. */
export type FrameBudget = GraphBuilder.FrameBudget & {
  /** Lets update flushes ignore the budget until the current task ends. */
  flushBeforePaint(): void;
};

export const makeFrameBudget = (): FrameBudget | undefined => undefined;

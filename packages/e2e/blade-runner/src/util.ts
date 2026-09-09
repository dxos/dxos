//
// Copyright 2023 DXOS.org
//

import { asyncTimeout } from '@dxos/async';

export const randomArraySlice = <T>(array: T[], size: number) => {
  const result = [];
  const arrayCopy = [...array];
  for (let i = 0; i < size; i++) {
    const randomIndex = Math.floor(Math.random() * arrayCopy.length);
    result.push(arrayCopy[randomIndex]);
    arrayCopy.splice(randomIndex, 1);
  }
  return result;
};

/** An error as the artifact should record it: message, cause chain, and the top of the stack. */
export const describeError = (err: unknown): string => {
  if (!(err instanceof Error)) {
    return String(err);
  }
  const causes: string[] = [];
  for (let cause = err.cause; cause instanceof Error && causes.length < 4; cause = cause.cause) {
    causes.push(cause.message);
  }
  // Four frames: enough to name the call that threw without turning the summary table into a dump.
  const frames = (err.stack ?? '')
    .split('\n')
    .slice(1, 5)
    .map((line) => line.trim());
  return [err.message, ...causes.map((cause) => `caused by: ${cause}`), ...frames].join(' | ');
};

/**
 * Bound one call to a replicant.
 *
 * RPC to a replicant is created with `timeout: 0`, and the scheduler only rescues the run when a
 * replicant *dies* — a peer that is alive but stuck inside `flush`, a query or a join hangs the
 * orchestrator for as long as the job lasts, with no diagnosis. Every call a plan awaits gets a
 * deadline, so that becomes a named failure against a named peer.
 */
export const withDeadline = <T>(label: string, budgetMs: number, call: Promise<T>): Promise<T> =>
  asyncTimeout(call, budgetMs, new Error(`replicant call did not return within ${budgetMs}ms: ${label}`));

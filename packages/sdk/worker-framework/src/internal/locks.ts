//
// Copyright 2026 DXOS.org
//

import { asyncTimeout } from '@dxos/async';

import { WorkerConnectionError } from '../errors.ts';

/** Max time to wait for a coordinator/worker RPC reply during worker connect. */
export const LOCK_OR_RPC_WAIT_TIMEOUT = 15_000;

export const lockOrRpcTimeoutError = (operation: string, timeout = LOCK_OR_RPC_WAIT_TIMEOUT): Error =>
  new WorkerConnectionError({ message: `Worker connection timed out after ${timeout}ms: ${operation}.` });

export const waitWithLockOrRpcTimeout = <T>(promise: Promise<T>, operation: string): Promise<T> =>
  asyncTimeout(promise, LOCK_OR_RPC_WAIT_TIMEOUT, lockOrRpcTimeoutError(operation));

/**
 * Whether a Web Lock is currently held anywhere in this origin.
 *
 * Reports `false` when the query itself fails, so callers that only act on a held lock stay on the
 * side that does nothing rather than acting on an unverified assumption.
 */
export const isLockHeld = async (name: string): Promise<boolean> => {
  try {
    const { held } = await navigator.locks.query();
    return (held ?? []).some((lock) => lock.name === name);
  } catch {
    return false;
  }
};

export const isAbortError = (error: Error) => {
  return error.name === 'AbortError';
};

/**
 * Requests an exclusive Web Lock, waiting for as long as it takes to be granted.
 *
 * Acquisition is deliberately unbounded: for an election lock, "another holder has it" is the normal
 * steady state of every follower, so a timeout would both report healthy followers as failures and —
 * worse — drop them out of the lock's wait queue, leaving nobody positioned to take over when the
 * holder goes away. Only `ctxSignal` cancels the wait; a wedged (rather than dead) holder is handled
 * by the caller's steal path.
 */
export const requestExclusiveLock = (
  name: string,
  ctxSignal: AbortSignal,
  callback: () => Promise<void>,
): Promise<void> => navigator.locks.request<void>(name, { mode: 'exclusive', signal: ctxSignal }, callback);

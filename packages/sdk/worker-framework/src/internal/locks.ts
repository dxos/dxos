//
// Copyright 2026 DXOS.org
//

import { asyncTimeout } from '@dxos/async';

/** Max time to wait for a Web Lock or coordinator/worker RPC reply during worker connect. */
export const LOCK_OR_RPC_WAIT_TIMEOUT = 15_000;

export const lockOrRpcTimeoutError = (operation: string, timeout = LOCK_OR_RPC_WAIT_TIMEOUT): Error =>
  new Error(`Worker connection timed out after ${timeout}ms: ${operation}.`);

export const waitWithLockOrRpcTimeout = <T>(promise: Promise<T>, operation: string): Promise<T> =>
  asyncTimeout(promise, LOCK_OR_RPC_WAIT_TIMEOUT, lockOrRpcTimeoutError(operation));

export const isAbortError = (error: Error) => {
  return error.name === 'AbortError';
};

export const mergeAbortSignals = (signals: AbortSignal[]): AbortSignal => {
  if (typeof AbortSignal !== 'undefined' && 'any' in AbortSignal && typeof AbortSignal.any === 'function') {
    return AbortSignal.any(signals);
  }

  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
};

/**
 * Times out only lock acquisition; once the callback runs, the caller may hold the lock indefinitely.
 */
export const requestExclusiveLockWithTimeout = async (
  name: string,
  operation: string,
  ctxSignal: AbortSignal,
  callback: () => Promise<void>,
): Promise<void> => {
  const acquisitionTimedOut = new AbortController();
  const timeoutId = setTimeout(() => acquisitionTimedOut.abort(), LOCK_OR_RPC_WAIT_TIMEOUT);
  let acquired = false;

  try {
    await navigator.locks.request(
      name,
      { mode: 'exclusive', signal: mergeAbortSignals([ctxSignal, acquisitionTimedOut.signal]) },
      async () => {
        acquired = true;
        clearTimeout(timeoutId);
        await callback();
      },
    );
  } catch (error: any) {
    if (!acquired && acquisitionTimedOut.signal.aborted && !ctxSignal.aborted) {
      throw lockOrRpcTimeoutError(operation);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

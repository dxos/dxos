//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';
import * as Worker from '@dxos/worker-framework/Worker';

import { STORAGE_LOCK_KEY } from '../lock-key.ts';

/** How long to wait for a worker to let go of storage before giving up. */
const DEFAULT_TIMEOUT = 10_000;

export type WithPersistentStorageOptions = {
  /** Milliseconds to wait for the lock; the call rejects with `AbortError` once it elapses. */
  timeout?: number;
};

/**
 * Runs `fn` while no client worker holds the persistent client's storage.
 *
 * Rewriting OPFS from outside the client — importing a profile, say — needs the pool's sync access
 * handles released, and neither `client.destroy()` nor a page reload proves that: the handles belong
 * to the dedicated worker, which the browser tears down asynchronously after the document goes away.
 * A write that beats it fails with `NoModificationAllowedError`. The worker holds
 * {@link STORAGE_LOCK_KEY} for its whole life and releases it only once its SQLite connection is
 * closed (and the platform releases it if the worker is killed outright), so taking that lock is the
 * one reliable proof that the storage is free.
 */
export const withPersistentStorage = async <T>(
  fn: () => Promise<T>,
  { timeout = DEFAULT_TIMEOUT }: WithPersistentStorageOptions = {},
): Promise<T> => {
  // A worker in another tab holds the lock for as long as that tab lives, so ask it to stand down.
  // This tab's own worker displaces it a beat later regardless, so nothing is lost that was not.
  Worker.displace(STORAGE_LOCK_KEY);

  log('waiting for storage lock', { timeout });
  return navigator.locks.request(STORAGE_LOCK_KEY, { signal: AbortSignal.timeout(timeout) }, fn);
};

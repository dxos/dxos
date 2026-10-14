//
// Copyright 2024 DXOS.org
//

/**
 * Locks the storage to prevent multiple instances of the client from running.
 */
export const STORAGE_LOCK_KEY = 'dxos-client-worker';

/**
 * Held by the tab currently running the dedicated worker; its absence means no tab leads.
 */
export const LEADER_LOCK_KEY = '@dxos/client/DedicatedWorkerClientServices/LeaderLock';

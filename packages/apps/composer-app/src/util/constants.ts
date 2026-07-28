//
// Copyright 2023 DXOS.org
//

export const APP_KEY = 'composer.dxos.org';

/**
 * IndexedDB database name for the persistent log store.
 * Shared by the main thread and every Composer worker so all logs land in one
 * store and can be exported together.
 */
export const LOG_STORE_DB_NAME = 'composer-logs';

/**
 * Retention cap for the log store, and therefore the size of a feedback log upload: the client
 * trims its export to this, and the Cloudflare worker (`_worker.ts`) enforces the same ceiling.
 * One constant for both so a feedback report carries everything the store kept — a smaller upload
 * limit would discard logs the circular buffer deliberately retained. Passed explicitly to every
 * `IdbLogStore` rather than relying on the package default, so the two cannot drift.
 */
export const LOG_STORE_MAX_BYTES = 50 * 1024 * 1024;

/** Recovery mode entry point (minimal client, export, debug port). */
export const RECOVERY_PATH = '/recovery.html';

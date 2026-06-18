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
 * Maximum byte size for a feedback log upload.
 * Must match the limit enforced in the Cloudflare worker (`_worker.ts`).
 * Export trims to this size so the upload never exceeds the worker's cap.
 */
export const FEEDBACK_LOGS_MAX_SIZE = 50 * 1024 * 1024; // 50 MB

/** Recovery mode entry point (minimal client, export, debug port). */
export const RECOVERY_PATH = '/recovery.html';

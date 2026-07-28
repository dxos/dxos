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
 * Hard ceiling the Cloudflare worker (`_worker.ts`) enforces on a feedback log upload.
 * Deliberately well above {@link FEEDBACK_LOG_UPLOAD_MAX_SIZE} — it is a server-side abuse
 * guard, not the size clients aim for.
 */
export const FEEDBACK_LOGS_MAX_SIZE = 50 * 1024 * 1024; // 50 MB

/**
 * Byte size the feedback dialog trims the exported log store to before uploading.
 * Kept far below the log store's own 50 MB retention cap: exporting the full store produced
 * uploads large enough to fail at the transport layer (the browser only sees a rejected
 * `fetch`, with no status), and a few MB of recent lines is what a bug report actually needs.
 */
export const FEEDBACK_LOG_UPLOAD_MAX_SIZE = 8 * 1024 * 1024; // 8 MB

/** Recovery mode entry point (minimal client, export, debug port). */
export const RECOVERY_PATH = '/recovery.html';

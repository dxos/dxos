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

/** Worker route (`src/functions/_worker.ts`) that stores an uploaded feedback log bundle in R2. */
export const FEEDBACK_LOGS_PATH = '/api/feedback-logs';

/**
 * Origins the bundled desktop app serves its webview from — one localhost port per release channel,
 * mirroring `src-tauri/src/channel.rs`, where each port is permanent because it is the origin that
 * channel's profile storage lives under. The desktop build has no `/api` route of its own, so its
 * uploads reach the worker cross-origin and need an explicit allowance.
 */
export const DESKTOP_ORIGINS: ReadonlySet<string> = new Set(
  [26777, 26778, 26779, 26780].map((port) => `http://localhost:${port}`),
);

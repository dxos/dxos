//
// Copyright 2026 DXOS.org
//

/** Default port for `composer-recovery.js` — keep in sync with that script. */
export const RECOVERY_DEBUG_PORT = 9321;

/** Browser retry interval when the debug server is unreachable — keep in sync with `composer-recovery.js`. */
export const RECOVERY_DEBUG_RECONNECT_MS = 2_000;

/**
 * Debug server origin matching the page scheme.
 * HTTPS pages must use an HTTPS recovery server (mixed content blocks http://127.0.0.1).
 */
export const resolveRecoveryDebugOrigin = (port = RECOVERY_DEBUG_PORT): string => {
  const scheme = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https' : 'http';
  return `${scheme}://127.0.0.1:${port}`;
};

/** @deprecated Use {@link resolveRecoveryDebugOrigin}. */
export const RECOVERY_DEBUG_ORIGIN = `http://127.0.0.1:${RECOVERY_DEBUG_PORT}`;

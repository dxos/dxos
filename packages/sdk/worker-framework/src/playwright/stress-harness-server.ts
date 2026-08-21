//
// Copyright 2026 DXOS.org
//

/**
 * Port for the suite's own harness dev server (`harness/vite.config.ts`). Fixed and `strictPort`, so
 * a stale server from a previous run fails the launch loudly instead of the suite silently driving
 * yesterday's code.
 */
export const HARNESS_PORT = 9010;

export const HARNESS_URL = `http://localhost:${HARNESS_PORT}/`;

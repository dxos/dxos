//
// Copyright 2026 DXOS.org
//

import { PERF_HTTP2 } from '@dxos/perf-harness';

/**
 * Port the perf flow serves the bundle on, when `DX_PERF_PORT` moves it off the shared e2e port.
 *
 * Read by both the config and the spec. `reuseExistingServer` is on locally, so on the default
 * port a run silently measures whatever another worktree is serving there.
 */
export const PERF_PORT = Number.parseInt(process.env.DX_PERF_PORT ?? '', 10) || undefined;

/** Where the flows reach the bundle: `https` when `pnpm perf --http2` serves it over HTTP/2. */
export const PERF_ORIGIN = `${PERF_HTTP2 ? 'https' : 'http'}://127.0.0.1:${PERF_PORT ?? 4173}`;

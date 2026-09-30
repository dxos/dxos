//
// Copyright 2026 DXOS.org
//

/**
 * Port the perf flow serves the bundle on, when `DX_PERF_PORT` moves it off the shared e2e port.
 *
 * Read by both the config and the spec. `reuseExistingServer` is on locally, so on the default
 * port a run silently measures whatever another worktree is serving there.
 */
export const PERF_PORT = Number.parseInt(process.env.DX_PERF_PORT ?? '', 10) || undefined;

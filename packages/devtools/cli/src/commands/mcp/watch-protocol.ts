//
// Copyright 2026 DXOS.org
//

/**
 * Constants shared by `dx mcp serve` and its watch supervisor. They live apart from `watch.ts` so
 * the server can announce itself without a static import of the supervisor, which would defeat the
 * bundle-time strip in `scripts/build.ts`.
 */

/** Set by the supervisor on the child so it announces every (re)start. */
export const WATCH_CHILD_ENV = 'DX_MCP_WATCH_CHILD';

/**
 * Written to stderr once the child's MCP server is live. `bun --watch` reloads in place — same pid,
 * same pipes — so a process exit cannot mark the restart and this line is the only signal.
 */
export const WATCH_READY_SENTINEL = '@dxos/cli:mcp-serve-ready';

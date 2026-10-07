//
// Copyright 2026 DXOS.org
//

/**
 * Constants shared by `dx mcp serve` and its watch supervisor. They live apart from `watch.ts` so
 * the server can announce itself without pulling the supervisor into its own module graph — under
 * `bun --watch` an import of `watch.ts` would make the supervisor's own edits reload the child.
 */

/** Set by the supervisor on the child so it announces every (re)start. */
export const WATCH_CHILD_ENV = 'DX_MCP_WATCH_CHILD';

/**
 * Written to stderr once the child's MCP server is live. `bun --watch` reloads in place — same pid,
 * same pipes — so a process exit cannot mark the restart and this line is the only signal.
 */
export const WATCH_READY_SENTINEL = '@dxos/cli:mcp-serve-ready';

/**
 * What the child tells the supervisor when it comes up: the directories worth watching, which are
 * its `link`-installed (dev) plugins.
 *
 * Reported by the child rather than derived by the supervisor because the child is what actually
 * loaded them — it has the profile, the records and the resolved paths, and it re-reports on every
 * reload, so adding or removing a dev plugin re-arms the watch with no extra plumbing.
 */
export type WatchReady = {
  readonly watch: readonly string[];
  /** Set when the payload did not parse, so the supervisor can say why nothing is watched. */
  readonly malformed?: boolean;
};

/** The sentinel line the child writes. */
export const formatReady = ({ watch }: WatchReady): string => `${WATCH_READY_SENTINEL} ${JSON.stringify({ watch })}`;

/**
 * Reads a stderr line as the ready sentinel, or `undefined` when it is ordinary log output. A bare
 * sentinel with no payload reports nothing to watch, which is what a child with no dev plugins —
 * and any older child — means.
 */
export const parseReady = (line: string): WatchReady | undefined => {
  if (!line.startsWith(WATCH_READY_SENTINEL)) {
    return undefined;
  }
  const payload = line.slice(WATCH_READY_SENTINEL.length).trim();
  if (payload.length === 0) {
    return { watch: [] };
  }
  try {
    const parsed = JSON.parse(payload);
    const watch = Array.isArray(parsed?.watch)
      ? parsed.watch.filter((entry: unknown) => typeof entry === 'string')
      : [];
    return { watch };
  } catch {
    return { watch: [], malformed: true };
  }
};

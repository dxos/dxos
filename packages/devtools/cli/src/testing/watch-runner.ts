//
// Copyright 2026 DXOS.org
//

import { EffectEx } from '@dxos/effect';

import { runWatchSupervisor } from '../commands/mcp/watch';

/**
 * Runs the MCP watch supervisor against an arbitrary entry so `watch.test.ts` can exercise the
 * reload handshake against a stub server, rather than paying for a client boot per reload.
 */
const entry = process.argv[2];
if (!entry) {
  process.stderr.write('usage: watch-runner <entry>\n');
  process.exit(1);
}

await EffectEx.runPromise(runWatchSupervisor({ entry, args: [] }));

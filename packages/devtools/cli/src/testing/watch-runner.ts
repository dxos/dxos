//
// Copyright 2026 DXOS.org
//

import { EffectEx } from '@dxos/effect';

import { type WatchSupervisorOptions, runWatchSupervisor } from '../commands/mcp/watch';

/**
 * Runs the MCP watch supervisor against a stub server so `watch.test.ts` can exercise both reload
 * strategies without a client boot per reload — or, for the binary strategy, a compiled binary.
 * Options arrive as one JSON argument.
 */
const options: WatchSupervisorOptions = JSON.parse(process.argv[2] ?? '{}');
if (!options.entry && !options.args?.length) {
  process.stderr.write('usage: watch-runner \'{"entry":"<path>"}\'\n');
  process.exit(1);
}

await EffectEx.runPromise(runWatchSupervisor(options));

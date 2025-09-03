#!/usr/bin/env node

//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';
import { NodeContext, NodeRuntime } from '@effect/platform-node';
import { Cause, Effect, Exit, Layer, Logger } from 'effect';

import { unrefTimeout } from '@dxos/async';
import { LogLevel, levels, log } from '@dxos/log';

import { dx } from './commands';
import { DXOS_VERSION } from './version';

let filter = LogLevel.ERROR;
const level = process.env.DX_DEBUG;
if (level) {
  filter = levels[level] ?? LogLevel.ERROR;
}
log.config({ filter });

let leaksTracker: any;
if (process.env.DX_TRACK_LEAKS) {
  const wtf = await import('wtfnode');
  leaksTracker = wtf;
}

const run = Command.run(dx, {
  name: 'DXOS CLI',
  version: DXOS_VERSION,
});

const EXIT_GRACE_PERIOD = 1_000;
const FORCE_EXIT = true;

// Work around Effect type system limitation where Requirements type becomes overly restrictive.
const program = run(process.argv).pipe(
  Effect.provide(Layer.mergeAll(NodeContext.layer, Logger.pretty)),
  Effect.scoped,
) as Effect.Effect<void, unknown>;

NodeRuntime.runMain(program, {
  teardown: (exit, onExit) => {
    const exitCode = Exit.isFailure(exit) && !Cause.isInterruptedOnly(exit.cause) ? 1 : 0;
    onExit(exitCode);
    if (FORCE_EXIT) {
      process.exit(exitCode);
    } else {
      const timeout = setTimeout(() => {
        log.error('Process did not exit within grace period. There may be a leak.');
        if (process.env.DX_TRACK_LEAKS) {
          leaksTracker.dump();
        } else {
          log.error('Re-run with DX_TRACK_LEAKS=1 to dump information about leaks.');
        }
      }, EXIT_GRACE_PERIOD);
      // Don't block process exit.
      unrefTimeout(timeout);
    }
  },
});

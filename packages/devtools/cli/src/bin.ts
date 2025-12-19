#!/usr/bin/env node

//
// Copyright 2025 DXOS.org
//

import * as BunContext from '@effect/platform-bun/BunContext';
import * as BunRuntime from '@effect/platform-bun/BunRuntime';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Logger from 'effect/Logger';

import { unrefTimeout } from '@dxos/async';
import { LogLevel, levels, log } from '@dxos/log';

import { run } from './commands';

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

const EXIT_GRACE_PERIOD = 1_000;
const FORCE_EXIT = true;

// Work around Effect type system limitation where Requirements type becomes overly restrictive.
const program = run(process.argv).pipe(
  Effect.provide(Layer.mergeAll(BunContext.layer, Logger.pretty)),
  Effect.scoped,
) as Effect.Effect<void, unknown>;

BunRuntime.runMain(program, {
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

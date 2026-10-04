#!/usr/bin/env bun
//
// Copyright 2026 DXOS.org
//

import * as BunRuntime from '@effect/platform-bun/BunRuntime';
import * as BunServices from '@effect/platform-bun/BunServices';
import * as Cause from 'effect/Cause';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as References from 'effect/References';
import * as Runtime from 'effect/Runtime';

import { Cli } from '../src/index.ts';

const isOwnError = (error: unknown): error is Error =>
  error instanceof Error && '_tag' in error && typeof error._tag === 'string' && error._tag.startsWith('code-index/');

// Diagnostics go to stderr, failures included: stdout is data, and for `mcp` it is the protocol. The
// failure is reported here rather than by `runMain`, whose own report runs outside this logger setting.
Cli.run(process.argv.slice(2)).pipe(
  Effect.provide(BunServices.layer),
  Effect.tapCause((cause) => {
    const error = Cause.squash(cause);
    if (Cause.hasInterruptsOnly(cause) || !Runtime.getErrorReported(error)) {
      return Effect.void;
    }
    // Our own tagged errors are written for the user, so their message alone is the report; a stack
    // trace under it buries the one line that says what to do.
    if (!isOwnError(error)) {
      return Effect.logError(cause);
    }
    const reason = error.cause instanceof Error ? `\n  caused by: ${error.cause.message.split('\n')[0]}` : '';
    return Console.error(`code-index: ${error.message}${reason}`);
  }),
  Effect.provideService(References.LogToStderr, true),
  Effect.scoped,
  BunRuntime.runMain({ disableErrorReporting: true }),
);

#!/usr/bin/env bun
//
// Copyright 2026 DXOS.org
//

import * as BunRuntime from '@effect/platform-bun/BunRuntime';
import * as BunServices from '@effect/platform-bun/BunServices';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as References from 'effect/References';
import * as Runtime from 'effect/Runtime';

import { Cli } from '../src/index.ts';

// Diagnostics go to stderr, failures included: stdout is data, and for `mcp` it is the protocol. The
// failure is reported here rather than by `runMain`, whose own report runs outside this logger setting.
Cli.run(process.argv.slice(2)).pipe(
  Effect.provide(BunServices.layer),
  Effect.tapCause((cause) =>
    Cause.hasInterruptsOnly(cause) || !Runtime.getErrorReported(Cause.squash(cause))
      ? Effect.void
      : Effect.logError(cause),
  ),
  Effect.provideService(References.LogToStderr, true),
  Effect.scoped,
  BunRuntime.runMain({ disableErrorReporting: true }),
);

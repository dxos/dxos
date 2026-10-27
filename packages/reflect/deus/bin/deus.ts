#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

import * as NodeRuntime from '@effect/platform-node/NodeRuntime';
import * as NodeServices from '@effect/platform-node/NodeServices';
import * as Cause from 'effect/Cause';
import * as CliError from 'effect/cli/CliError';
import * as Command from 'effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import {
  ChangelogCheckError,
  FeatureCheckError,
  LintError,
  QaLintError,
  ReviewCheckError,
  deus,
} from '../src/cli/index.ts';

const VERSION = '0.0.0';

/** Failures whose details are already on screen: CLI usage errors and the findings of a failed check. */
const isReported = (error: unknown): boolean =>
  CliError.isCliError(error) ||
  ChangelogCheckError.is(error) ||
  FeatureCheckError.is(error) ||
  LintError.is(error) ||
  QaLintError.is(error) ||
  ReviewCheckError.is(error);

// A reported failure exits non-zero with no further output; any other failure prints its message.
Command.runWith(deus, { version: VERSION })(process.argv.slice(2)).pipe(
  Effect.tapCause((cause) => {
    const error = Cause.squash(cause);
    return Cause.hasInterruptsOnly(cause) || isReported(error) ? Effect.void : Console.error(`deus: ${error}`);
  }),
  Effect.provide(NodeServices.layer),
  NodeRuntime.runMain({ disableErrorReporting: true }),
);

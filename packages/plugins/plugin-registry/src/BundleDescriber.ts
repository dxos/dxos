//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';

import { BaseError } from '@dxos/errors';

/** The bundle failed `describe()`, or could not be loaded to run it. */
export class DescribeError extends BaseError.extend('DescribeError', 'Plugin bundle failed describe().') {}

/**
 * Runs a built bundle's `describe()` on a local workerd before `dx registry publish` uploads it, as the registry does on
 * upload, so a bundle that fails to activate on EDGE is never published. Provided by the host running the command.
 */
export class Service extends Context.Service<
  Service,
  {
    /** Environment the plugin's build command runs with, so the bundle carries what `describe()` needs. */
    readonly buildEnv: Effect.Effect<Readonly<Record<string, string>>, DescribeError>;
    /** Loads the bundle in `dir` and returns a one-line summary of what it contributes on EDGE. */
    readonly describe: (dir: string) => Effect.Effect<string, DescribeError>;
  }
>()('@dxos/plugin-registry/BundleDescriber') {}

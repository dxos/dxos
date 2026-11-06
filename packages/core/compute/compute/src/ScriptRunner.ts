//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as Operation from './Operation.ts';

/**
 * The script backend a runtime runs script operations with.
 *
 * A dependency of the runtime, not of a caller: a client invokes a script operation like any other
 * operation (`Operation.invoke(script, input, { on })`) and never names this. It is a service so a
 * deployment chooses where scripts execute — in process, on a worker thread, in a contained isolate —
 * by providing a different layer to the process manager.
 */
export class Service extends Context.Service<Service, Operation.ScriptRunner>()('@dxos/compute/ScriptRunner') {}

/** Installs `runner` as the runtime's script backend. */
export const layer = (runner: Operation.ScriptRunner): Layer.Layer<Service> => Layer.succeed(Service, runner);

/**
 * Routes each request to the backend registered for its dialect, failing a dialect none claims.
 *
 * Dialect-keyed rather than one backend per deployment because the dialects differ in what their
 * bindings are, not in where they run: a runtime serving code mode's two dialects needs both, in the
 * same place.
 */
export const byDialect = (
  runners: Partial<Record<Operation.ScriptDialect, Operation.ScriptRunner>>,
): Operation.ScriptRunner => ({
  run: (request, runtime) =>
    Effect.suspend(() => {
      const dialect = Operation.scriptDialectOf(request.source);
      const runner = runners[dialect];
      return runner === undefined
        ? Effect.fail(
            new Operation.ScriptError({
              message: `No backend for dialect "${dialect}"; this runtime serves ${Object.keys(runners).join(', ') || 'none'}.`,
              dialect,
            }),
          )
        : runner.run(request, runtime);
    }),
});

//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import * as Process from '@dxos/compute/Process';
import * as ScriptRunner from '@dxos/compute/ScriptRunner';
import * as Trace from '@dxos/compute/Trace';

/**
 * Key the script process is hosted under. Stable and spelled out, because it is what crosses the
 * wire: a remote spawn sends the key and nothing else, so an EDGE runtime hosting this process under
 * the same key serves `runScript({ location: { kind: 'edge', … } })` with no further wiring.
 */
export const SCRIPT_PROCESS_KEY = 'org.dxos.script.run';

/**
 * Runs a script as a process: one input, one output, over the runtime's own {@link ScriptRunner.Service}.
 *
 * Why a process rather than a direct call: a process is the one execution surface that already routes
 * local and remote, so a caller chooses where its script runs by naming a location rather than by
 * holding a different runner. It also puts every run in the trace tree beside the operations it calls.
 */
export const ScriptProcess: Operation.Durable<ScriptRunner.Request, ScriptRunner.Result, ScriptRunner.Service> =
  Operation.makeDurable({
    key: SCRIPT_PROCESS_KEY,
    name: 'Script',
    input: ScriptRunner.Request,
    output: ScriptRunner.Result,
    services: [ScriptRunner.Service],
    // A script interrupted mid-run cannot be resumed — its evaluation state is in the runtime that
    // was running it — so the process is kept in memory rather than persisted for a later retry.
    resumable: false,
  }).pipe(
    Operation.withDurableHandler((ctx) =>
      Effect.gen(function* () {
        const runner = yield* ScriptRunner.Service;
        return {
          onInput: (request: ScriptRunner.Request) =>
            Effect.gen(function* () {
              const dialect = yield* ScriptRunner.dialectOf(request.source);
              yield* Trace.write(Trace.OperationStart, { key: SCRIPT_PROCESS_KEY, name: `script (${dialect})` });
              const result = yield* runner.run(request);
              ctx.submitOutput(result);
              ctx.succeed();
              yield* Trace.write(Trace.OperationEnd, {
                key: SCRIPT_PROCESS_KEY,
                name: `script (${dialect})`,
                outcome: result.error === undefined ? 'success' : 'failure',
                ...(result.error !== undefined ? { error: result.error } : {}),
              });
            }).pipe(
              // A runner failure (no backend for the dialect, a source that would not resolve) is the
              // deployment's fault, not the script's, so it terminates the process rather than being
              // reported as output the caller would read as the script's own error.
              Effect.catchTag('ScriptRunnerError', (error) => Effect.die(error)),
            ),
        };
      }),
    ),
  );

/**
 * Runs one script through the process manager, on this runtime or on EDGE.
 *
 * The only API a caller needs: `location` picks the runtime, and the result is the script's own —
 * what it printed, and its error when it failed.
 */
export const runScript = (
  request: ScriptRunner.Request,
  options?: Process.SpawnOptions & Process.LocationOptions,
): Effect.Effect<ScriptRunner.Result, never, Process.ManagerService> =>
  Effect.gen(function* () {
    const handle = yield* Process.spawn(ScriptProcess, request, options);
    return yield* Process.awaitOutput(handle);
  });

/** A {@link ScriptRunner.Runner} that runs every request through the process manager at `location`. */
export const runner = (
  options?: Process.SpawnOptions & Process.LocationOptions,
): Effect.Effect<ScriptRunner.Runner, never, Process.ManagerService> =>
  Effect.map(Effect.context<Process.ManagerService>(), (context): ScriptRunner.Runner => ({
    run: (request) => runScript(request, options).pipe(Effect.provide(context)),
  }));

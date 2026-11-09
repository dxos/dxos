//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import * as Process from '@dxos/compute/Process';
import * as ScriptRunner from '@dxos/compute/ScriptRunner';
import * as Trace from '@dxos/compute/Trace';
import { DXN } from '@dxos/echo';

/**
 * The process a script operation runs as.
 *
 * A script operation carries code rather than a handler, so the runtime turns it into a process of
 * its own and spawns that through the ordinary `Process.Manager.spawn` — no separate verb, and the
 * run is a process like any other: a pid in the same tree, a parent, its guard, its storage, and
 * children of its own. Keyed by the operation, so the run sits under the key a reader already knows
 * and an EDGE runtime resolves the same operation by.
 */
export const make = <I, O>(
  op: Operation.ScriptDefinition<I, O>,
): Operation.Durable<I, O, ScriptRunner.Service | Operation.ScriptRequirements> =>
  Operation.makeDurable({
    key: DXN.getName(op.meta.key),
    name: op.meta.name ?? String(op.meta.key),
    // The operation's own codecs, so the process is typed as the operation a caller invoked.
    input: op.input,
    output: op.output,
    // The backend, plus what it runs the script against: a script's calls and children are its own
    // process's, which is what `Operation.ScriptRequirements` names.
    services: [ScriptRunner.Service, Operation.Service, Process.ManagerService],
    // A script interrupted mid-run cannot be resumed: its evaluation state belonged to the runtime
    // that was running it, which a restart has already lost.
    resumable: false,
  }).pipe(
    Operation.withDurableHandler((ctx) =>
      Effect.gen(function* () {
        const runner = yield* ScriptRunner.Service;
        return {
          onInput: (input: I) =>
            Effect.gen(function* () {
              yield* Trace.write(Trace.OperationStart, {
                key: String(op.meta.key),
                name: op.meta.name,
                icon: op.meta.icon,
              });
              // The script's own process, so what its code invokes and spawns belongs to this
              // process rather than to whoever asked for the script.
              const context = yield* Effect.context<Operation.ScriptRequirements>();
              const result = yield* runner.run(Operation.scriptRequest(op, input), { context });
              // Decoded against the operation's declared output, which defaults to
              // `Operation.ScriptResult`: an operation that declares something else is declaring a
              // value no backend produces, and this is where that is said rather than inferred.
              const output = yield* Schema.decodeUnknownEffect(Schema.toType(op.output))(result).pipe(
                Effect.mapError(
                  (error) =>
                    new Operation.ScriptError({
                      message: `Script operation '${op.meta.key}' declares an output its run does not produce: ${String(error)}`,
                    }),
                ),
              );
              ctx.submitOutput(output);
              ctx.succeed();
              yield* Trace.write(Trace.OperationEnd, {
                key: String(op.meta.key),
                name: op.meta.name,
                icon: op.meta.icon,
                outcome: result.error === undefined ? 'success' : 'failure',
                ...(result.error !== undefined ? { error: result.error } : {}),
              });
            }).pipe(
              // A backend failure (no runner for the dialect, a source that will not resolve) is the
              // deployment's fault, not the script's, so it fails the process rather than being
              // reported as output a caller would read as the script's own error.
              Effect.catchTag('ScriptError', (error) => Effect.die(error)),
            ),
        };
      }),
    ),
  );

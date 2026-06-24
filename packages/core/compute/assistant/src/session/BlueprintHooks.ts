//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import { Blueprint, Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

/**
 * Tag of the lifecycle point a hook fires at, matching {@link Blueprint.HookSpec}.
 */
export type HookPhase = 'begin-request' | 'end-request';

/**
 * Invokes a resolved operation with the hook's templated input. Begin and end hooks fire in
 * different contexts (the agent's turn fiber vs. a child process with Tier B reachable), so the
 * invocation strategy is supplied by the caller rather than fixed here. `R` carries the invoker's
 * own requirements (e.g. `Operation.Service`) up into {@link runHooks}.
 */
export type HookInvoker<R> = (
  operation: Operation.Definition.Any,
  input: Record<string, unknown>,
) => Effect.Effect<void, never, R>;

/**
 * Runs every {@link Blueprint.Hook} on `blueprints` whose spec matches `phase`. Each hook resolves
 * its `function` ref to a {@link Operation.PersistentOperation}, deserializes it to a definition, and
 * invokes it with the templated `input` via `invoke`. Hooks without a function ref are skipped.
 *
 * Hook failures are isolated: a throwing hook logs and is swallowed so one blueprint's hook cannot
 * abort the request lifecycle (or the sibling hooks).
 */
export const runHooks = <R>({
  blueprints,
  phase,
  invoke,
}: {
  blueprints: readonly Blueprint.Blueprint[];
  phase: HookPhase;
  invoke: HookInvoker<R>;
}): Effect.Effect<void, never, Database.Service | R> =>
  Effect.gen(function* () {
    for (const blueprint of blueprints) {
      for (const hook of blueprint.hooks ?? []) {
        if (hook.spec._tag !== phase) {
          continue;
        }
        if (!hook.function) {
          continue;
        }

        yield* Effect.gen(function* () {
          const record = yield* Database.load(hook.function!);
          invariant(Obj.instanceOf(Operation.PersistentOperation, record), 'Hook function must be an operation.');
          const operation = Operation.deserialize(record);
          // Hooks carry no event payload (the spec is a bare tag), so the input template is passed
          // through verbatim — the hook's operation reads any conversation state it needs itself.
          yield* invoke(operation, { ...hook.input });
        }).pipe(
          Effect.catchAllCause((cause) =>
            Effect.sync(() =>
              log.warn('blueprint hook failed', { phase, blueprint: Blueprint.getKey(blueprint), cause }),
            ),
          ),
        );
      }
    }
  });

//
// Copyright 2026 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Trigger, TriggerEvent } from '@dxos/compute';
import { Database, Filter, Query, Ref } from '@dxos/echo';

import { TriggerDispatcher, type TriggerRuntimeStatus } from './trigger-dispatcher';

/**
 * Derives a {@link Trigger.TriggerMonitorService} from the local {@link TriggerDispatcher}.
 * Provides a unified view of triggers across local and edge environments.
 */
export const TriggerMonitorLayer: Layer.Layer<
  Trigger.TriggerMonitorService,
  never,
  TriggerDispatcher | Database.Service | Registry.AtomRegistry
> = Layer.scoped(
  Trigger.TriggerMonitorService,
  Effect.gen(function* () {
    const dispatcher = yield* TriggerDispatcher;
    const database = yield* Database.Service;
    const registry = yield* Registry.AtomRegistry;

    const triggersAtom: Atom.Writable<readonly Trigger.State[]> = Atom.make<readonly Trigger.State[]>([]);

    /**
     * Derive state from dispatcher and database.
     * This runs every time either the dispatcher state or the database query results change.
     */
    const deriveState = Effect.gen(function* () {
      const dispatcherState = registry.get(dispatcher.state);
      const runtimeStatuses = new Map<string, TriggerRuntimeStatus>(
        dispatcherState.triggers.map((status) => [status.triggerId, status]),
      );

      const allTriggers = yield* Database.query(
        Query.select(Filter.type(Trigger.Trigger)).debugLabel('TriggerMonitorService.deriveState'),
      ).run;

      const states: Trigger.State[] = allTriggers
        .filter((trigger) => trigger.enabled)
        .map((trigger): Trigger.State => {
          const runtimeStatus: TriggerRuntimeStatus | undefined = runtimeStatuses.get(trigger.id);
          const isEdge = trigger.remote === true;

          return {
            trigger: Ref.make(trigger),
            environment: isEdge ? 'edge' : 'local',
            nextExecution: runtimeStatus?.nextExecution,
            cooldownUntil: runtimeStatus?.cooldownUntil,
            retry: runtimeStatus?.retryPending
              ? {
                  // The actual event is not exposed by TriggerRuntimeStatus, so we use a placeholder.
                  // The retry information is primarily useful for status display, not re-invocation.
                  event: {} as TriggerEvent.TriggerEvent,
                  enqueuedAt: 0,
                }
              : undefined,
            lastResult: runtimeStatus?.lastResult ?? null,
          };
        });

      registry.update(triggersAtom, () => states);
    });

    // Subscribe to dispatcher state changes to update the derived atom.
    const unsubscribeDispatcher = registry.subscribe(dispatcher.state, () => {
      Effect.runPromise(deriveState.pipe(Effect.provideService(Database.Service, database))).catch(() => {});
    });
    yield* Effect.addFinalizer(() => Effect.sync(unsubscribeDispatcher));

    // Perform initial derivation.
    yield* deriveState;

    const monitor: Trigger.Monitor = {
      triggers: triggersAtom,

      get localDispatcherEnabled() {
        return registry.get(dispatcher.state).enabled;
      },

      invokeTrigger: (options: Trigger.InvokeOptions) =>
        Effect.gen(function* () {
          yield* dispatcher.invokeTrigger({
            trigger: options.trigger,
            event: options.event,
          });
        }).pipe(Effect.asVoid),
    };

    return monitor;
  }),
);

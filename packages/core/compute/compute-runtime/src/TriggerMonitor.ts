//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Atom, Registry } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Trigger, TriggerEvent } from '@dxos/compute';
import { Database, Filter, Query, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';

import * as RemoteTriggerManager from './RemoteTriggerManager';
import { TriggerDispatcher, type TriggerRuntimeStatus } from './triggers/trigger-dispatcher';

/**
 * Aggregate {@link Trigger.TriggerMonitorService} that merges the local
 * {@link TriggerDispatcher} view with the remote
 * ({@link RemoteTriggerManager.Service}) one, providing a unified view of
 * triggers across local and edge environments. Provide
 * {@link RemoteTriggerManager.layerNoop} for local-only deployments.
 *
 * `invokeTrigger` routes by the trigger's `remote` flag: remote triggers are
 * dispatched via the remote manager, local ones via the local dispatcher.
 */
export const layer: Layer.Layer<
  Trigger.TriggerMonitorService,
  never,
  TriggerDispatcher | Database.Service | Registry.AtomRegistry | RemoteTriggerManager.Service
> = Layer.scoped(
  Trigger.TriggerMonitorService,
  Effect.gen(function* () {
    const dispatcher = yield* TriggerDispatcher;
    const database = yield* Database.Service;
    const registry = yield* Registry.AtomRegistry;
    const remote = yield* RemoteTriggerManager.Service;

    const localTriggersAtom: Atom.Writable<readonly Trigger.State[]> = Atom.make<readonly Trigger.State[]>([]);

    /**
     * Derive local state from dispatcher and database.
     * This runs every time either the dispatcher state or the database query results change.
     */
    const deriveState = Effect.gen(function* () {
      const dispatcherState = registry.get(dispatcher.state);
      const runtimeStatuses = new Map<string, TriggerRuntimeStatus>(
        dispatcherState.triggers.map((status) => [status.triggerId, status]),
      );

      const allTriggers = yield* Database.query(
        Query.select(Filter.type(Trigger.Trigger)).debugLabel('TriggerMonitor.deriveState'),
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

      registry.update(localTriggersAtom, () => states);
    });

    // Subscribe to dispatcher state changes to update the derived atom.
    const unsubscribeDispatcher = registry.subscribe(dispatcher.state, () => {
      EffectEx.runPromise(deriveState.pipe(Effect.provideService(Database.Service, database))).catch(() => {});
    });
    yield* Effect.addFinalizer(() => Effect.sync(unsubscribeDispatcher));

    // Perform initial derivation.
    yield* deriveState;

    // Aggregate local + remote trigger views. Edge triggers are ECHO objects replicated into the
    // local database, so they surface in both the database-derived `localTriggersAtom` (as bare
    // `environment: 'edge'` entries) and in `remote.triggers` (enriched with edge dispatcher runtime
    // status). Dedupe by trigger ref URI, letting the remote entry supersede the bare local one.
    const triggersAtom = Atom.make((get) => {
      const local = get(localTriggersAtom);
      const remoteStates = get(remote.triggers);
      const remoteKeys = new Set(remoteStates.map((state) => state.trigger.uri));
      return [...local.filter((state) => !remoteKeys.has(state.trigger.uri)), ...remoteStates];
    });
    registry.mount(triggersAtom);

    const monitor: Trigger.Monitor = {
      triggers: triggersAtom,

      get localDispatcherEnabled() {
        return registry.get(dispatcher.state).enabled;
      },

      invokeTrigger: (options: Trigger.InvokeOptions) =>
        options.trigger.remote === true
          ? remote.invokeTrigger(options)
          : dispatcher.invokeTrigger({ trigger: options.trigger, event: options.event }).pipe(Effect.asVoid),
    };

    return monitor;
  }),
);

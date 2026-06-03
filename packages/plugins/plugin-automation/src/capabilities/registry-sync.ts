//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Operation } from '@dxos/compute';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';

/**
 * Syncs plugin capability contributions into `client.graph.registry`.
 *
 * Watches two capability atoms and imperatively adds entities to the
 * hypergraph registry when they change:
 * - {@link AppCapabilities.BlueprintDefinition} → instantiates each blueprint via `def.make()`.
 * - {@link Capabilities.OperationHandler} → serializes each handler via `Operation.serialize`.
 *
 * Note: the plugin framework does not yet expose a teardown hook for capability
 * modules (see the TODO in process-manager-capability.ts), so the subscriptions
 * are not explicitly cancelled. They are effectively scoped to the client's lifetime.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* Capability.get(ClientCapabilities.Client);
    const atomRegistry = yield* Capability.get(Capabilities.AtomRegistry);
    const capabilityManager = yield* Capability.Service;

    //
    // Blueprint registration.
    //

    const blueprintDefinitionsAtom = capabilityManager.atom(AppCapabilities.BlueprintDefinition);
    const prevBlueprintKeys = new Set<string>();

    atomRegistry.subscribe(
      blueprintDefinitionsAtom,
      (definitions) => {
        const fresh: Blueprint.Blueprint[] = [];
        for (const def of definitions) {
          if (!prevBlueprintKeys.has(def.key)) {
            prevBlueprintKeys.add(def.key);
            fresh.push(def.make());
          }
        }
        if (fresh.length > 0) {
          client.graph.registry.add(fresh);
        }
      },
      { immediate: true },
    );

    //
    // Operation registration.
    //

    const operationHandlersAtom = capabilityManager.atom(Capabilities.OperationHandler);
    const prevOperationKeys = new Set<string>();

    atomRegistry.subscribe(
      operationHandlersAtom,
      async (handlerSets) => {
        try {
          const handlers = (await Promise.all(handlerSets.map((set) => set.getHandlers()))).flat();
          const seenKeys = new Set<string>();
          const batch: Operation.PersistentOperation[] = [];
          for (const handler of handlers) {
            const key = handler.meta.key;
            if (!key) {
              log.warn('skipping operation handler without key');
              continue;
            }
            if (seenKeys.has(key)) {
              log('skipping duplicate operation', { key });
              continue;
            }
            seenKeys.add(key);
            if (prevOperationKeys.has(key)) {
              continue;
            }
            try {
              batch.push(Operation.serialize(handler));
            } catch (error) {
              log.warn('skipping operation that failed to serialize', { key, error });
              // Mark as seen so we don't warn on every subsequent subscription fire.
              prevOperationKeys.add(key);
            }
          }
          if (batch.length > 0) {
            client.graph.registry.add(batch);
            for (const operation of batch) {
              const operationKey = Operation.getKey(operation);
              if (operationKey) {
                prevOperationKeys.add(operationKey);
              }
            }
          }
        } catch (error) {
          log.catch(error);
        }
      },
      { immediate: true },
    );
  }),
);

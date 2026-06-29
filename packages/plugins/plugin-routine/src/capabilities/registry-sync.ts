//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Operation, Skill } from '@dxos/compute';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';

/**
 * Syncs plugin capability contributions into `client.graph.registry`.
 *
 * Watches two capability atoms and imperatively adds entities to the
 * hypergraph registry when they change:
 * - {@link AppCapabilities.SkillDefinition} → instantiates each skill via `def.make()`.
 * - {@link Capabilities.OperationHandler} → serializes each handler via `Operation.serialize`.
 *
 * Skill DB copies (stored in a space when a skill is "enabled") are treated as
 * user forks and are not overwritten. The registry is always used as the source of truth
 * for skill instructions at request time — see `formatSystemPrompt` in `@dxos/assistant`.
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
    // Skill registration.
    //

    const skillDefinitionsAtom = capabilityManager.atom(AppCapabilities.SkillDefinition);
    const prevSkillKeys = new Set<string>();

    atomRegistry.subscribe(
      skillDefinitionsAtom,
      (definitions) => {
        const fresh: Skill.Skill[] = [];
        for (const def of definitions) {
          if (!prevSkillKeys.has(def.key)) {
            prevSkillKeys.add(def.key);
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
            if (handler.meta.skipRegistry) {
              prevOperationKeys.add(key);
              continue;
            }
            try {
              batch.push(Operation.serialize(handler));
            } catch {
              log.verbose('skipping operation with unserializable schema', { key });
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

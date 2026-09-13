//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

/** Serialization runs at about a millisecond per operation, so a long batch is split to keep the page responsive. */
const SLICE_MS = 8;

const yieldToHost = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

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
    const client = yield* ClientCapabilities.Client;
    const atomRegistry = yield* Capabilities.AtomRegistry;

    //
    // Skill registration.
    //

    const skillDefinitionsAtom = yield* Capability.atom(AppCapabilities.SkillDefinition);
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

    const operationHandlersAtom = yield* Capability.atom(Capabilities.OperationHandler);
    const prevOperationKeys = new Set<string>();

    atomRegistry.subscribe(
      operationHandlersAtom,
      async (handlerSets) => {
        try {
          // Serialization needs only the definitions: keyed sets enumerate them without loading
          // any handler body (per-operation loading); unkeyed sets still force their handlers.
          const handlers = (
            await Promise.all(handlerSets.map((set) => (set.definitions ? set.definitions() : set.getHandlers())))
          ).flat();
          const seenKeys = new Set<string>();
          const batch: Operation.PersistentOperation[] = [];
          let sliceStart = performance.now();
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
            // Claimed before any yield, so a run the atom starts meanwhile skips it.
            prevOperationKeys.add(key);
            if (handler.meta.skipRegistry) {
              continue;
            }
            try {
              batch.push(Operation.serialize(handler));
            } catch {
              log.verbose('skipping operation with unserializable schema', { key });
            }
            if (performance.now() - sliceStart > SLICE_MS) {
              await yieldToHost();
              sliceStart = performance.now();
            }
          }
          if (batch.length > 0) {
            client.graph.registry.add(batch);
          }
        } catch (error) {
          log.catch(error);
        }
      },
      { immediate: true },
    );

    return [];
  }),
);

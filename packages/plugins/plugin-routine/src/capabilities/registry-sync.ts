//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { yieldOrContinue } from '@dxos/async';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

export const RegistrySync = Capability.makeModule(
  'RegistrySync',
  {
    requires: [
      ClientCapabilities.Client,
      Capabilities.AtomRegistry,
      AppCapabilities.SkillDefinition,
      Capabilities.OperationHandler,
    ],
    provides: [],
    environments: ['node'],
  },
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

    let syncing = Promise.resolve();
    atomRegistry.subscribe(
      operationHandlersAtom,
      (handlerSets) => {
        syncing = syncing.then(async () => {
          try {
            // Serialization needs only the definitions: keyed sets enumerate them without loading
            // any handler body (per-operation loading); unkeyed sets still force their handlers.
            const handlers = (
              await Promise.all(handlerSets.map((set) => (set.definitions ? set.definitions() : set.getHandlers())))
            ).flat();
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
              await yieldOrContinue('smooth');
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
        });
      },
      { immediate: true },
    );

    return [];
  }),
);

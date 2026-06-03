//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { Client, ClientService } from '@dxos/client';
import { Operation } from '@dxos/compute';
import { runAndForwardErrors } from '@dxos/effect';
import { log } from '@dxos/log';

import { ClientEvents } from '#types';
import { ClientCapabilities, type ClientPluginOptions } from '#types';

type ClientCapabilityOptions = Omit<
  ClientPluginOptions,
  'appKey' | 'shareableLinkOrigin' | 'invitationPath' | 'invitationParam' | 'onReset'
>;

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ onClientInitialized, onSpacesReady, ...options }: ClientCapabilityOptions) {
    const capabilityManager = yield* Capability.Service;
    const pluginManager = yield* Plugin.Service;

    log('creating client');
    const client = new Client(options);
    log('initializing client (calling client.initialize())...');
    yield* Effect.tryPromise(() => client.initialize());
    log('client.initialize() returned successfully');
    if (onClientInitialized) {
      yield* onClientInitialized({ client }).pipe(
        Effect.provideService(Capability.Service, capabilityManager),
        Effect.provideService(Plugin.Service, pluginManager),
      );
    }
    log('called client initialized callback');

    // TODO(wittjosiah): Remove. This is a hack to get the app to boot with the new identity after a reset.
    client.reloaded.on(() => {
      client.halo.identity.subscribe(async (identity) => {
        if (identity) {
          window.location.href = window.location.origin;
        }
      });
    });

    let spacesReadyFired = false;
    const subscription = client.spaces.subscribe(async () => {
      if (!spacesReadyFired) {
        spacesReadyFired = true;
        await Effect.gen(function* () {
          yield* Plugin.activate(ClientEvents.SpacesReady);
          if (onSpacesReady) {
            yield* onSpacesReady({ client });
          }
        }).pipe(
          Effect.provideService(Capability.Service, capabilityManager),
          Effect.provideService(Plugin.Service, pluginManager),
          runAndForwardErrors,
        );
      }
    });

    const atomRegistry = yield* Capability.get(Capabilities.AtomRegistry);
    const operationHandlersAtom = capabilityManager.atom(Capabilities.OperationHandler);

    // TODO(wittjosiah): Unregister operations when they are disabled.
    let previousOperationKeys = new Set<string>();
    const operationRegistryCancel = atomRegistry.subscribe(
      operationHandlersAtom,
      async (handlerSets) => {
        try {
          const handlers = (await Promise.all(handlerSets.map((set) => set.getHandlers()))).flat();
          const seenOperationKeys = new Set<string>();
          const batch: Operation.PersistentOperation[] = [];
          for (const handler of handlers) {
            const key = handler.meta.key;
            if (!key) {
              log.warn('skipping operation handler without key');
              continue;
            }

            if (seenOperationKeys.has(key)) {
              log('skipping duplicate operation for echo registration', { key });
              continue;
            }

            seenOperationKeys.add(key);
            if (previousOperationKeys.has(key)) {
              continue;
            }

            try {
              batch.push(Operation.serialize(handler));
            } catch (error) {
              log.warn('skipping operation that failed to serialize for echo registration', { key, error });
            }
          }

          if (batch.length > 0) {
            client.graph.registry.add(batch);
            for (const operation of batch) {
              const operationKey = Operation.getKey(operation);
              if (operationKey) {
                previousOperationKeys.add(operationKey);
              }
            }
          }
        } catch (error) {
          log.catch(error);
        }
      },
      { immediate: true },
    );

    log('client capability ready');

    return [
      // TODO(wittjosiah): Try to remove and prefer layer?
      //  Perhaps move to using layer has source of truth and add a getter capability for the client.
      Capability.contributes(ClientCapabilities.Client, client, () =>
        Effect.gen(function* () {
          log.info('client capability: destroying client');
          // TODO(dmaretskyi): use scope for destroy.
          subscription.unsubscribe();
          operationRegistryCancel();
          yield* Effect.tryPromise(() => client.destroy());
        }),
      ),
      Capability.contributes(Capabilities.Layer, ClientService.fromClient(client)),
    ];
  }),
);

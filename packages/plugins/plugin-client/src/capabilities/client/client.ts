//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { Client, ClientService } from '@dxos/client';
import { runAndForwardErrors } from '@dxos/effect';
import { log } from '@dxos/log';

import { ClientEvents } from '../../events';
import { ClientCapabilities, type ClientPluginOptions } from '../../types';

type ClientCapabilityOptions = Omit<ClientPluginOptions, 'appKey' | 'invitationUrl' | 'invitationParam' | 'onReset'> & {
  context: Capability.PluginContext;
};

export default Capability.makeModule(
  ({ context, onClientInitialized, onSpacesReady, ...options }: ClientCapabilityOptions) =>
    Effect.gen(function* () {
      log('creating client');
      const client = new Client(options);
      log('initializing client');
      yield* Effect.tryPromise(() => client.initialize());
      log('initialized client');
      yield* Effect.tryPromise(() => onClientInitialized?.({ context, client }) ?? Promise.resolve());
      log('called client initialized callback');

      // TODO(wittjosiah): Remove. This is a hack to get the app to boot with the new identity after a reset.
      client.reloaded.on(() => {
        client.halo.identity.subscribe(async (identity) => {
          if (identity) {
            window.location.href = window.location.origin;
          }
        });
      });

      // TODO(burdon): The callback isn't called?
      const subscription = client.spaces.isReady.subscribe(async (ready) => {
        if (ready) {
          await runAndForwardErrors(context.activate(ClientEvents.SpacesReady));
          await onSpacesReady?.({ context, client });
        }
      });

      log('client capability ready');

      return [
        // TODO(wittjosiah): Try to remove and prefer layer?
        //  Perhaps move to using layer has source of truth and add a getter capability for the client.
        Capability.contributes(ClientCapabilities.Client, client, () =>
          Effect.gen(function* () {
            subscription.unsubscribe();
            yield* Effect.tryPromise(() => client.destroy());
          }),
        ),
        Capability.contributes(Common.Capability.Layer, ClientService.fromClient(client)),
      ];
    }),
);

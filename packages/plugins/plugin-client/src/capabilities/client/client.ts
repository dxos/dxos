//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { Client, ClientService } from '@dxos/client';
import { runAndForwardErrors } from '@dxos/effect';

import { ClientEvents } from '../../events';
import { ClientCapabilities, type ClientPluginOptions } from '../../types';

type ClientCapabilityOptions = Omit<ClientPluginOptions, 'appKey' | 'invitationUrl' | 'invitationParam' | 'onReset'> & {
  context: Capability.PluginContext;
};

export default Capability.makeModule(
  ({ context, onClientInitialized, onSpacesReady, ...options }: ClientCapabilityOptions) =>
    Effect.gen(function* () {
      const client = new Client(options);
      yield* Effect.tryPromise(() => client.initialize());
      yield* Effect.tryPromise(() => onClientInitialized?.({ context, client }) ?? Promise.resolve());

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

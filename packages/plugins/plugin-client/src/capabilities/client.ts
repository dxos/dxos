//
// Copyright 2025 DXOS.org
//

import { Capabilities, type PluginContext, contributes, defineCapabilityModule } from '@dxos/app-framework';
import { Client, ClientService } from '@dxos/client';

import { ClientEvents } from '../events';
import { ClientCapabilities, type ClientPluginOptions } from '../types';

type ClientCapabilityOptions = Omit<ClientPluginOptions, 'appKey' | 'invitationUrl' | 'invitationProp' | 'onReset'> & {
  context: PluginContext;
};

export default defineCapabilityModule(
  async ({ context, onClientInitialized, onSpacesReady, ...options }: ClientCapabilityOptions) => {
    const client = new Client(options);
    await client.initialize();
    await onClientInitialized?.({ context, client });

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
        await context.activatePromise(ClientEvents.SpacesReady);
        await onSpacesReady?.({ context, client });
      }
    });

    return [
      // TODO(wittjosiah): Try to remove and prefer layer?
      //  Perhaps move to using layer has source of truth and add a getter capability for the client.
      contributes(ClientCapabilities.Client, client, async () => {
        subscription.unsubscribe();
        await client.destroy();
      }),
      contributes(Capabilities.Layer, ClientService.fromClient(client)),
    ];
  },
);

//
// Copyright 2025 DXOS.org
//

import { contributes, type PluginContext } from '@dxos/app-framework';
import { Client } from '@dxos/react-client';

import { ClientCapabilities } from './capabilities';
import { ClientEvents } from '../events';
import { type ClientPluginOptions } from '../types';

type ClientCapabilityOptions = Omit<ClientPluginOptions, 'appKey' | 'invitationUrl' | 'invitationParam' | 'onReset'> & {
  context: PluginContext;
};

export default async ({ context, onClientInitialized, onSpacesReady, ...options }: ClientCapabilityOptions) => {
  const client = new Client(options);
  await client.initialize();
  await onClientInitialized?.(context, client);

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
      await onSpacesReady?.(context, client);
    }
  });

  return contributes(ClientCapabilities.Client, client, async () => {
    subscription.unsubscribe();
    await client.destroy();
  });
};

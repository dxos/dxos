//
// Copyright 2025 DXOS.org
//

import { contributes, type PluginsContext } from '@dxos/app-framework';
import { Client } from '@dxos/react-client';

import { ClientCapabilities } from './capabilities';
import { ClientEvents } from '../events';
import { type ClientPluginOptions } from '../types';

type ClientCapabilityOptions = Omit<ClientPluginOptions, 'appKey' | 'invitationUrl' | 'invitationParam' | 'onReset'> & {
  context: PluginsContext;
};

export default async ({ context, onClientInitialized, ...options }: ClientCapabilityOptions) => {
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

  const subscription = client.spaces.isReady.subscribe(async (ready) => {
    if (ready) {
      await context.activatePromise(ClientEvents.SpacesReady);
    }
  });

  return contributes(ClientCapabilities.Client, client, async () => {
    subscription.unsubscribe();
    await client.destroy();
  });
};

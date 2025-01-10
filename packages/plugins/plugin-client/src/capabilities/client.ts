//
// Copyright 2025 DXOS.org
//

import { contributes, type PluginsContext } from '@dxos/app-framework/next';
import { Config, Defaults, Envs, Local, Storage } from '@dxos/config';
import { Client } from '@dxos/react-client';

import { ClientCapabilities } from './capabilities';
import { ClientEvents } from '../events';
import { type ClientPluginOptions } from '../types';

type ClientCapabilityOptions = Omit<ClientPluginOptions, 'appKey' | 'invitationUrl' | 'invitationParam' | 'onReset'> & {
  context: PluginsContext;
};

export default async ({ context, onClientInitialized, ...options }: ClientCapabilityOptions) => {
  const config = new Config(await Storage(), Envs(), Local(), Defaults());
  const client = new Client({ config, ...options });

  await client.initialize();
  await onClientInitialized?.(context, client);

  const systemSchemas = context.requestCapabilities(ClientCapabilities.SystemSchema).flat();
  const schemas = context.requestCapabilities(ClientCapabilities.Schema).flat();
  client.addTypes(systemSchemas);
  client.addTypes(schemas);

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
      await context.activate(ClientEvents.SpacesReady);
    }
  });

  return contributes(ClientCapabilities.Client, client, async () => {
    subscription.unsubscribe();
    await client.destroy();
  });
};

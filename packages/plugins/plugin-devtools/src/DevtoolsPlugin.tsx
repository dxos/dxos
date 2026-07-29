//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { type Client } from '@dxos/react-client';

import { AppGraphBuilder, ReactContext, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const DevtoolsPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addReactContextModule({ activate: ReactContext }),
  Plugin.addModule({
    id: Capability.getModuleTag(ReactSurface) ?? 'surfaces',
    activatesOn: ActivationEvents.SetupReactSurface,
    activate: () => ReactSurface(),
  }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'setup-devtools',
    activatesOn: ActivationEvents.Startup,
    activate: () => Effect.sync(() => setupDevtools()),
  }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

const setupDevtools = () => {
  (globalThis as any).composer ??= {};

  // Used to test how composer handles breaking protocol changes.
  (globalThis as any).composer.changeStorageVersionInMetadata = async (version: number) => {
    const { changeStorageVersionInMetadata } = await import('@dxos/client-services/testing');
    const { createStorageObjects } = await import('@dxos/client-services');
    const client: Client = (window as any).dxos.client;
    const config = client.config;
    await client.destroy();
    const { storage } = createStorageObjects(config.values?.runtime?.client?.storage ?? {});
    await changeStorageVersionInMetadata(storage, version);
    location.pathname = '/';
  };
};

export default DevtoolsPlugin;

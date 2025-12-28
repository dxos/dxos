//
// Copyright 2023 DXOS.org
//

import { Capabilities, Capability, Events, Plugin } from '@dxos/app-framework';
import { type Client } from '@dxos/react-client';

import { AppGraphBuilder, DebugSettings, ReactContext, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

// TODO(wittjosiah): Factor out DevtoolsPlugin?
export const DebugPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'setup-devtools',
    activatesOn: Events.Startup,
    activate: () => {
      setupDevtools();
      return Capability.contributes(Capabilities.Null, null);
    },
  }),
  Plugin.addModule({
    id: 'settings',
    activatesOn: Events.SetupSettings,
    activate: DebugSettings,
  }),
  Plugin.addModule({
    id: 'translations',
    activatesOn: Events.SetupTranslations,
    activate: () => Capability.contributes(Capabilities.Translations, translations),
  }),
  Plugin.addModule({
    id: 'react-context',
    activatesOn: Events.Startup,
    activate: ReactContext,
  }),
  Plugin.addModule({
    id: 'react-surface',
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  Plugin.addModule({
    id: 'app-graph-builder',
    activatesOn: Events.SetupAppGraph,
    activate: AppGraphBuilder,
  }),
  Plugin.make,
);

const setupDevtools = () => {
  (globalThis as any).composer ??= {};

  // Used to test how composer handles breaking protocol changes.
  (globalThis as any).composer.changeStorageVersionInMetadata = async (version: number) => {
    const { changeStorageVersionInMetadata } = await import('@dxos/echo-pipeline/testing');
    const { createStorageObjects } = await import('@dxos/client-services');
    const client: Client = (window as any).dxos.client;
    const config = client.config;
    await client.destroy();
    const { storage } = createStorageObjects(config.values?.runtime?.client?.storage ?? {});
    await changeStorageVersionInMetadata(storage, version);
    location.pathname = '/';
  };
};

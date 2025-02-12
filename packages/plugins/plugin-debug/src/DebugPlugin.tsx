//
// Copyright 2023 DXOS.org
//

import { Capabilities, contributes, defineModule, definePlugin, Events } from '@dxos/app-framework';
import { DeckCapabilities } from '@dxos/plugin-deck';
import { type Client } from '@dxos/react-client';

import { AppGraphBuilder, DebugSettings, ReactSurface } from './capabilities';
import { DEBUG_PLUGIN, meta } from './meta';
import translations from './translations';

export const DebugPlugin = () => {
  setupDevtools();

  return definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/settings`,
      activatesOn: Events.SetupSettings,
      activate: DebugSettings,
    }),
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${meta.id}/module/complementary-panel`,
      activatesOn: Events.Startup,
      activate: () =>
        contributes(DeckCapabilities.ComplementaryPanel, {
          id: 'debug',
          label: ['debug label', { ns: DEBUG_PLUGIN }],
          icon: 'ph--bug--regular',
        }),
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.SetupSurfaces,
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/module/app-graph-builder`,
      activatesOn: Events.SetupAppGraph,
      activate: AppGraphBuilder,
    }),
  ]);
};

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

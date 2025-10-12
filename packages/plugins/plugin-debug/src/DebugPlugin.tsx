//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, contributes, defineModule, definePlugin } from '@dxos/app-framework';
import { type Client } from '@dxos/react-client';

import { AppGraphBuilder, DebugSettings, ReactContext, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

// TODO(wittjosiah): Factor out DevtoolsPlugin?
export const DebugPlugin = definePlugin(meta, () => {
  setupDevtools();
  return [
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
      id: `${meta.id}/module/react-context`,
      activatesOn: Events.Startup,
      activate: ReactContext,
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.SetupReactSurface,
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/module/app-graph-builder`,
      activatesOn: Events.SetupAppGraph,
      activate: AppGraphBuilder,
    }),
  ];
});

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

//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { type LogBuffer } from '@dxos/log';
import { type Client } from '@dxos/react-client';

import { AppGraphBuilder, DebugSettings, ReactContext, ReactSurface } from '#capabilities';
import { meta } from '#meta';

import { translations } from './translations';

export type DebugPluginOptions = {
  /** Shared log buffer for capturing and downloading logs. */
  logBuffer: LogBuffer;
};

// TODO(wittjosiah): Factor out DevtoolsPlugin?

export const DebugPlugin = Plugin.define<DebugPluginOptions>(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addReactContextModule({ activate: ReactContext }),
  AppPlugin.addSettingsModule({ activate: DebugSettings }),
  Plugin.addModule(({ logBuffer }) => ({
    id: Capability.getModuleTag(ReactSurface) ?? 'surfaces',
    activatesOn: ActivationEvents.SetupReactSurface,
    activate: () => ReactSurface({ logBuffer }),
  })),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'setup-devtools',
    activatesOn: ActivationEvents.Startup,
    activate: () => Effect.sync(() => setupDevtools()),
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

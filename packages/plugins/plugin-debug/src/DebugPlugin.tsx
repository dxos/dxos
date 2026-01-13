//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Common, Plugin } from '@dxos/app-framework';
import { type Client } from '@dxos/react-client';

import { AppGraphBuilder, DebugSettings, ReactContext, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

// TODO(wittjosiah): Factor out DevtoolsPlugin?
export const DebugPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'setup-devtools',
    activatesOn: Common.ActivationEvent.Startup,
    activate: () => Effect.sync(() => setupDevtools()),
  }),
  Common.Plugin.addSettingsModule({ activate: DebugSettings }),
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addReactContextModule({ activate: ReactContext }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addAppGraphModule({ activate: AppGraphBuilder }),
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

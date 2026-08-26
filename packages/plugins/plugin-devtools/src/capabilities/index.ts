//
// Copyright 2025 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { Runtime_Client_StorageSchema } from '@dxos/protocols/buf/dxos/config_pb';
import { type Client } from '@dxos/react-client';

import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [AppCapabilities.AppGraph],
  environments: ['node'],
});
export const ReactContext = AppCapability.reactContext(() => import('./react-context'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.deckCompanion.devtoolsOverview'],
});
export const SetupDevtools = Capability.inlineModule('setup-devtools', { provides: [] }, () =>
  Effect.sync(() => setupDevtools()),
);
export const Translations = AppCapability.translations(translations);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});

const setupDevtools = () => {
  (globalThis as any).composer ??= {};

  // Used to test how composer handles breaking protocol changes.
  (globalThis as any).composer.changeStorageVersionInMetadata = async (version: number) => {
    const { changeStorageVersionInMetadata } = await import('@dxos/client-services/testing');
    const { createStorageObjects } = await import('@dxos/client-services');
    const client: Client = (window as any).dxos.client;
    const config = client.config;
    await client.destroy();
    const { storage } = createStorageObjects(
      config.values?.runtime?.client?.storage ?? create(Runtime_Client_StorageSchema, {}),
    );
    await changeStorageVersionInMetadata(storage, version);
    location.pathname = '/';
  };
};

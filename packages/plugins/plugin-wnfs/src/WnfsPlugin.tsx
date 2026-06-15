//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { ClientEvents } from '@dxos/plugin-client';

import { Backend, Blockstore, UrlResolver } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { WnfsCapabilities } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const WnfsPlugin = Plugin.define(meta).pipe(
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'blockstore',
    activatesOn: ClientEvents.ClientReady,
    activate: Blockstore,
  }),
  Plugin.addModule({
    id: 'instances',
    activatesOn: ClientEvents.ClientReady,
    activate: () =>
      Effect.sync(() => {
        const instances: WnfsCapabilities.Instances = {};
        return Capability.contributes(WnfsCapabilities.Instances, instances);
      }),
  }),
  Plugin.addModule({
    id: 'backend',
    activatesOn: ClientEvents.ClientReady,
    activate: Backend,
  }),
  Plugin.addModule({
    id: 'url-resolver',
    activatesOn: ClientEvents.ClientReady,
    activate: UrlResolver,
  }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.id, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default WnfsPlugin;

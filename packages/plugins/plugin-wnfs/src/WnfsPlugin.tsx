//
// Copyright 2024 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { ClientEvents } from '@dxos/plugin-client';

import { BlobBackend, Dependencies } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { WnfsEvents } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const WnfsPlugin = Plugin.define(meta).pipe(
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'dependencies',
    activatesOn: ClientEvents.ClientReady,
    firesAfterActivation: [WnfsEvents.DependenciesReady],
    activate: Dependencies,
  }),
  Plugin.addModule({
    id: 'blob-backend',
    activatesOn: WnfsEvents.DependenciesReady,
    activate: BlobBackend,
  }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default WnfsPlugin;

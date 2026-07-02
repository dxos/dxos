//
// Copyright 2026 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { ChannelBackend, ConnectionManager } from '#capabilities';
import { meta } from '#meta';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';
import { translations } from './translations';
import { FreeqChannel } from './types';

export const FreeqPlugin = Plugin.define(meta).pipe(
  AppPlugin.addTranslationsModule({ translations }),
  AppPlugin.addSchemaModule({ schema: [FreeqChannel] }),
  Plugin.addModule({
    id: 'connection-manager',
    activatesOn: ActivationEvents.Startup,
    activate: ConnectionManager,
  }),
  Plugin.addModule({
    id: 'channel-backend',
    activatesOn: ActivationEvents.Startup,
    activate: ChannelBackend,
  }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default FreeqPlugin;

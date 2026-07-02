//
// Copyright 2026 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';

import { ChannelBackend, Connector, OperationHandler } from '#capabilities';
import { meta } from '#meta';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';
import { translations } from './translations';
import { BlueskyChannel } from './types';

export const BlueskyPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addTranslationsModule({ translations }),
  AppPlugin.addSchemaModule({ schema: [BlueskyChannel] }),
  Plugin.addModule({
    activatesOn: AppActivationEvents.SetupConnectors,
    activate: Connector,
  }),
  // Read-only ATProto channel backend (contributes ThreadCapabilities.ChannelBackend).
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

export default BlueskyPlugin;

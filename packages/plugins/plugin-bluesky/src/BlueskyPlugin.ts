//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { ChannelBackend, Connector, OperationHandler } from '#capabilities';
import { meta } from '#meta';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';
import { translations } from './translations';
import { BlueskyChannel } from './types';

export const BlueskyPlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(AppCapability.translations(translations)),
  Plugin.addLazyModule(AppCapability.schema([BlueskyChannel])),
  Plugin.addLazyModule(Connector),
  // Read-only ATProto channel backend (contributes ThreadCapabilities.ChannelBackend).
  Plugin.addLazyModule(ChannelBackend),
  Plugin.addLazyModule(
    AppCapability.pluginAsset({
      pluginId: meta.profile.key,
      path: 'PLUGIN.mdl',
      content: pluginSpec,
      mimeType: 'application/x-mdl',
    }),
  ),
  Plugin.make,
);

export default BlueskyPlugin;

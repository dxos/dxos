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
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.addModule(AppCapability.schema([BlueskyChannel])),
  Plugin.addModule(Connector),
  // Read-only ATProto channel backend (contributes ThreadCapabilities.ChannelBackend).
  Plugin.addModule(ChannelBackend),
  Plugin.addModule(
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

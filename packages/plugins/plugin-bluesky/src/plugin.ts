//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { ChannelBackend, Connector, OperationHandler, PluginAsset, Schema, Translations } from '#capabilities';
import { meta } from '#meta';

export const BlueskyPlugin = Plugin.define(meta).pipe(
  // Read-only ATProto channel backend (contributes ThreadCapabilities.ChannelBackend).
  Plugin.addModule(ChannelBackend),
  Plugin.addModule(Connector),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(Schema),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default BlueskyPlugin;

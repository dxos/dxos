//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { Connector, PluginAsset, PublisherService, Translations } from '#capabilities';
import { meta } from '#meta';

export const TypefullyPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(Connector),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(PublisherService),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default TypefullyPlugin;

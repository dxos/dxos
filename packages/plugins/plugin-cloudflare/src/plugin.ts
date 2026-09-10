//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { Connector, PluginAsset, Translations } from '#capabilities';
import { meta } from '#meta';

export const CloudflarePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(Connector),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default CloudflarePlugin;

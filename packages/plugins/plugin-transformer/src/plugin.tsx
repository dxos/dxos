//
// Copyright 2024 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { PluginAsset, Schema, Translations } from '#capabilities';
import { meta } from '#meta';

export const TransformerPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(PluginAsset),
  Plugin.addModule(Schema),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default TransformerPlugin;

//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { DrawingVariant, PluginAsset, TldrawSettings, Translations } from '#capabilities';
import { meta } from '#meta';

export const TldrawPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(DrawingVariant),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(TldrawSettings),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default TldrawPlugin;

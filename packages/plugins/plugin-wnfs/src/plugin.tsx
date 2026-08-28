//
// Copyright 2024 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { BlobBackend, Dependencies, PluginAsset, Translations } from '#capabilities';
import { meta } from '#meta';

export const WnfsPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(BlobBackend),
  Plugin.addModule(Dependencies),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default WnfsPlugin;

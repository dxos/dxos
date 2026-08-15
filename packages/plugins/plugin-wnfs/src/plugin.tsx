//
// Copyright 2024 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { BlobBackend, Dependencies, PluginAsset, Translations } from '#capabilities';
import { meta } from '#meta';

// Canonical single-entry composition: lists every module once; per-environment filtering happens
// in the `#capabilities` barrel resolution — the generated headless barrels stub excluded modules
// as `undefined`, which `Plugin.addModule` skips.
export const WnfsPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(BlobBackend),
  Plugin.addModule(Dependencies),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default WnfsPlugin;

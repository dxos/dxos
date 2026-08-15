//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { PreviewPopover, ReactSurface, Schema, Translations } from '#capabilities';
import { meta } from '#meta';

// Canonical single-entry composition: lists every module once; per-environment filtering happens
// in the `#capabilities` barrel resolution — the generated headless barrels stub excluded modules
// as `undefined`, which `Plugin.addModule` skips.
export const PreviewPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(Schema),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Translations),
  Plugin.addModule(PreviewPopover),
  Plugin.make,
);

export default PreviewPlugin;

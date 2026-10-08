//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { CanvasSettings, DrawingVariant, ReactSurface, Translations } from '#capabilities';
import { meta } from '#meta';

export const CanvasPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(CanvasSettings),
  Plugin.addModule(DrawingVariant),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default CanvasPlugin;

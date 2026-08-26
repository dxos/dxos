//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { DrawingVariant, ExcalidrawSettings, ReactSurface, Translations } from '#capabilities';
import { meta } from '#meta';

export const ExcalidrawPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(DrawingVariant),
  Plugin.addModule(ExcalidrawSettings),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default ExcalidrawPlugin;

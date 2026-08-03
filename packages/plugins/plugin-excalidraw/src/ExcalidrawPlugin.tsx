//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';

import { DrawingVariant, ExcalidrawSettings, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const ExcalidrawPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(DrawingVariant),
  Plugin.addModule(AppCapability.schema([Drawing.Canvas])),
  Plugin.addModule(ExcalidrawSettings),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.make,
);

export default ExcalidrawPlugin;

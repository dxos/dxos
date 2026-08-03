//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { DrawingVariant, ExcalidrawSettings, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const ExcalidrawPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(DrawingVariant),
  Plugin.addModule(ExcalidrawSettings),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.make,
);

export default ExcalidrawPlugin;

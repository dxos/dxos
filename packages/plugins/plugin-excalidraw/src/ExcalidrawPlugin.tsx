//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Drawing } from '@dxos/plugin-illustrator/types';

import { DrawingVariant, ExcalidrawSettings, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const ExcalidrawPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'drawing-variant',
    activatesOn: AppActivationEvents.SetupSchema,
    activate: DrawingVariant,
  }),
  AppPlugin.addSchemaModule({ schema: [Drawing.Canvas] }),
  AppPlugin.addSettingsModule({ activate: ExcalidrawSettings }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

export default ExcalidrawPlugin;

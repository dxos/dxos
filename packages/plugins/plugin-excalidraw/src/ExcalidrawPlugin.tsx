//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';

import { ExcalidrawSettings, ReactSurface, SketchVariant } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Excalidraw } from '#types';

export const ExcalidrawPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'sketch-variant',
    activatesOn: AppActivationEvents.SetupSchema,
    activate: SketchVariant,
  }),
  AppPlugin.addSchemaModule({ schema: [Excalidraw.Canvas] }),
  AppPlugin.addSettingsModule({ activate: ExcalidrawSettings }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

export default ExcalidrawPlugin;

//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { CreateObject, GeneratorSettings, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Generation } from '#types';

export const GeneratorPlugin = Plugin.define(meta).pipe(
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addSchemaModule({ schema: [Generation.Generation] }),
  AppPlugin.addSettingsModule({ activate: GeneratorSettings }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

export default GeneratorPlugin;

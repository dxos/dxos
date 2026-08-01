//
// Copyright 2026 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { CreateObject, PlanetCache, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Terra, TerraObject } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const TerraPlugin = Plugin.define(meta).pipe(
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addSchemaModule({ schema: [Terra.Terra, TerraObject.TerraObject] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  Plugin.addModule({
    id: 'planet-cache',
    activatesOn: ActivationEvents.Startup,
    activate: PlanetCache,
  }),
  AppPlugin.addTranslationsModule({ translations }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default TerraPlugin;

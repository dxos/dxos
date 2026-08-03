//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { CreateObject, PlanetCache, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Terra, TerraObject } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const TerraPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(CreateObject),
  Plugin.addModule(AppCapability.schema([Terra.Terra, TerraObject.TerraObject])),
  Plugin.addModule(PlanetCache),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.addModule(
    AppCapability.pluginAsset({
      pluginId: meta.profile.key,
      path: 'PLUGIN.mdl',
      content: pluginSpec,
      mimeType: 'application/x-mdl',
    }),
  ),
  Plugin.make,
);

export default TerraPlugin;

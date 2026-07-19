//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { CreateObject, ReactSurface, SpacetimeSettings } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Model, Scene } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const SpacetimePlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(CreateObject),
  Plugin.addLazyModule(AppCapability.schema([Scene.Scene, Model.Object])),
  Plugin.addLazyModule(SpacetimeSettings),
  Plugin.addLazyModule(ReactSurface),
  Plugin.addLazyModule(AppCapability.translations(translations)),
  Plugin.addLazyModule(
    AppCapability.pluginAsset({
      pluginId: meta.profile.key,
      path: 'PLUGIN.mdl',
      content: pluginSpec,
      mimeType: 'application/x-mdl',
    }),
  ),
  Plugin.make,
);

export default SpacetimePlugin;

//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { CreateObject, PluginAsset, ReactSurface, Schema, SpacetimeSettings, Translations } from '#capabilities';
import { meta } from '#meta';

export const SpacetimePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(CreateObject),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Schema),
  Plugin.addModule(SpacetimeSettings),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default SpacetimePlugin;

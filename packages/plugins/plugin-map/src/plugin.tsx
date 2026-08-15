//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  CreateObject,
  MapSettings,
  MapState,
  MarkerProvider,
  OperationHandler,
  PluginAsset,
  ReactSurface,
  Schema,
  SkillDefinition,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

// Canonical single-entry composition: lists every module once; per-environment filtering happens
// in the `#capabilities` barrel resolution — the generated headless barrels stub excluded modules
// as `undefined`, which `Plugin.addModule` skips.
export const MapPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(Schema),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(MapSettings),
  Plugin.addModule(Translations),
  Plugin.addModule(MarkerProvider),
  Plugin.addModule(MapState),
  Plugin.addModule(PluginAsset),
  Plugin.make,
);

export default MapPlugin;

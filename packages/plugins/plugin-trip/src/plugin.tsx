//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  CreateObject,
  MarkerProvider,
  OperationHandler,
  PluginAsset,
  ReactSurface,
  Schema,
  Settings,
  SkillDefinition,
  Translations,
  TripExtractor,
} from '#capabilities';
import { meta } from '#meta';

export const TripPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(CreateObject),
  Plugin.addModule(MarkerProvider),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Schema),
  Plugin.addModule(Settings),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(Translations),
  Plugin.addModule(TripExtractor),
  Plugin.make,
);

export default TripPlugin;

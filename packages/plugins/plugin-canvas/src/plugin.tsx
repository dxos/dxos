//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  CanvasSettings,
  DrawingVariant,
  Migrations,
  OperationHandler,
  PluginAsset,
  ReactSurface,
  Schema,
  SkillDefinition,
  SpaceTemplates,
  TldrawConverter,
  Translations,
  UndoMappings,
} from '#capabilities';
import { meta } from '#meta';

export const CanvasPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(CanvasSettings),
  Plugin.addModule(DrawingVariant),
  Plugin.addModule(Migrations),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Schema),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(SpaceTemplates),
  Plugin.addModule(TldrawConverter),
  Plugin.addModule(Translations),
  Plugin.addModule(UndoMappings),
  Plugin.make,
);

export default CanvasPlugin;

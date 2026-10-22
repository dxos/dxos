//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AnchorSort,
  AppGraphBuilder,
  CommentConfig,
  ComputeGraphRegistry,
  CreateObject,
  Markdown,
  Migrations,
  OperationHandler,
  PluginAsset,
  ReactSurface,
  Schema,
  SheetState,
  SkillDefinition,
  SpaceTemplates,
  Translations,
  UndoMappings,
} from '#capabilities';
import { meta } from '#meta';

export const SheetPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AnchorSort),
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(CommentConfig),
  Plugin.addModule(ComputeGraphRegistry),
  Plugin.addModule(CreateObject),
  Plugin.addModule(Markdown),
  Plugin.addModule(Migrations),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Schema),
  Plugin.addModule(SheetState),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(SpaceTemplates),
  Plugin.addModule(Translations),
  Plugin.addModule(UndoMappings),
  Plugin.make,
);

export default SheetPlugin;

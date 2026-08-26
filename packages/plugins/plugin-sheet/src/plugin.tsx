//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AnchorSort,
  CommentConfig,
  ComputeGraphRegistry,
  CreateObject,
  Markdown,
  OperationHandler,
  PluginAsset,
  ReactSurface,
  Schema,
  SheetState,
  SkillDefinition,
  Translations,
  UndoMappings,
} from '#capabilities';
import { meta } from '#meta';

export const SheetPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AnchorSort),
  Plugin.addModule(CommentConfig),
  Plugin.addModule(ComputeGraphRegistry),
  Plugin.addModule(CreateObject),
  Plugin.addModule(Markdown),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Schema),
  Plugin.addModule(SheetState),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(Translations),
  Plugin.addModule(UndoMappings),
  Plugin.make,
);

export default SheetPlugin;

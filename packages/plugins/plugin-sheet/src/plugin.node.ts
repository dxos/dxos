//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { CommentConfig, CreateObject, OperationHandler, Schema, SkillDefinition, UndoMappings } from '#capabilities';
import { meta } from '#meta';

export const SheetPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(CommentConfig),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(UndoMappings),
  Plugin.addModule(Schema),
  Plugin.make,
);

export default SheetPlugin;

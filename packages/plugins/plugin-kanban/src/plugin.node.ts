//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { CreateObject, OperationHandler, Schema, SkillDefinition, UndoMappings } from '#capabilities';
import { meta } from '#meta';

export const KanbanPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(UndoMappings),
  Plugin.addModule(Schema),
  Plugin.make,
);

export default KanbanPlugin;

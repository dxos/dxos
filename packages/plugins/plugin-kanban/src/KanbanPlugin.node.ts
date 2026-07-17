//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { CreateObject, OperationHandler, SkillDefinition, UndoMappings } from '#capabilities';
import { meta } from '#meta';
import { Kanban } from '#types';

export const KanbanPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSkillDefinitionModule({
    requires: SkillDefinition.requires,
    provides: SkillDefinition.provides,
    activate: SkillDefinition,
  }),
  AppPlugin.addCreateObjectModule({
    requires: CreateObject.requires,
    provides: CreateObject.provides,
    activate: CreateObject,
  }),
  AppPlugin.addOperationHandlerModule({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addUndoMappingsModule({
    requires: UndoMappings.requires,
    provides: UndoMappings.provides,
    activate: UndoMappings,
  }),
  AppPlugin.addSchemaModule({ schema: [Kanban.Kanban] }),
  Plugin.make,
);

export default KanbanPlugin;

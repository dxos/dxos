//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { CreateObject, OperationHandler, SkillDefinition, UndoMappings } from '#capabilities';
import { meta } from '#meta';
import { Kanban } from '#types';

export const KanbanPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(UndoMappings),
  Plugin.addModule(AppCapability.schema([Kanban.Kanban])),
  Plugin.make,
);

export default KanbanPlugin;

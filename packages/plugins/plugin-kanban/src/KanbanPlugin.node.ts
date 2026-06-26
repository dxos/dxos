//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { SkillDefinition, CreateObject, OperationHandler, UndoMappings } from '#capabilities';
import { meta } from '#meta';
import { Kanban } from '#types';

export const KanbanPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSkillDefinitionModule({ activate: SkillDefinition }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addUndoMappingsModule({ activate: UndoMappings }),
  AppPlugin.addSchemaModule({ schema: [Kanban.Kanban] }),
  Plugin.make,
);

export default KanbanPlugin;

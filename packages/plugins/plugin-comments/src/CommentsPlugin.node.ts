//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { AnchoredTo, Message, Thread } from '@dxos/types';

import { AppGraphBuilder, OperationHandler, SkillDefinition, UndoMappings } from '#capabilities';
import { meta } from '#meta';

export const CommentsPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({
    requires: AppGraphBuilder.requires,
    provides: AppGraphBuilder.provides,
    activate: AppGraphBuilder,
  }),
  AppPlugin.addSkillDefinitionModule({
    requires: SkillDefinition.requires,
    provides: SkillDefinition.provides,
    activate: SkillDefinition,
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
  AppPlugin.addSchemaModule({
    schema: [AnchoredTo.AnchoredTo, Message.Message, Thread.Thread],
  }),
  Plugin.make,
);

export default CommentsPlugin;

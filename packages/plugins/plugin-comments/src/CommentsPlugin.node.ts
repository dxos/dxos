//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { AnchoredTo, Message, Thread } from '@dxos/types';

import { AppGraphBuilder, OperationHandler, SkillDefinition, UndoMappings } from '#capabilities';
import { meta } from '#meta';

export const CommentsPlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(AppGraphBuilder),
  Plugin.addLazyModule(SkillDefinition),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(UndoMappings),
  Plugin.addLazyModule(AppCapability.schema([AnchoredTo.AnchoredTo, Message.Message, Thread.Thread])),
  Plugin.make,
);

export default CommentsPlugin;

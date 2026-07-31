//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { AnchoredTo, Message, Thread } from '@dxos/types';

import {
  AppGraphBuilder,
  HistoryGraph,
  OperationHandler,
  ReviewState,
  SkillDefinition,
  UndoMappings,
} from '#capabilities';
import { meta } from '#meta';

export const ReviewPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(HistoryGraph),
  Plugin.addModule(ReviewState),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(UndoMappings),
  Plugin.addModule(AppCapability.schema([AnchoredTo.AnchoredTo, Message.Message, Thread.Thread])),
  Plugin.make,
);

export default ReviewPlugin;

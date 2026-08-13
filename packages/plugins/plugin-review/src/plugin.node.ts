//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  HistoryGraph,
  OperationHandler,
  ReviewState,
  Schema,
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
  Plugin.addModule(Schema),
  Plugin.make,
);

export default ReviewPlugin;

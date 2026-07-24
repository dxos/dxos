//
// Copyright 2023 DXOS.org
//

import { ActivationEvent, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
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
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addAppGraphModule({ activate: HistoryGraph }),
  Plugin.addModule({
    id: 'review-state',
    activatesOn: ActivationEvent.oneOf(AppActivationEvents.SetupSettings, AppActivationEvents.SetupAppGraph),
    activate: ReviewState,
  }),
  AppPlugin.addSkillDefinitionModule({ activate: SkillDefinition }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addUndoMappingsModule({ activate: UndoMappings }),
  AppPlugin.addSchemaModule({
    schema: [AnchoredTo.AnchoredTo, Message.Message, Thread.Thread],
  }),
  Plugin.make,
);

export default ReviewPlugin;

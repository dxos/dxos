//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { AnchoredTo, Channel, Message, Thread } from '@dxos/types';

import { AppGraphBuilder, BlueprintDefinition, CreateObject, OperationHandler, UndoMappings } from '#capabilities';
import { meta } from '#meta';

export const ThreadPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addUndoMappingsModule({ activate: UndoMappings }),
  AppPlugin.addSchemaModule({
    schema: [AnchoredTo.AnchoredTo, Channel.Channel, Message.Message, Thread.Thread],
  }),
  Plugin.make,
);

export default ThreadPlugin;

//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space/types';
import { AnchoredTo, Channel, Message, Thread } from '@dxos/types';

import { AppGraphBuilder, BlueprintDefinition, CreateObject, OperationHandler, UndoMappings } from '#capabilities';
import { meta } from '#meta';
import { ThreadOperation } from '#operations';

export const ThreadPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addUndoMappingsModule({ activate: UndoMappings }),
  AppPlugin.addSchemaModule({
    schema: [AnchoredTo.AnchoredTo, Channel.Channel, Message.Message, Thread.Thread],
  }),
  Plugin.addModule({
    id: 'on-space-created',
    activatesOn: SpaceEvents.SpaceCreated,
    activate: () =>
      Effect.succeed(
        Capability.contributes(SpaceCapabilities.OnCreateSpace, (params) =>
          Operation.invoke(ThreadOperation.OnCreateSpace, params),
        ),
      ),
  }),
  Plugin.make,
);

export default ThreadPlugin;

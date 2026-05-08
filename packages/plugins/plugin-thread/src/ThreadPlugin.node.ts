//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { SpaceCapabilities, SpaceEvents, type CreateObject } from '@dxos/plugin-space/types';
import { AnchoredTo, Channel, Message, Thread } from '@dxos/types';

import { AppGraphBuilder, BlueprintDefinition, OperationHandler, UndoMappings } from '#capabilities';
import { THREAD_ITEM, meta } from '#meta';
import { ThreadOperation } from '#operations';

export const ThreadPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  Plugin.addModule({
    id: 'create-object',
    activatesOn: AppActivationEvents.SetupMetadata,
    activate: Effect.fnUntraced(function* () {
      return Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Channel.Channel.typename,
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = Channel.make(props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            });
          })) satisfies CreateObject,
      });
    }),
  }),
  AppPlugin.addMetadataModule({
    metadata: {
      id: THREAD_ITEM,
      metadata: {
        parse: (item: Thread.Thread, type: string) => {
          switch (type) {
            case 'node':
              return { id: item.id, label: item.name, data: item };
            case 'object':
              return item;
            case 'view-object':
              return { id: `${item.id}-view`, object: item };
          }
        },
      },
    },
  }),
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

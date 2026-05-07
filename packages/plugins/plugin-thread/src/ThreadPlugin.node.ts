//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Annotation, Ref, Type } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { SpaceCapabilities, SpaceEvents, type CreateObject } from '@dxos/plugin-space/types';
import { AnchoredTo, Message, Thread } from '@dxos/types';

import { AppGraphBuilder, BlueprintDefinition, OperationHandler, UndoMappings } from '#capabilities';
import { THREAD_ITEM, meta } from '#meta';
import { ThreadOperation } from '#operations';
import { Channel } from '#types';

export const ThreadPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addMetadataModule({
    metadata: [
      {
        id: Type.getTypename(Channel.Channel),
        metadata: {
          icon: Annotation.IconAnnotation.get(Channel.Channel).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Channel.Channel).pipe(Option.getOrThrow).hue ?? 'white',
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
        },
      },
      {
        id: Type.getTypename(Thread.Thread),
        metadata: {
          // TODO(wittjosiah): Move out of metadata.
          loadReferences: async (thread: Thread.Thread) => await Ref.Array.loadAll(thread.messages ?? []),
        },
      },
      {
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
    ],
  }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addOperationHandlerModule({ activate: UndoMappings }),
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

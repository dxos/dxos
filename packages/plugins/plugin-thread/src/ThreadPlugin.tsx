//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Annotation, Ref, Type } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { ClientEvents } from '@dxos/plugin-client';
import { MarkdownEvents } from '@dxos/plugin-markdown';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';
import { type CreateObject } from '@dxos/plugin-space/types';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { translations as threadTranslations } from '@dxos/react-ui-thread';
import { AnchoredTo, Message, Thread } from '@dxos/types';

import {
  AppGraphBuilder,
  BlueprintDefinition,
  CallManager,
  Markdown,
  OperationHandler,
  UndoMappings,
  ReactRoot,
  ReactSurface,
  ThreadState,
} from './capabilities';
import { THREAD_ITEM, meta } from './meta';
import { ThreadOperation } from './operations';
import { translations } from './translations';
import { Channel } from './types';

// TODO(Zan): Every instance of `cursor` should be replaced with `anchor`.
//  NOTE(burdon): Review/discuss CursorConverter semantics.

// TODO(wittjosiah): Rename to ChatPlugin.
// TODO(wittjosiah): Enabling comments should likely be factored out of this plugin but depend on it's capabilities.
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
  AppPlugin.addOperationHandlerModule({ id: 'undo-mappings', activate: UndoMappings }),
  AppPlugin.addReactRootModule({ activate: ReactRoot }),
  AppPlugin.addSchemaModule({
    schema: [AnchoredTo.AnchoredTo, Channel.Channel, Message.Message, Thread.Thread],
  }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations: [...translations, ...threadTranslations] }),
  Plugin.addModule({
    id: 'call-manager',
    activatesOn: ClientEvents.ClientReady,
    activate: CallManager,
  }),
  // TODO(wittjosiah): Currently not used but leaving because there will likely be settings for threads again.
  // Plugin.addModule({
  //   id: 'settings',
  //   activatesOn: Events.SetupSettings,
  //   activate: ThreadSettings,
  // }),
  Plugin.addModule({
    id: 'state',
    // TODO(wittjosiah): Does not integrate with settings store.
    //   Should this be a different event?
    //   Should settings store be renamed to be more generic?
    activatesOn: AppActivationEvents.SetupSettings,
    activate: ThreadState,
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
  Plugin.addModule({
    id: 'markdown',
    activatesOn: MarkdownEvents.SetupExtensions,
    activate: Markdown,
  }),
  Plugin.make,
);

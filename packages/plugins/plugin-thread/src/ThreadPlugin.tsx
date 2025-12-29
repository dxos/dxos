//
// Copyright 2023 DXOS.org
//

import { Capability, Common, Plugin, createIntent } from '@dxos/app-framework';
import { Ref, Type } from '@dxos/echo';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { MarkdownEvents } from '@dxos/plugin-markdown';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';
import { translations as threadTranslations } from '@dxos/react-ui-thread';
import { AnchoredTo, Message, Thread } from '@dxos/types';

import {
  AppGraphBuilder,
  BlueprintDefinition,
  CallManager,
  IntentResolver,
  Markdown,
  ReactRoot,
  ReactSurface,
  Repair,
  ThreadState,
} from './capabilities';
import { THREAD_ITEM, meta } from './meta';
import { translations } from './translations';
import { Channel, ThreadAction } from './types';

// TODO(Zan): Every instance of `cursor` should be replaced with `anchor`.
//  NOTE(burdon): Review/discuss CursorConverter semantics.

// TODO(wittjosiah): Rename to ChatPlugin.
// TODO(wittjosiah): Enabling comments should likely be factored out of this plugin but depend on it's capabilities.
export const ThreadPlugin = Plugin.define(meta).pipe(
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
    activatesOn: Common.ActivationEvent.SetupSettings,
    activate: ThreadState,
  }),
  Common.Plugin.addTranslationsModule({ translations: [...translations, ...threadTranslations] }),
  Common.Plugin.addMetadataModule({
    metadata: [
      {
        id: Type.getTypename(Channel.Channel),
        metadata: {
          icon: 'ph--hash--regular',
          iconHue: 'rose',
          createObjectIntent: ((_, options) =>
            createIntent(ThreadAction.CreateChannel, {
              spaceId: options.db.spaceId,
            })) satisfies CreateObjectIntent,
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
        id: Message.Message.typename,
        metadata: {
          // TODO(wittjosiah): Move out of metadata.
          loadReferences: () => [], // loadObjectReferences(message, (message) => [...message.parts, message.context]),
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
  Plugin.addModule({
    id: 'schema',
    activatesOn: ClientEvents.SetupSchema,
    activate: () =>
      Capability.contributes(ClientCapabilities.Schema, [
        AnchoredTo.AnchoredTo,
        Channel.Channel,
        Message.Message,
        Message.MessageV1,
        Thread.Thread,
      ]),
  }),
  Plugin.addModule({
    id: 'migration',
    activatesOn: ClientEvents.SetupMigration,
    activate: () => Capability.contributes(ClientCapabilities.Migration, [Message.MessageV1ToV2]),
  }),
  Plugin.addModule({
    id: 'on-space-created',
    activatesOn: SpaceEvents.SpaceCreated,
    activate: () =>
      Capability.contributes(SpaceCapabilities.OnCreateSpace, (params) =>
        createIntent(ThreadAction.OnCreateSpace, params),
      ),
  }),
  Plugin.addModule({
    id: 'repair',
    activatesOn: ClientEvents.SpacesReady,
    activate: Repair,
  }),
  Plugin.addModule({
    id: 'markdown',
    activatesOn: MarkdownEvents.SetupExtensions,
    activate: Markdown,
  }),
  Plugin.addModule({
    id: 'react-root',
    activatesOn: Common.ActivationEvent.Startup,
    activate: ReactRoot,
  }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolver }),
  Common.Plugin.addAppGraphModule({ activate: AppGraphBuilder }),
  Plugin.addModule({
    id: 'blueprint',
    activatesOn: Common.ActivationEvent.SetupArtifactDefinition,
    activate: BlueprintDefinition,
  }),
  Plugin.make,
);

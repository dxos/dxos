//
// Copyright 2023 DXOS.org
//

import { Capabilities, contributes, createIntent, defineModule, definePlugin, Events } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { DeckCapabilities } from '@dxos/plugin-deck';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { ChannelType, defineObjectForm, MessageType, ThreadType } from '@dxos/plugin-space/types';
import { type ReactiveEchoObject, RefArray } from '@dxos/react-client/echo';
import { translations as threadTranslations } from '@dxos/react-ui-thread';

import { AppGraphBuilder, IntentResolver, Markdown, ReactSurface, ThreadState } from './capabilities';
import { meta, THREAD_ITEM, THREAD_PLUGIN } from './meta';
import translations from './translations';
import { ThreadAction } from './types';

// TODO(Zan): Every instance of `cursor` should be replaced with `anchor`.
//  NOTE(burdon): Review/discuss CursorConverter semantics.
export const ThreadPlugin = () =>
  definePlugin(meta, [
    // TODO(wittjosiah): Currently not used but leaving because there will likely be settings for threads again.
    // defineModule({
    //   id: `${meta.id}/module/settings`,
    //   activatesOn: Events.SetupSettings,
    //   activate: ThreadSettings,
    // }),
    defineModule({
      id: `${meta.id}/module/state`,
      activatesOn: Events.Startup,
      activate: ThreadState,
    }),
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, [...translations, ...threadTranslations]),
    }),
    defineModule({
      id: `${meta.id}/module/metadata`,
      activatesOn: Events.SetupMetadata,
      activate: () => [
        contributes(Capabilities.Metadata, {
          id: ChannelType.typename,
          metadata: {
            placeholder: ['channel name placeholder', { ns: THREAD_PLUGIN }],
            icon: 'ph--chat--regular',
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: async (channel: ChannelType) => await RefArray.loadAll(channel.threads ?? []),
          },
        }),
        contributes(Capabilities.Metadata, {
          id: ThreadType.typename,
          metadata: {
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: async (thread: ThreadType) => await RefArray.loadAll(thread.messages ?? []),
          },
        }),
        contributes(Capabilities.Metadata, {
          id: MessageType.typename,
          metadata: {
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (message: MessageType) => [], // loadObjectReferences(message, (message) => [...message.parts, message.context]),
          },
        }),
        contributes(Capabilities.Metadata, {
          id: THREAD_ITEM,
          metadata: {
            parse: (item: ReactiveEchoObject<any>, type: string) => {
              switch (type) {
                case 'node':
                  return { id: item.id, label: item.title, data: item };
                case 'object':
                  return item;
                case 'view-object':
                  return { id: `${item.id}-view`, object: item };
              }
            },
          },
        }),
      ],
    }),
    defineModule({
      id: `${meta.id}/module/object-form`,
      activatesOn: ClientEvents.SetupSchema,
      activate: () =>
        contributes(
          SpaceCapabilities.ObjectForm,
          defineObjectForm({
            objectSchema: ChannelType,
            getIntent: () => createIntent(ThreadAction.Create),
          }),
        ),
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupSchema,
      activate: () => contributes(ClientCapabilities.Schema, [ThreadType, MessageType]),
    }),
    defineModule({
      id: `${meta.id}/module/complementary-panel`,
      activatesOn: Events.Startup,
      activate: () =>
        contributes(DeckCapabilities.ComplementaryPanel, {
          id: 'comments',
          label: ['comments panel label', { ns: THREAD_PLUGIN }],
          icon: 'ph--chat-text--regular',
        }),
    }),
    defineModule({
      id: `${meta.id}/module/markdown`,
      activatesOn: Events.Startup,
      activate: Markdown,
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.SetupSurfaces,
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activatesOn: Events.SetupIntents,
      activate: IntentResolver,
    }),
    defineModule({
      id: `${meta.id}/module/app-graph-builder`,
      activatesOn: Events.SetupAppGraph,
      activate: AppGraphBuilder,
    }),
  ]);

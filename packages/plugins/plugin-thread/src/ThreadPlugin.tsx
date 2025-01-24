//
// Copyright 2023 DXOS.org
//

import {
  allOf,
  Capabilities,
  contributes,
  createIntent,
  defineModule,
  definePlugin,
  Events,
  oneOf,
  type PluginsContext,
} from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { DeckCapabilities } from '@dxos/plugin-deck';
import { ChannelType, MessageType, ThreadType } from '@dxos/plugin-space/types';
import { type ReactiveEchoObject, RefArray } from '@dxos/react-client/echo';
import { translations as threadTranslations } from '@dxos/react-ui-thread';

import { AppGraphBuilder, IntentResolver, Markdown, ReactSurface, ThreadSettings, ThreadState } from './capabilities';
import { meta, THREAD_ITEM, THREAD_PLUGIN } from './meta';
import translations from './translations';
import { ThreadAction, type ThreadSettingsProps } from './types';

// TODO(Zan): Every instance of `cursor` should be replaced with `anchor`.
//  NOTE(burdon): Review/discuss CursorConverter semantics.
export const ThreadPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/settings`,
      activatesOn: Events.SetupSettings,
      activate: ThreadSettings,
    }),
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
      activatesOn: oneOf(Events.Startup, Events.SetupAppGraph),
      activate: () => [
        contributes(Capabilities.Metadata, {
          id: ChannelType.typename,
          metadata: {
            createObject: (props: { name?: string }) => createIntent(ThreadAction.Create, props),
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
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupClient,
      activate: () => contributes(ClientCapabilities.SystemSchema, [ThreadType, MessageType]),
    }),
    defineModule({
      id: `${meta.id}/module/channel-schema`,
      activatesOn: allOf(Events.SettingsReady, ClientEvents.ClientReady),
      activate: (context: PluginsContext) => {
        const client = context.requestCapability(ClientCapabilities.Client);
        const settings = context
          .requestCapability(Capabilities.SettingsStore)
          .getStore<ThreadSettingsProps>(THREAD_PLUGIN)!.value;
        if (settings.standalone) {
          // TODO(wittjosiah): Requires reload to disable.
          client.addTypes([ChannelType]);
          return contributes(ClientCapabilities.Schema, [ChannelType]);
        }

        return [];
      },
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
      activatesOn: Events.Startup,
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

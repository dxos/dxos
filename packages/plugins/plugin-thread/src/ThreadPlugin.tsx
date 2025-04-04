//
// Copyright 2023 DXOS.org
//

import { Capabilities, contributes, createIntent, defineModule, definePlugin, Events } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { DeckCapabilities, DeckEvents } from '@dxos/plugin-deck';
import { MarkdownEvents } from '@dxos/plugin-markdown';
import { SpaceCapabilities, ThreadEvents } from '@dxos/plugin-space';
import { ChannelType, defineObjectForm, ThreadType } from '@dxos/plugin-space/types';
import { type ReactiveEchoObject, RefArray } from '@dxos/react-client/echo';
import { translations as threadTranslations } from '@dxos/react-ui-thread';
import { MessageType, MessageTypeV1, MessageTypeV1ToV2 } from '@dxos/schema';

import { IntentResolver, Markdown, ReactSurface, ThreadState } from './capabilities';
import { ThreadEvents as LocalThreadEvents } from './events';
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
      // TODO(wittjosiah): Does not integrate with settings store.
      //   Should this be a different event?
      //   Should settings store be renamed to be more generic?
      activatesOn: Events.SetupSettings,
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
            icon: 'ph--hash--regular',
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
            getIntent: (_, options) => createIntent(ThreadAction.CreateChannel, { spaceId: options.space.id }),
          }),
        ),
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupSchema,
      activate: () => contributes(ClientCapabilities.Schema, [ThreadType, MessageType, MessageTypeV1]),
    }),
    defineModule({
      id: `${meta.id}/module/migration`,
      activatesOn: ClientEvents.SetupMigration,
      activate: () => contributes(ClientCapabilities.Migration, [MessageTypeV1ToV2]),
    }),
    defineModule({
      id: `${meta.id}/module/complementary-panel`,
      activatesOn: DeckEvents.SetupComplementaryPanels,
      activate: () =>
        contributes(DeckCapabilities.ComplementaryPanel, {
          id: 'comments',
          label: ['comments panel label', { ns: THREAD_PLUGIN }],
          icon: 'ph--chat-text--regular',
          position: 'hoist',
          // TODO(wittjosiah): Support comments on any object.
          // filter: (node) => isEchoObject(node.data) && !!getSpace(node.data),
          filter: (node) =>
            !!node.data &&
            typeof node.data === 'object' &&
            'threads' in node.data &&
            Array.isArray(node.data.threads) &&
            !(node.data instanceof ChannelType),
        }),
    }),
    defineModule({
      id: `${meta.id}/module/markdown`,
      activatesOn: MarkdownEvents.SetupExtensions,
      activate: Markdown,
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.SetupReactSurface,
      // TODO(wittjosiah): Should occur before the comments thread is loaded when surfaces activation is more granular.
      activatesBefore: [ThreadEvents.SetupThread, LocalThreadEvents.SetupActivity],
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activatesOn: Events.SetupIntentResolver,
      activate: IntentResolver,
    }),
  ]);

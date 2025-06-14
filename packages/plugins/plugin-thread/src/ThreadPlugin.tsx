//
// Copyright 2023 DXOS.org
//

import { Capabilities, contributes, createIntent, defineModule, definePlugin, Events } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { MarkdownEvents } from '@dxos/plugin-markdown';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { defineObjectForm } from '@dxos/plugin-space/types';
import { type AnyLiveObject, RefArray } from '@dxos/react-client/echo';
import { translations as threadTranslations } from '@dxos/react-ui-thread';
import { AnchoredTo, DataType } from '@dxos/schema';

import {
  AppGraphBuilder,
  CallManager,
  IntentResolver,
  Markdown,
  ReactRoot,
  ReactSurface,
  ThreadState,
} from './capabilities';
import { meta, THREAD_ITEM } from './meta';
import translations from './translations';
import { ChannelType, ThreadAction, ThreadType } from './types';

// TODO(Zan): Every instance of `cursor` should be replaced with `anchor`.
//  NOTE(burdon): Review/discuss CursorConverter semantics.

// TODO(wittjosiah): Rename to ChatPlugin.
// TODO(wittjosiah): Enabling comments should likely be factored out of this plugin but depend on it's capabilities.
export const ThreadPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/call-manager`,
      activatesOn: ClientEvents.ClientReady,
      activate: CallManager,
    }),
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
          id: DataType.Message.typename,
          metadata: {
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (message: DataType.Message) => [], // loadObjectReferences(message, (message) => [...message.parts, message.context]),
          },
        }),
        contributes(Capabilities.Metadata, {
          id: THREAD_ITEM,
          metadata: {
            parse: (item: AnyLiveObject<any>, type: string) => {
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
      activate: () =>
        contributes(ClientCapabilities.Schema, [AnchoredTo, ThreadType, DataType.Message, DataType.MessageV1]),
    }),
    defineModule({
      id: `${meta.id}/module/migration`,
      activatesOn: ClientEvents.SetupMigration,
      activate: () => contributes(ClientCapabilities.Migration, [DataType.MessageV1ToV2]),
    }),
    defineModule({
      id: `${meta.id}/module/markdown`,
      activatesOn: MarkdownEvents.SetupExtensions,
      activate: Markdown,
    }),
    defineModule({
      id: `${meta.id}/module/react-root`,
      activatesOn: Events.Startup,
      activate: ReactRoot,
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.SetupReactSurface,
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activatesOn: Events.SetupIntentResolver,
      activate: IntentResolver,
    }),
    defineModule({
      id: `${meta.id}/module/app-graph-builder`,
      activatesOn: Events.SetupAppGraph,
      activate: AppGraphBuilder,
    }),
  ]);

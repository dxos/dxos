//
// Copyright 2025 DXOS.org
//

import { createIntent } from '@dxos/app-framework';
import { Capabilities, contributes, defineModule, definePlugin, eventKey, Events } from '@dxos/app-framework/next';
import { type BaseObject } from '@dxos/echo-schema';
import { RefArray } from '@dxos/live-object';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { translations as editorTranslations } from '@dxos/react-ui-editor';

import {
  MarkdownState,
  MarkdownSettings,
  ReactSurface,
  IntentResolver,
  AppGraphSerializer,
  Thread,
} from './capabilities';
import meta, { MARKDOWN_PLUGIN } from './meta';
import translations from './translations';
import { DocumentType, MarkdownAction, TextType } from './types';
import { serializer } from './util';

export const MarkdownPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${MARKDOWN_PLUGIN}/module/settings`,
      activationEvents: [eventKey(Events.SetupSettings)],
      activate: MarkdownSettings,
    }),
    defineModule({
      id: `${MARKDOWN_PLUGIN}/module/state`,
      activationEvents: [eventKey(Events.Startup)],
      activate: MarkdownState,
    }),
    defineModule({
      id: `${MARKDOWN_PLUGIN}/module/translations`,
      activationEvents: [eventKey(Events.SetupTranslations)],
      activate: () => contributes(Capabilities.Translations, [...translations, ...editorTranslations]),
    }),
    defineModule({
      id: `${MARKDOWN_PLUGIN}/module/metadata`,
      activationEvents: [eventKey(Events.Startup)],
      activate: () =>
        contributes(Capabilities.Metadata, {
          id: DocumentType.typename,
          metadata: {
            createObject: (props: { name?: string }) => createIntent(MarkdownAction.Create, props),
            label: (object: any) => (object instanceof DocumentType ? object.name || object.fallbackName : undefined),
            placeholder: ['document title placeholder', { ns: MARKDOWN_PLUGIN }],
            icon: 'ph--text-aa--regular',
            graphProps: {
              managesAutofocus: true,
            },
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: async (doc: DocumentType) =>
              await RefArray.loadAll<BaseObject>([doc.content, ...doc.threads]),
            serializer,
          },
        }),
    }),
    defineModule({
      id: `${MARKDOWN_PLUGIN}/module/schema`,
      activationEvents: [eventKey(ClientEvents.SetupClient)],
      activate: () => [
        contributes(ClientCapabilities.SystemSchema, [TextType]),
        contributes(ClientCapabilities.Schema, [DocumentType]),
      ],
    }),
    defineModule({
      id: `${MARKDOWN_PLUGIN}/module/react-surface`,
      activationEvents: [eventKey(Events.Startup)],
      activate: ReactSurface,
    }),
    defineModule({
      id: `${MARKDOWN_PLUGIN}/module/intent-resolver`,
      activationEvents: [eventKey(Events.SetupIntents)],
      activate: IntentResolver,
    }),
    defineModule({
      id: `${MARKDOWN_PLUGIN}/module/app-graph-serializer`,
      activationEvents: [eventKey(Events.Startup)],
      activate: AppGraphSerializer,
    }),
    defineModule({
      id: `${MARKDOWN_PLUGIN}/module/thread`,
      activationEvents: [eventKey(Events.Startup)],
      activate: Thread,
    }),
  ]);

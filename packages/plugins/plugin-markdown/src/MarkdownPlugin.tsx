//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createIntent, defineModule, definePlugin, Events } from '@dxos/app-framework';
import { type BaseObject } from '@dxos/echo-schema';
import { RefArray } from '@dxos/live-object';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { translations as editorTranslations } from '@dxos/react-ui-editor';
import { TextType } from '@dxos/schema';

import {
  MarkdownState,
  MarkdownSettings,
  ReactSurface,
  IntentResolver,
  AppGraphSerializer,
  Thread,
} from './capabilities';
import { MARKDOWN_PLUGIN, meta } from './meta';
import translations from './translations';
import { DocumentType, MarkdownAction } from './types';
import { serializer } from './util';

export const MarkdownPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/settings`,
      activatesOn: Events.SetupSettings,
      activate: MarkdownSettings,
    }),
    defineModule({
      id: `${meta.id}/module/state`,
      activatesOn: Events.Startup,
      activate: MarkdownState,
    }),
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, [...translations, ...editorTranslations]),
    }),
    defineModule({
      id: `${meta.id}/module/metadata`,
      activatesOn: Events.SetupMetadata,
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
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupSchema,
      activate: () => [
        contributes(ClientCapabilities.SystemSchema, [TextType]),
        contributes(ClientCapabilities.Schema, [DocumentType]),
      ],
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
      id: `${meta.id}/module/app-graph-serializer`,
      activatesOn: Events.Startup,
      activate: AppGraphSerializer,
    }),
    defineModule({
      id: `${meta.id}/module/thread`,
      activatesOn: Events.Startup,
      activate: Thread,
    }),
  ]);

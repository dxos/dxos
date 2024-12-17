//
// Copyright 2023 DXOS.org
//

import { pipe } from 'effect';
import React from 'react';

import {
  parseIntentPlugin,
  resolvePlugin,
  type PluginDefinition,
  createSurface,
  createResolver,
  createIntent,
  chain,
} from '@dxos/app-framework';
import { create } from '@dxos/live-object';
import { LocalStorageStore } from '@dxos/local-storage';
import { SpaceAction } from '@dxos/plugin-space';
import { CollectionType } from '@dxos/plugin-space/types';
import {
  createDocAccessor,
  fullyQualifiedId,
  getRangeFromCursor,
  isSpace,
  loadObjectReferences,
} from '@dxos/react-client/echo';
import {
  type EditorInputMode,
  type EditorViewMode,
  translations as editorTranslations,
  createEditorStateStore,
} from '@dxos/react-ui-editor';

import { MarkdownContainer, MarkdownSettings } from './components';
import meta, { MARKDOWN_PLUGIN } from './meta';
import translations from './translations';
import { DocumentType, isEditorModel, TextType } from './types';
import {
  type MarkdownPluginProvides,
  type MarkdownSettingsProps,
  MarkdownAction,
  type MarkdownPluginState,
} from './types';
import { markdownExtensionPlugins, serializer } from './util';

export const MarkdownPlugin = (): PluginDefinition<MarkdownPluginProvides> => {
  const settings = new LocalStorageStore<MarkdownSettingsProps>(MARKDOWN_PLUGIN, {
    defaultViewMode: 'preview',
    toolbar: true,
    numberedHeadings: true,
    folding: true,
    experimental: false,
  });

  const editorStateStore = createEditorStateStore(`${MARKDOWN_PLUGIN}/editor`);

  const state = new LocalStorageStore<MarkdownPluginState>(MARKDOWN_PLUGIN, { extensionProviders: [], viewMode: {} });

  const getViewMode = (id: string) => (id && state.values.viewMode[id]) || settings.values.defaultViewMode;
  const setViewMode = (id: string, viewMode: EditorViewMode) => (state.values.viewMode[id] = viewMode);

  return {
    meta,
    ready: async ({ plugins }) => {
      settings
        .prop({ key: 'defaultViewMode', type: LocalStorageStore.enum<EditorViewMode>() })
        .prop({ key: 'editorInputMode', type: LocalStorageStore.enum<EditorInputMode>({ allowUndefined: true }) })
        .prop({ key: 'toolbar', type: LocalStorageStore.bool({ allowUndefined: true }) })
        .prop({ key: 'experimental', type: LocalStorageStore.bool({ allowUndefined: true }) })
        .prop({ key: 'debug', type: LocalStorageStore.bool({ allowUndefined: true }) })
        .prop({ key: 'typewriter', type: LocalStorageStore.string({ allowUndefined: true }) })
        .prop({ key: 'numberedHeadings', type: LocalStorageStore.bool({ allowUndefined: true }) })
        .prop({ key: 'folding', type: LocalStorageStore.bool({ allowUndefined: true }) });

      state.prop({ key: 'viewMode', type: LocalStorageStore.json<{ [key: string]: EditorViewMode }>() });

      markdownExtensionPlugins(plugins).forEach((plugin) => {
        const { extensions } = plugin.provides.markdown;
        state.values.extensionProviders?.push(extensions);
      });
    },
    provides: {
      settings: settings.values,
      metadata: {
        records: {
          [DocumentType.typename]: {
            createObject: (props: { name?: string }) => createIntent(MarkdownAction.Create, props),
            label: (object: any) => (object instanceof DocumentType ? object.name || object.fallbackName : undefined),
            placeholder: ['document title placeholder', { ns: MARKDOWN_PLUGIN }],
            icon: 'ph--text-aa--regular',
            graphProps: {
              managesAutofocus: true,
            },
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (doc: DocumentType) => loadObjectReferences(doc, (doc) => [doc.content, ...doc.threads]),
            serializer,
          },
        },
      },
      translations: [...translations, ...editorTranslations],
      echo: {
        schema: [DocumentType],
        system: [TextType],
      },
      graph: {
        serializer: (plugins) => {
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatchPromise;
          if (!dispatch) {
            return [];
          }

          return [
            {
              inputType: DocumentType.typename,
              outputType: 'text/markdown',
              // Reconcile with metadata serializers.
              serialize: async (node) => {
                const doc = node.data;
                const content = await loadObjectReferences(doc, (doc) => doc.content);
                return {
                  name:
                    doc.name ||
                    doc.fallbackName ||
                    translations[0]['en-US'][MARKDOWN_PLUGIN]['document title placeholder'],
                  data: content.content,
                  type: 'text/markdown',
                };
              },
              deserialize: async (data, ancestors) => {
                const space = ancestors.find(isSpace);
                const target =
                  ancestors.findLast((ancestor) => ancestor instanceof CollectionType) ??
                  space?.properties[CollectionType.typename];
                if (!space || !target) {
                  return;
                }

                const result = await dispatch(
                  pipe(
                    createIntent(MarkdownAction.Create, { name: data.name, content: data.data }),
                    chain(SpaceAction.AddObject, { target }),
                  ),
                );

                return result.data?.object;
              },
            },
          ];
        },
      },
      thread: {
        predicate: (obj) => obj instanceof DocumentType,
        createSort: (doc: DocumentType) => {
          const accessor = doc.content ? createDocAccessor(doc.content, ['content']) : undefined;
          if (!accessor) {
            return (_) => 0;
          }

          const getStartPosition = (cursor: string | undefined) => {
            const range = cursor ? getRangeFromCursor(accessor, cursor) : undefined;
            return range?.start ?? Number.MAX_SAFE_INTEGER;
          };

          return (anchorA: string | undefined, anchorB: string | undefined): number => {
            if (anchorA === undefined || anchorB === undefined) {
              return 0;
            }
            const posA = getStartPosition(anchorA);
            const posB = getStartPosition(anchorB);
            return posA - posB;
          };
        },
      },
      surface: {
        definitions: () => [
          createSurface({
            id: `${MARKDOWN_PLUGIN}/document`,
            role: ['article', 'section'],
            filter: (data): data is { subject: DocumentType } => data.subject instanceof DocumentType,
            component: ({ data, role }) => (
              <MarkdownContainer
                id={fullyQualifiedId(data.subject)}
                object={data.subject}
                role={role}
                settings={settings.values}
                extensionProviders={state.values.extensionProviders}
                viewMode={getViewMode(fullyQualifiedId(data.subject))}
                editorStateStore={editorStateStore}
                onViewModeChange={setViewMode}
              />
            ),
          }),
          createSurface({
            id: `${MARKDOWN_PLUGIN}/editor`,
            role: ['article', 'section'],
            filter: (data): data is { subject: { id: string; text: string } } => isEditorModel(data.subject),
            component: ({ data, role }) => (
              <MarkdownContainer
                id={data.subject.id}
                object={data.subject}
                role={role}
                settings={settings.values}
                extensionProviders={state.values.extensionProviders}
                viewMode={getViewMode(data.subject.id)}
                editorStateStore={editorStateStore}
                onViewModeChange={setViewMode}
              />
            ),
          }),
          createSurface({
            id: `${MARKDOWN_PLUGIN}/settings`,
            role: 'settings',
            filter: (data): data is any => data.subject === MARKDOWN_PLUGIN,
            component: () => <MarkdownSettings settings={settings.values} />,
          }),
        ],
      },
      intent: {
        resolvers: () => [
          createResolver(MarkdownAction.Create, ({ name, content }) => {
            const doc = create(DocumentType, {
              name,
              content: create(TextType, { content: content ?? '' }),
              threads: [],
            });

            return { data: { object: doc } };
          }),
          createResolver(MarkdownAction.SetViewMode, ({ id, viewMode }) => {
            state.values.viewMode[id] = viewMode;
          }),
        ],
      },
    },
  };
};

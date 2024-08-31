//
// Copyright 2023 DXOS.org
//

import { type IconProps, TextAa } from '@phosphor-icons/react';
import React, { type Ref } from 'react';

import {
  LayoutAction,
  isObject,
  parseIntentPlugin,
  resolvePlugin,
  type PluginDefinition,
  NavigationAction,
  type LayoutCoordinate,
} from '@dxos/app-framework';
import { create } from '@dxos/echo-schema';
import { LocalStorageStore } from '@dxos/local-storage';
import { parseClientPlugin } from '@dxos/plugin-client';
import { type ActionGroup, createExtension, isActionGroup } from '@dxos/plugin-graph';
import { SpaceAction } from '@dxos/plugin-space';
import { CollectionType } from '@dxos/plugin-space/types';
import { fullyQualifiedId, isSpace, loadObjectReferences } from '@dxos/react-client/echo';
import {
  type EditorInputMode,
  type EditorViewMode,
  EditorViewModes,
  translations as editorTranslations,
} from '@dxos/react-ui-editor';
import { isTileComponentProps } from '@dxos/react-ui-mosaic';

import { type DocumentItemProps, DocumentCard, DocumentEditor, MarkdownEditor, MarkdownSettings } from './components';
import meta, { MARKDOWN_PLUGIN } from './meta';
import translations from './translations';
import { DocumentType, TextType } from './types';
import {
  type MarkdownPluginProvides,
  type MarkdownSettingsProps,
  MarkdownAction,
  type MarkdownPluginState,
} from './types';
import { markdownExtensionPlugins, serializer } from './util';

/**
 * Checks if an object conforms to the interface needed to render an editor.
 */
const isEditorModel = (data: any): data is { id: string; text: string } => {
  return (
    data &&
    typeof data === 'object' &&
    'id' in data &&
    typeof data.id === 'string' &&
    'text' in data &&
    typeof data.text === 'string'
  );
};

export const MarkdownPlugin = (): PluginDefinition<MarkdownPluginProvides> => {
  const settings = new LocalStorageStore<MarkdownSettingsProps>(MARKDOWN_PLUGIN, {
    defaultViewMode: 'preview',
    toolbar: true,
    experimental: false,
  });

  const state = new LocalStorageStore<MarkdownPluginState>(MARKDOWN_PLUGIN, { extensionProviders: [], viewMode: {} });

  const getViewMode = (id?: string) => {
    return (id && state.values.viewMode[id]) || settings.values.defaultViewMode;
  };

  const setViewMode = (id: string, nextViewMode: EditorViewMode) => {
    state.values.viewMode[id] = nextViewMode;
  };

  return {
    meta,
    ready: async (plugins) => {
      settings
        .prop({
          key: 'defaultViewMode',
          storageKey: 'default-view-mode',
          type: LocalStorageStore.enum<EditorViewMode>(),
        })
        .prop({
          key: 'editorInputMode',
          storageKey: 'editor-mode',
          type: LocalStorageStore.enum<EditorInputMode>({ allowUndefined: true }),
        })
        .prop({ key: 'toolbar', type: LocalStorageStore.bool({ allowUndefined: true }) })
        .prop({ key: 'experimental', type: LocalStorageStore.bool({ allowUndefined: true }) })
        .prop({ key: 'debug', type: LocalStorageStore.bool({ allowUndefined: true }) })
        .prop({ key: 'typewriter', type: LocalStorageStore.string({ allowUndefined: true }) })
        .prop({ key: 'numberedHeadings', type: LocalStorageStore.bool({ allowUndefined: true }) });

      state.prop({
        key: 'viewMode',
        storageKey: 'view-mode',
        type: LocalStorageStore.json<{ [key: string]: EditorViewMode }>(),
      });

      markdownExtensionPlugins(plugins).forEach((plugin) => {
        const { extensions } = plugin.provides.markdown;
        state.values.extensionProviders.push(extensions);
      });
    },
    provides: {
      settings: settings.values,
      metadata: {
        records: {
          [DocumentType.typename]: {
            label: (object: any) => (object instanceof DocumentType ? object.name ?? object.fallbackName : undefined),
            placeholder: ['document title placeholder', { ns: MARKDOWN_PLUGIN }],
            icon: (props: IconProps) => <TextAa {...props} />,
            iconSymbol: 'ph--text-aa--regular',
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
        schema: [DocumentType, TextType],
      },
      graph: {
        builder: (plugins) => {
          const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
          if (!client || !dispatch) {
            return [];
          }

          return createExtension({
            id: MarkdownAction.CREATE,
            filter: (node): node is ActionGroup => isActionGroup(node) && node.id.startsWith(SpaceAction.ADD_OBJECT),
            actions: ({ node }) => {
              const id = node.id.split('/').at(-1);
              const [spaceId, objectId] = id?.split(':') ?? [];
              const space = client.spaces.get().find((space) => space.id === spaceId);
              const object = objectId && space?.db.getObjectById(objectId);
              const target = objectId ? object : space;
              if (!target) {
                return;
              }

              return [
                {
                  id: `${MARKDOWN_PLUGIN}/create/${node.id}`,
                  data: async () => {
                    await dispatch([
                      { plugin: MARKDOWN_PLUGIN, action: MarkdownAction.CREATE },
                      { action: SpaceAction.ADD_OBJECT, data: { target } },
                      { action: NavigationAction.OPEN },
                    ]);
                  },
                  properties: {
                    label: ['create document label', { ns: MARKDOWN_PLUGIN }],
                    icon: (props: IconProps) => <TextAa {...props} />,
                    iconSymbol: 'ph--text-aa--regular',
                    testId: 'markdownPlugin.createObject',
                  },
                },
              ];
            },
          });
        },
        serializer: (plugins) => {
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
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

                const result = await dispatch([
                  {
                    plugin: MARKDOWN_PLUGIN,
                    action: MarkdownAction.CREATE,
                    data: { name: data.name, content: data.data },
                  },
                  {
                    action: SpaceAction.ADD_OBJECT,
                    data: { target },
                  },
                ]);

                return result?.data.object;
              },
            },
          ];
        },
      },
      stack: {
        creators: [
          {
            id: 'create-stack-section-doc',
            testId: 'markdownPlugin.createSection',
            type: ['plugin name', { ns: MARKDOWN_PLUGIN }],
            label: ['create stack section label', { ns: MARKDOWN_PLUGIN }],
            icon: (props: any) => <TextAa {...props} />,
            intent: {
              plugin: MARKDOWN_PLUGIN,
              action: MarkdownAction.CREATE,
            },
          },
        ],
      },
      surface: {
        component: ({ data, role, ...props }, forwardedRef) => {
          const doc =
            data.active instanceof DocumentType
              ? data.active
              : data.object instanceof DocumentType
                ? data.object
                : undefined;

          switch (role) {
            case 'section':
            case 'article': {
              if (doc && doc.content) {
                return (
                  <DocumentEditor
                    role={role}
                    coordinate={data.coordinate as LayoutCoordinate}
                    document={doc}
                    extensionProviders={state.values.extensionProviders}
                    settings={settings.values}
                    viewMode={getViewMode(fullyQualifiedId(doc))}
                    onViewModeChange={setViewMode}
                    scrollPastEnd
                  />
                );
              } else if (isEditorModel(data.object)) {
                return (
                  <MarkdownEditor
                    role={role}
                    coordinate={data.coordinate as LayoutCoordinate}
                    id={data.object.id}
                    initialValue={data.object.text}
                    extensionProviders={state.values.extensionProviders}
                    inputMode={settings.values.editorInputMode}
                    toolbar={settings.values.toolbar}
                    viewMode={getViewMode(data.object.id)}
                    onViewModeChange={setViewMode}
                    scrollPastEnd
                  />
                );
              }
              break;
            }

            case 'card': {
              if (
                isObject(data.content) &&
                typeof data.content.id === 'string' &&
                data.content.object instanceof DocumentType
              ) {
                // isTileComponentProps is a type guard for these props.
                // `props` will not pass this guard without transforming `data` into `item`.
                const cardProps = {
                  ...props,
                  item: {
                    id: data.content.id,
                    object: data.content.object,
                    color: typeof data.content.color === 'string' ? data.content.color : undefined,
                  } as DocumentItemProps,
                };

                return isTileComponentProps(cardProps) ? (
                  <DocumentCard {...cardProps} settings={settings.values} ref={forwardedRef as Ref<HTMLDivElement>} />
                ) : null;
              }
              break;
            }

            case 'settings': {
              return data.plugin === meta.id ? <MarkdownSettings settings={settings.values} /> : null;
            }
          }

          return null;
        },
      },
      intent: {
        resolver: ({ action, data }) => {
          switch (action) {
            case MarkdownAction.CREATE: {
              const doc = create(DocumentType, {
                name: data?.name,
                content: create(TextType, { content: data?.content ?? '' }),
                threads: [],
              });

              return {
                data: doc,
                intents: [[{ action: LayoutAction.SCROLL_INTO_VIEW, data: { id: doc.id } }]],
              };
            }

            case MarkdownAction.SET_VIEW_MODE: {
              const { id, viewMode } = data ?? {};
              if (typeof id === 'string' && EditorViewModes.includes(viewMode)) {
                state.values.viewMode[id] = viewMode;
                return { data: true };
              }

              break;
            }
          }
        },
      },
    },
  };
};

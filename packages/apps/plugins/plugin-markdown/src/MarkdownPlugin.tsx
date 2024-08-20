//
// Copyright 2023 DXOS.org
//

import { type IconProps, TextAa } from '@phosphor-icons/react';
import React, { useCallback, useMemo, type Ref } from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { type ActionGroup, createExtension, isActionGroup } from '@braneframe/plugin-graph';
import { SpaceAction } from '@braneframe/plugin-space';
import { CollectionType, DocumentType, TextType } from '@braneframe/types';
import {
  LayoutAction,
  isObject,
  parseIntentPlugin,
  resolvePlugin,
  type IntentPluginProvides,
  type Plugin,
  type PluginDefinition,
  useResolvePlugin,
  parseFileManagerPlugin,
  NavigationAction,
  useIntentDispatcher,
} from '@dxos/app-framework';
import { create } from '@dxos/echo-schema';
import { LocalStorageStore } from '@dxos/local-storage';
import { getSpace, isSpace, loadObjectReferences, type Query } from '@dxos/react-client/echo';
import {
  type EditorInputMode,
  type EditorViewMode,
  EditorViewModes,
  translations as editorTranslations,
} from '@dxos/react-ui-editor';
import { isTileComponentProps } from '@dxos/react-ui-mosaic';

import {
  type DocumentItemProps,
  DocumentCard,
  DocumentMain,
  DocumentSection,
  MainLayout,
  MarkdownSettings,
} from './components';
import { getExtensions } from './extensions';
import meta, { MARKDOWN_PLUGIN } from './meta';
import translations from './translations';
import {
  type MarkdownPluginProvides,
  type MarkdownSettingsProps,
  MarkdownAction,
  type MarkdownPluginState,
} from './types';
import { getFallbackTitle, isMarkdownProperties, markdownExtensionPlugins } from './util';

export const MarkdownPlugin = (): PluginDefinition<MarkdownPluginProvides> => {
  const settings = new LocalStorageStore<MarkdownSettingsProps>(MARKDOWN_PLUGIN, {
    defaultViewMode: 'preview',
    toolbar: true,
    experimental: false,
  });

  const state = new LocalStorageStore<MarkdownPluginState>(MARKDOWN_PLUGIN, { extensions: [], viewMode: {} });

  let intentPlugin: Plugin<IntentPluginProvides> | undefined;

  // TODO(burdon): Move downstream outside of plugin.
  const getCustomExtensions = (document?: DocumentType, query?: Query<DocumentType>) => {
    // Configure extensions.
    const extensions = getExtensions({
      viewMode: document && state.values.viewMode[document.id],
      settings: settings.values,
      document,
      query,
      dispatch: intentPlugin?.provides.intent.dispatch,
    });

    // Add extensions from other plugins.
    for (const provider of state.values.extensions) {
      const provided = typeof provider === 'function' ? provider({ document }) : provider;
      extensions.push(...provided);
    }

    return extensions;
  };

  const getViewMode = (id?: string) => (id && state.values.viewMode[id]) || settings.values.defaultViewMode;

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
        .prop({ key: 'typewriter', type: LocalStorageStore.string({ allowUndefined: true }) });

      state.prop({
        key: 'viewMode',
        storageKey: 'view-mode',
        type: LocalStorageStore.json<{ [key: string]: EditorViewMode }>(),
      });

      intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

      markdownExtensionPlugins(plugins).forEach((plugin) => {
        const { extensions } = plugin.provides.markdown;
        state.values.extensions.push(extensions);
      });
    },
    provides: {
      settings: settings.values,
      metadata: {
        records: {
          [DocumentType.typename]: {
            label: (object: any) =>
              object instanceof DocumentType ? object.name ?? getFallbackTitle(object) : undefined,
            placeholder: ['document title placeholder', { ns: MARKDOWN_PLUGIN }],
            icon: (props: IconProps) => <TextAa {...props} />,
            iconSymbol: 'ph--text-aa--regular',
            graphProps: {
              managesAutofocus: true,
            },
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
              // Reconcile with @braneframe/types serializers.
              serialize: async (node) => {
                const doc = node.data;
                const content = await loadObjectReferences(doc, (doc) => doc.content);
                return {
                  name:
                    doc.name ||
                    getFallbackTitle(doc) ||
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
          // TODO(wittjosiah): Ideally this should only be called when the editor is actually being used.
          //   We probably want a better pattern for splitting this surface resolver up.
          const doc =
            data.active instanceof DocumentType
              ? data.active
              : data.object instanceof DocumentType
                ? data.object
                : undefined;
          const space = doc && getSpace(doc);
          const extensions = useMemo(() => {
            // TODO(wittjosiah): Autocomplete is not working and this query is causing performance issues.
            // const query = space?.db.query(Filter.schema(DocumentType));
            // query?.subscribe();
            return getCustomExtensions(doc /*, query */);
          }, [doc, space, settings.values.editorInputMode, getViewMode(doc?.id)]);

          const dispatch = useIntentDispatcher();
          const handleCommentSelect = useCallback(() => {
            void dispatch({ action: LayoutAction.SET_LAYOUT, data: { element: 'complementary', state: true } });
          }, [dispatch]);

          const fileManagerPlugin = useResolvePlugin(parseFileManagerPlugin);
          const handleFileUpload = useMemo(() => {
            if (space === undefined) {
              return undefined;
            }

            if (fileManagerPlugin?.provides.file.upload === undefined) {
              return undefined;
            }

            return async (file: File) => {
              return fileManagerPlugin?.provides?.file?.upload?.(file, space);
            };
          }, [fileManagerPlugin, space]);

          const handleViewModeChange = useCallback(
            (viewMode: EditorViewMode) => {
              if (doc) {
                state.values.viewMode[doc.id] = viewMode;
              }
            },
            [doc?.id],
          );

          switch (role) {
            // TODO(burdon): Normalize layout (reduce variants).
            case 'article': {
              if (doc) {
                return (
                  <DocumentMain
                    viewMode={getViewMode(doc.id)}
                    toolbar={settings.values.toolbar}
                    document={doc}
                    extensions={extensions}
                    onCommentSelect={handleCommentSelect}
                    onFileUpload={handleFileUpload}
                    onViewModeChange={handleViewModeChange}
                  />
                );
              } else {
                return null;
              }
            }
            case 'main': {
              if (data.active instanceof DocumentType) {
                return (
                  <MainLayout toolbar={settings.values.toolbar}>
                    <DocumentMain
                      viewMode={getViewMode(data.active.id)}
                      toolbar={settings.values.toolbar}
                      document={data.active}
                      extensions={extensions}
                      onFileUpload={handleFileUpload}
                      onViewModeChange={handleViewModeChange}
                    />
                  </MainLayout>
                );
              } else if (
                // TODO(burdon): Replace model with object ID.
                // 'model' in data &&
                // isEditorModel(data.model) &&
                'properties' in data &&
                isMarkdownProperties(data.properties)
              ) {
                return null;
                // const main = <EditorMain extensions={extensions} />;
                // if ('view' in data && data.view === 'embedded') {
                //   return <EmbeddedLayout>{main}</EmbeddedLayout>;
                // } else {
                //   return <MainLayout>{main}</MainLayout>;
                // }
              }
              break;
            }

            case 'section': {
              if (data.object instanceof DocumentType) {
                return (
                  <DocumentSection
                    document={data.object}
                    extensions={extensions}
                    viewMode={getViewMode(data.object.id)}
                    onCommentSelect={handleCommentSelect}
                    onViewModeChange={handleViewModeChange}
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

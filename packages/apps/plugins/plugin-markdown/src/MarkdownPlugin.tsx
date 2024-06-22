//
// Copyright 2023 DXOS.org
//

import { type IconProps, TextAa } from '@phosphor-icons/react';
import { batch, effect } from '@preact/signals-core';
import React, { useMemo, type Ref } from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { parseSpacePlugin, updateGraphWithAddObjectAction } from '@braneframe/plugin-space';
import { DocumentType, TextType } from '@braneframe/types';
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
} from '@dxos/app-framework';
import { EventSubscriptions } from '@dxos/async';
import { create } from '@dxos/echo-schema';
import { LocalStorageStore } from '@dxos/local-storage';
import { getSpace, Filter, type Query, fullyQualifiedId } from '@dxos/react-client/echo';
import { type EditorMode, translations as editorTranslations } from '@dxos/react-ui-editor';
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
  type ExtensionsProvider,
  type MarkdownPluginProvides,
  type MarkdownSettingsProps,
  MarkdownAction,
} from './types';
import { getFallbackTitle, isMarkdownProperties, markdownExtensionPlugins } from './util';

export type MarkdownPluginState = {
  // Codemirror extensions provided by other plugins.
  extensions: NonNullable<ExtensionsProvider>[];
};

export const MarkdownPlugin = (): PluginDefinition<MarkdownPluginProvides> => {
  const settings = new LocalStorageStore<MarkdownSettingsProps>(MARKDOWN_PLUGIN, {
    state: {},
    toolbar: true,
    experimental: false,
  });

  const state = create<MarkdownPluginState>({ extensions: [] });

  let intentPlugin: Plugin<IntentPluginProvides> | undefined;

  // TODO(burdon): Move downstream outside of plugin.
  const getCustomExtensions = (document?: DocumentType, query?: Query<DocumentType>) => {
    // Configure extensions.
    const extensions = getExtensions({
      dispatch: intentPlugin?.provides.intent.dispatch,
      settings: settings.values,
      document,
      query,
    });

    // Add extensions from other plugins.
    for (const provider of state.extensions) {
      const provided = typeof provider === 'function' ? provider({ document }) : provider;
      extensions.push(...provided);
    }

    return extensions;
  };

  return {
    meta,
    ready: async (plugins) => {
      settings
        .prop({
          key: 'editorMode',
          storageKey: 'editor-mode',
          type: LocalStorageStore.enum<EditorMode>({ allowUndefined: true }),
        })
        .prop({ key: 'toolbar', type: LocalStorageStore.bool({ allowUndefined: true }) })
        .prop({ key: 'experimental', type: LocalStorageStore.bool({ allowUndefined: true }) })
        .prop({ key: 'debug', type: LocalStorageStore.bool({ allowUndefined: true }) })
        .prop({ key: 'typewriter', type: LocalStorageStore.string({ allowUndefined: true }) });

      intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

      markdownExtensionPlugins(plugins).forEach((plugin) => {
        const { extensions } = plugin.provides.markdown;
        state.extensions.push(extensions);
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
          },
        },
      },
      translations: [...translations, ...editorTranslations],
      echo: {
        schema: [DocumentType, TextType],
      },
      graph: {
        builder: (plugins, graph) => {
          const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
          const enabled = resolvePlugin(plugins, parseSpacePlugin)?.provides.space.enabled;
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
          if (!client || !dispatch || !enabled) {
            return;
          }

          const subscriptions = new EventSubscriptions();
          const unsubscribe = effect(() => {
            subscriptions.clear();
            client.spaces.get().forEach((space) => {
              subscriptions.add(
                updateGraphWithAddObjectAction({
                  graph,
                  space,
                  dispatch,
                  plugin: MARKDOWN_PLUGIN,
                  action: MarkdownAction.CREATE,
                  properties: {
                    label: ['create document label', { ns: MARKDOWN_PLUGIN }],
                    icon: (props: IconProps) => <TextAa {...props} />,
                    testId: 'markdownPlugin.createObject',
                  },
                }),
              );
            });

            client.spaces
              .get()
              .filter((space) => !!enabled.find((id) => id === space.id))
              .forEach((space) => {
                // Add all documents to the graph.
                const query = space.db.query(Filter.schema(DocumentType));
                subscriptions.add(query.subscribe());
                let previousObjects: DocumentType[] = [];
                subscriptions.add(
                  effect(() => {
                    const removedObjects = previousObjects.filter((object) => !query.objects.includes(object));
                    previousObjects = query.objects;
                    batch(() => {
                      removedObjects.forEach((object) => graph.removeNode(fullyQualifiedId(object)));
                      query.objects.forEach((object) => {
                        graph.addNodes({
                          id: fullyQualifiedId(object),
                          data: object,
                          properties: {
                            // TODO(wittjosiah): Reconcile with metadata provides.

                            // Provide the label as a getter so we don't have to rebuild the graph node when the title changes while editing the document.
                            get label() {
                              return (
                                object.name ||
                                getFallbackTitle(object) || ['document title placeholder', { ns: MARKDOWN_PLUGIN }]
                              );
                            },
                            managesAutofocus: true,
                            icon: (props: IconProps) => <TextAa {...props} />,
                            testId: 'spacePlugin.object',
                            persistenceClass: 'echo',
                            persistenceKey: space?.id,
                          },
                          nodes: [
                            {
                              id: `${MARKDOWN_PLUGIN}/toggle-readonly/${space.id}/${object.id}`,
                              data: () =>
                                intentPlugin?.provides.intent.dispatch([
                                  {
                                    plugin: MARKDOWN_PLUGIN,
                                    action: MarkdownAction.TOGGLE_READONLY,
                                    data: {
                                      objectId: object.id,
                                    },
                                  },
                                ]),
                              properties: {
                                label: ['toggle view mode label', { ns: MARKDOWN_PLUGIN }],
                                icon: (props: IconProps) => <TextAa {...props} />,
                                keyBinding: 'shift+F5',
                              },
                            },
                          ],
                        });
                      });
                    });
                  }),
                );
              });
          });

          return () => {
            unsubscribe();
            subscriptions.clear();
          };
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
          }, [doc, space, settings.values.editorMode]);

          const fileManagerPlugin = useResolvePlugin(parseFileManagerPlugin);
          const onFileUpload = useMemo(() => {
            if (space === undefined) {
              return undefined;
            }

            if (fileManagerPlugin?.provides.file.upload === undefined) {
              return undefined;
            }

            return async (file: File) => {
              return await fileManagerPlugin?.provides?.file?.upload?.(file, space);
            };
          }, [fileManagerPlugin, space]);

          switch (role) {
            // TODO(burdon): Normalize layout (reduce variants).
            case 'article': {
              if (doc) {
                return (
                  <DocumentMain
                    readonly={settings.values.state[doc.id]?.readonly}
                    toolbar={settings.values.toolbar}
                    document={doc}
                    extensions={extensions}
                    onFileUpload={onFileUpload}
                  />
                );
              } else {
                return null;
              }
            }
            case 'main': {
              if (data.active instanceof DocumentType) {
                const { readonly } = settings.values.state[data.active.id] ?? {};
                return (
                  <MainLayout toolbar={settings.values.toolbar}>
                    <DocumentMain
                      readonly={readonly}
                      toolbar={settings.values.toolbar}
                      document={data.active}
                      extensions={extensions}
                      onFileUpload={onFileUpload}
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
                return <DocumentSection document={data.object} extensions={extensions} />;
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
                content: create(TextType, { content: '' }),
                threads: [],
              });

              return {
                data: doc,
                intents: [[{ action: LayoutAction.SCROLL_INTO_VIEW, data: { id: doc.id } }]],
              };
            }

            // TODO(burdon): Generalize for every object.
            case MarkdownAction.TOGGLE_READONLY: {
              const objectId = data?.objectId;
              const state = settings.values.state[objectId as string] ?? {};
              settings.values.state[objectId as string] = { ...state, readonly: !state.readonly };
              return { data: true };
            }
          }
        },
      },
    },
  };
};

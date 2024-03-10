//
// Copyright 2023 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { type IconProps, TextAa } from '@phosphor-icons/react';
import { batch, effect } from '@preact/signals-core';
import { deepSignal } from 'deepsignal/react';
import { Effect } from 'effect';
import React, { useMemo, type Ref } from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { updateGraphWithAddObjectAction } from '@braneframe/plugin-space';
import {
  isObject,
  parseIntentPlugin,
  resolvePlugin,
  type IntentPluginProvides,
  type Plugin,
  type PluginDefinition,
} from '@dxos/app-framework';
import { EventSubscriptions } from '@dxos/async';
import { Filter } from '@dxos/echo-schema';
import { LocalStorageStore } from '@dxos/local-storage';
import { translations as editorTranslations } from '@dxos/react-ui-editor';
import { isTileComponentProps } from '@dxos/react-ui-mosaic';

import {
  type DocumentItemProps,
  DocumentCard,
  DocumentMain,
  DocumentSection,
  EditorMain,
  EmbeddedLayout,
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
  type DocumentType,
  MarkdownAction,
  DocumentSchema,
} from './types';
import { getFallbackTitle, isEditorModel, isMarkdownProperties, markdownExtensionPlugins } from './util';

export const isDocument = (data: unknown): data is DocumentType => {
  // TODO(wittjosiah): More concise way to do this?
  const result = S.validate(DocumentSchema)(data);
  const program = Effect.match(result, {
    onFailure: () => false,
    onSuccess: () => true,
  });
  return Effect.runSync(program);
};

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

  const state = deepSignal<MarkdownPluginState>({ extensions: [] });

  let intentPlugin: Plugin<IntentPluginProvides> | undefined;

  // TODO(burdon): Cant this be memoized?
  const getCustomExtensions = (document?: DocumentType) => {
    // Configure extensions.
    const extensions = getExtensions({
      settings: settings.values,
      document,
      dispatch: intentPlugin?.provides.intent.dispatch,
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
        .prop(settings.values.$editorMode!, 'editor-mode', LocalStorageStore.string)
        .prop(settings.values.$toolbar!, 'toolbar', LocalStorageStore.bool)
        .prop(settings.values.$experimental!, 'experimental', LocalStorageStore.bool)
        .prop(settings.values.$debug!, 'debug', LocalStorageStore.bool)
        .prop(settings.values.$typewriter!, 'typewriter', LocalStorageStore.string);

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
          [DocumentType.schema.typename]: {
            placeholder: ['document title placeholder', { ns: MARKDOWN_PLUGIN }],
            icon: (props: IconProps) => <TextAa {...props} />,
          },
        },
      },
      translations: [...translations, ...editorTranslations],
      graph: {
        builder: (plugins, graph) => {
          const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
          if (!client || !dispatch) {
            return;
          }

          const subscriptions = new EventSubscriptions();
          const { unsubscribe } = client.spaces.subscribe((spaces) => {
            spaces.forEach((space) => {
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

              // Add all documents to the graph.
              const query = space.db.query(Filter.schema(DocumentSchema));
              let previousObjects: DocumentType[] = [];
              subscriptions.add(
                effect(() => {
                  const removedObjects = previousObjects.filter((object) => !query.objects.includes(object));
                  previousObjects = query.objects;
                  batch(() => {
                    removedObjects.forEach((object) => graph.removeNode(object.id));
                    query.objects.forEach((object) => {
                      graph.addNodes({
                        id: object.id,
                        data: object,
                        properties: {
                          // TODO(wittjosiah): Reconcile with metadata provides.

                          // Provide the label as a getter so we don't have to rebuild the graph node when the title changes while editing the document.
                          get label() {
                            return (
                              object.title ||
                              getFallbackTitle(object) || ['document title placeholder', { ns: MARKDOWN_PLUGIN }]
                            );
                          },
                          icon: (props: IconProps) => <TextAa {...props} />,
                          testId: 'spacePlugin.object',
                          persistenceClass: 'echo',
                          persistenceKey: space?.key.toHex(),
                        },
                        nodes: [
                          {
                            id: `${MARKDOWN_PLUGIN}/toggle-readonly/${object.id}`,
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
          const extensions = useMemo(
            () =>
              isDocument(data.active)
                ? getCustomExtensions(data.active)
                : isDocument(data.object)
                  ? getCustomExtensions(data.object)
                  : getCustomExtensions(),
            [data.active, data.object, settings.values.editorMode],
          );

          switch (role) {
            // TODO(burdon): Normalize layout (reduce variants).
            case 'main': {
              if (isDocument(data.active)) {
                const { readonly } = settings.values.state[data.active.id] ?? {};
                return (
                  <MainLayout toolbar={settings.values.toolbar}>
                    <DocumentMain
                      toolbar={settings.values.toolbar}
                      readonly={readonly}
                      document={data.active}
                      extensions={extensions}
                    />
                  </MainLayout>
                );
              } else if (
                'model' in data &&
                isEditorModel(data.model) &&
                'properties' in data &&
                isMarkdownProperties(data.properties)
              ) {
                const main = <EditorMain model={data.model} extensions={extensions} />;
                if ('view' in data && data.view === 'embedded') {
                  return <EmbeddedLayout>{main}</EmbeddedLayout>;
                } else {
                  return <MainLayout>{main}</MainLayout>;
                }
              }
              break;
            }

            case 'section': {
              if (isDocument(data.object)) {
                return <DocumentSection document={data.object} extensions={extensions} />;
              }
              break;
            }

            case 'card': {
              if (isObject(data.content) && typeof data.content.id === 'string' && isDocument(data.content.object)) {
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
              return { data: new DocumentType() };
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

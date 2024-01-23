//
// Copyright 2023 DXOS.org
//

import { ArticleMedium, type IconProps } from '@phosphor-icons/react';
import { effect } from '@preact/signals-react';
import { deepSignal } from 'deepsignal';
import React, { type MutableRefObject, type RefCallback, type Ref } from 'react';

import { SPACE_PLUGIN, SpaceAction } from '@braneframe/plugin-space';
import { Document as DocumentType, Folder } from '@braneframe/types';
import {
  isObject,
  parseIntentPlugin,
  resolvePlugin,
  LayoutAction,
  type IntentPluginProvides,
  type Plugin,
  type PluginDefinition,
} from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';
import { SpaceProxy, isTypedObject } from '@dxos/react-client/echo';
import { type EditorView } from '@dxos/react-ui-editor';
import { isTileComponentProps } from '@dxos/react-ui-mosaic';

import {
  DocumentCard,
  type DocumentItemProps,
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
  type OnChange,
  MarkdownAction,
} from './types';
import { getFallbackTitle, isEditorModel, isMarkdownProperties, markdownPlugins } from './util';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[Document.name] = Document;

export const isDocument = (data: unknown): data is DocumentType =>
  isTypedObject(data) && DocumentType.schema.typename === data.__typename;

export type MarkdownPluginState = {
  activeComment?: string;
  extensions: NonNullable<ExtensionsProvider>[];
  onChange: NonNullable<OnChange>[];
};

export const MarkdownPlugin = (): PluginDefinition<MarkdownPluginProvides> => {
  const settings = new LocalStorageStore<MarkdownSettingsProps>(MARKDOWN_PLUGIN, { viewMode: {}, experimental: false });
  const state = deepSignal<MarkdownPluginState>({ extensions: [], onChange: [] });

  let intentPlugin: Plugin<IntentPluginProvides> | undefined;

  // TODO(burdon): Remove (don't expose editor internals).
  const pluginMutableRef: MutableRefObject<EditorView | null> = { current: null };
  const pluginRefCallback: RefCallback<EditorView> = (view: EditorView) => {
    pluginMutableRef.current = view;
  };

  const getCustomExtensions = (document?: DocumentType) => {
    // Configure extensions.
    const extensions = getExtensions({
      settings: settings.values,
      document,
      dispatch: intentPlugin?.provides.intent.dispatch,
      onChange: (text: string) => {
        state.onChange.forEach((onChange) => onChange(text));
      },
    });

    // Add extensions from other plugins.
    for (const provider of state.extensions) {
      const provided = typeof provider === 'function' ? provider() : provider;
      extensions.push(...provided);
    }

    return extensions;
  };

  // TODO(thure): this needs to be refactored into a graph node action.
  // const _DocumentHeadingMenu = createDocumentHeadingMenu(pluginMutableRef);

  return {
    meta,
    ready: async (plugins) => {
      settings
        .prop(settings.values.$editorMode!, 'editor-mode', LocalStorageStore.string)
        .prop(settings.values.$experimental!, 'experimental', LocalStorageStore.bool)
        .prop(settings.values.$debug!, 'debug', LocalStorageStore.bool)
        .prop(settings.values.$typewriter!, 'typewriter', LocalStorageStore.string);

      intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

      markdownPlugins(plugins).forEach((plugin) => {
        const { extensions, onChange } = plugin.provides.markdown;
        if (extensions) {
          state.extensions.push(extensions);
        }
        if (onChange) {
          state.onChange.push(onChange);
        }
      });
    },
    provides: {
      settings: settings.values,
      metadata: {
        records: {
          [DocumentType.schema.typename]: {
            placeholder: ['document title placeholder', { ns: MARKDOWN_PLUGIN }],
            icon: (props: IconProps) => <ArticleMedium {...props} />,
          },
        },
      },
      translations,
      graph: {
        builder: ({ parent, plugins }) => {
          if (parent.data instanceof Folder || parent.data instanceof SpaceProxy) {
            parent.actionsMap[`${SPACE_PLUGIN}/create`]?.addAction({
              id: `${MARKDOWN_PLUGIN}/create`,
              label: ['create document label', { ns: MARKDOWN_PLUGIN }],
              icon: (props) => <ArticleMedium {...props} />,
              invoke: () =>
                intentPlugin?.provides.intent.dispatch([
                  {
                    plugin: MARKDOWN_PLUGIN,
                    action: MarkdownAction.CREATE,
                  },
                  {
                    action: SpaceAction.ADD_OBJECT,
                    data: { target: parent.data },
                  },
                  {
                    action: LayoutAction.ACTIVATE,
                  },
                ]),
              properties: {
                testId: 'markdownPlugin.createObject',
              },
            });
          } else if (parent.data instanceof DocumentType) {
            parent.addAction({
              id: `${MARKDOWN_PLUGIN}/toggle-readonly`,
              label: ['toggle view mode label', { ns: MARKDOWN_PLUGIN }],
              icon: (props) => <ArticleMedium {...props} />,
              keyBinding: 'shift+F5',
              invoke: () =>
                intentPlugin?.provides.intent.dispatch([
                  {
                    plugin: MARKDOWN_PLUGIN,
                    action: MarkdownAction.TOGGLE_VIEW,
                    data: {
                      objectId: parent.data.id,
                    },
                  },
                ]),
            });

            if (!parent.data.title) {
              effect(() => {
                const document = parent.data;
                parent.label = document.title ||
                  getFallbackTitle(document) || ['document title placeholder', { ns: MARKDOWN_PLUGIN }];
              });
            }
          }
        },
      },
      stack: {
        creators: [
          {
            id: 'create-stack-section-doc',
            testId: 'markdownPlugin.createSection',
            label: ['create stack section label', { ns: MARKDOWN_PLUGIN }],
            icon: (props: any) => <ArticleMedium {...props} />,
            intent: {
              plugin: MARKDOWN_PLUGIN,
              action: MarkdownAction.CREATE,
            },
          },
        ],
      },
      surface: {
        component: ({ data, role, ...props }, forwardedRef) => {
          switch (role) {
            case 'main': {
              if (isDocument(data.active)) {
                const readonly = settings.values.viewMode[data.active.id];
                return (
                  <DocumentMain
                    document={data.active}
                    readonly={readonly}
                    editorMode={settings.values.editorMode}
                    extensions={getCustomExtensions(data.active)}
                    editorRefCb={pluginRefCallback}
                  />
                );
              } else if (
                'model' in data &&
                isEditorModel(data.model) &&
                'properties' in data &&
                isMarkdownProperties(data.properties)
              ) {
                // TODO(burdon): Normalize with ECHO path above?
                const main = (
                  <EditorMain
                    model={data.model}
                    editorMode={settings.values.editorMode}
                    extensions={getExtensions({
                      onChange: (text: string) => {
                        state.onChange.forEach((onChange) => onChange(text));
                      },
                    })}
                    editorRefCb={pluginRefCallback}
                  />
                );

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
                return (
                  <DocumentSection
                    document={data.object}
                    editorMode={settings.values.editorMode}
                    extensions={getCustomExtensions(data.object)}
                  />
                );
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
            case LayoutAction.FOCUS: {
              state.activeComment = data.object;
              break;
            }

            case MarkdownAction.CREATE: {
              return { object: new DocumentType() };
            }

            // TODO(burdon): Generalize for every object.
            case MarkdownAction.TOGGLE_VIEW: {
              const { objectId } = data;
              settings.values.viewMode[objectId as string] = !settings.values.viewMode[objectId];
              break;
            }
          }
        },
      },
    },
  };
};

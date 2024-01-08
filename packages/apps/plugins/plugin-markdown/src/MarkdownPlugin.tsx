//
// Copyright 2023 DXOS.org
//

import { ArticleMedium, type IconProps } from '@phosphor-icons/react';
import { effect } from '@preact/signals-react';
import { deepSignal } from 'deepsignal';
import React, { type MutableRefObject, type RefCallback, type Ref } from 'react';

import { SPACE_PLUGIN, SpaceAction } from '@braneframe/plugin-space';
import { Document as DocumentType, Folder } from '@braneframe/types';
import { type PluginDefinition, isObject, parseIntentPlugin, resolvePlugin, LayoutAction } from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';
import { SpaceProxy, isTypedObject } from '@dxos/react-client/echo';
import { type TextEditorRef } from '@dxos/react-ui-editor';
import { isTileComponentProps } from '@dxos/react-ui-mosaic';

import {
  EditorMain,
  MarkdownSettings,
  createDocumentCard,
  createDocumentHeadingMenu,
  createDocumentMain,
  createDocumentSection,
} from './components';
import { getExtensions } from './extensions';
import meta, { MARKDOWN_PLUGIN } from './meta';
import translations from './translations';
import { MarkdownAction, type MarkdownPluginProvides, type MarkdownSettingsProps } from './types';
import { getFallbackTitle, isMarkdown, isMarkdownProperties, markdownPlugins } from './util';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[Document.name] = Document;

export const isDocument = (data: unknown): data is DocumentType =>
  isTypedObject(data) && DocumentType.schema.typename === data.__typename;

export type MarkdownPluginState = {
  activeComment?: string;
  onChange: NonNullable<(text: string) => void>[];
};

export const MarkdownPlugin = (): PluginDefinition<MarkdownPluginProvides> => {
  const settings = new LocalStorageStore<MarkdownSettingsProps>(MARKDOWN_PLUGIN, { viewMode: {}, experimental: false });
  const state = deepSignal<MarkdownPluginState>({ onChange: [] });

  const pluginMutableRef: MutableRefObject<TextEditorRef> = { current: { root: null } };
  const pluginRefCallback: RefCallback<TextEditorRef> = (nextRef: TextEditorRef) => {
    pluginMutableRef.current = { ...nextRef };
  };

  const DocumentCard = createDocumentCard(settings.values);
  const DocumentMain = createDocumentMain(settings.values, state, pluginRefCallback);
  const DocumentSection = createDocumentSection(settings.values, state);

  // TODO(thure): this needs to be refactored into a graph node action.
  const _DocumentHeadingMenu = createDocumentHeadingMenu(pluginMutableRef);

  return {
    meta,
    ready: async (plugins) => {
      settings
        .prop(settings.values.$editorMode!, 'editor-mode', LocalStorageStore.string)
        .prop(settings.values.$experimental!, 'experimental', LocalStorageStore.bool)
        .prop(settings.values.$debug!, 'debug', LocalStorageStore.bool);

      markdownPlugins(plugins).forEach((plugin) => {
        if (plugin.provides.markdown.onChange) {
          state.onChange.push(plugin.provides.markdown.onChange);
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
          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

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
                return <DocumentMain document={data.active} readonly={readonly} />;
              } else if (
                'model' in data &&
                isMarkdown(data.model) &&
                'properties' in data &&
                isMarkdownProperties(data.properties)
              ) {
                return (
                  <EditorMain
                    editorMode={settings.values.editorMode}
                    model={data.model}
                    extensions={getExtensions({
                      onChange: (text: string) => {
                        state.onChange.forEach((onChange) => onChange(text));
                      },
                    })}
                    properties={data.properties}
                    editorRefCb={pluginRefCallback}
                    layout={'view' in data && data.view === 'embedded' ? 'embedded' : 'main'}
                  />
                );
              }
              break;
            }

            case 'section': {
              if (isDocument(data.object)) {
                return <DocumentSection content={data.object} />;
              }
              break;
            }

            case 'card': {
              if (isObject(data.content) && typeof data.content.id === 'string' && isDocument(data.content.object)) {
                // TODO(burdon): Type.
                const cardProps = {
                  ...props,
                  item: {
                    id: data.content.id,
                    object: data.content.object,
                    color: typeof data.content.color === 'string' ? data.content.color : undefined,
                  },
                };

                return isTileComponentProps(cardProps) ? (
                  <DocumentCard {...cardProps} ref={forwardedRef as Ref<HTMLDivElement>} />
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

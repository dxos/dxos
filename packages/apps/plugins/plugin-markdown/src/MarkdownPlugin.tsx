//
// Copyright 2023 DXOS.org
//

import { ArticleMedium, type IconProps } from '@phosphor-icons/react';
import { effect } from '@preact/signals-react';
import { deepSignal } from 'deepsignal';
import React, { type FC, type MutableRefObject, type RefCallback, useCallback, type Ref } from 'react';

import { isGraphNode } from '@braneframe/plugin-graph';
import { SPACE_PLUGIN, SpaceAction } from '@braneframe/plugin-space';
import { Document, Folder } from '@braneframe/types';
import { type PluginDefinition, isObject, resolvePlugin, parseIntentPlugin, LayoutAction } from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';
import { SpaceProxy, getSpaceForObject, isTypedObject } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { type EditorModel, type TextEditorRef, useTextModel } from '@dxos/react-ui-editor';
import { isTileComponentProps } from '@dxos/react-ui-mosaic';

import {
  EditorCard,
  EditorMain,
  EditorMainEmbedded,
  type EditorMainProps,
  EditorSection,
  MarkdownMainEmpty,
  MarkdownSettings,
  // SpaceMarkdownChooser,
  StandaloneMenu,
} from './components';
import meta, { MARKDOWN_PLUGIN } from './meta';
import translations from './translations';
import {
  MarkdownAction,
  type MarkdownPluginProvides,
  type MarkdownProperties,
  type MarkdownSettingsProps,
} from './types';
import {
  getFallbackTitle,
  isMarkdown,
  isMarkdownContent,
  isMarkdownPlaceholder,
  isMarkdownProperties,
  markdownPlugins,
} from './util';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[Document.name] = Document;

export const isDocument = (data: unknown): data is Document =>
  isTypedObject(data) && Document.schema.typename === data.__typename;

export const MarkdownPlugin = (): PluginDefinition<MarkdownPluginProvides> => {
  const settings = new LocalStorageStore<MarkdownSettingsProps>(MARKDOWN_PLUGIN, { showWidgets: false });
  const state = deepSignal<{ onChange: NonNullable<EditorMainProps['onChange']>[] }>({ onChange: [] });

  // TODO(burdon): Document.
  const pluginMutableRef: MutableRefObject<TextEditorRef> = {
    current: { editor: null },
  };
  const pluginRefCallback: RefCallback<TextEditorRef> = (nextRef: TextEditorRef) => {
    pluginMutableRef.current = { ...nextRef };
  };

  // TODO(burdon): Rationalize EditorMainStandalone vs EditorMainEmbedded, etc. Should these components be inline or external?
  const EditorMainStandalone: FC<{
    composer: EditorModel;
    properties: MarkdownProperties;
  }> = ({ composer, properties }) => {
    const onChange: NonNullable<EditorMainProps['onChange']> = useCallback(
      (content) => state.onChange.forEach((onChange) => onChange(content)),
      [state.onChange],
    );

    return (
      <EditorMain
        model={composer}
        properties={properties}
        layout='standalone'
        editorMode={settings.values.editorMode}
        showWidgets={settings.values.showWidgets}
        onChange={onChange}
        editorRefCb={pluginRefCallback}
      />
    );
  };

  const MarkdownMain: FC<{ content: Document }> = ({ content: document }) => {
    const identity = useIdentity();
    const space = getSpaceForObject(document);
    const textModel = useTextModel({
      identity,
      space,
      text: document?.content,
    });

    const onChange: NonNullable<EditorMainProps['onChange']> = useCallback(
      (content) => state.onChange.forEach((onChange) => onChange(content)),
      [state.onChange],
    );

    if (!textModel) {
      return null;
    }

    return (
      <EditorMain
        model={textModel}
        properties={document}
        layout='standalone'
        editorMode={settings.values.editorMode}
        showWidgets={settings.values.showWidgets}
        onChange={onChange}
        editorRefCb={pluginRefCallback}
      />
    );
  };

  const StandaloneMainMenu: FC<{ content: Document }> = ({ content: document }) => {
    const identity = useIdentity();
    // TODO(wittjosiah): Should this be a hook?
    const space = getSpaceForObject(document);

    const textModel = useTextModel({
      identity,
      space,
      text: document?.content,
    });

    if (!textModel) {
      return null;
    }

    return <StandaloneMenu properties={document} model={textModel} editorRef={pluginMutableRef} />;
  };

  return {
    meta,
    ready: async (plugins) => {
      settings
        .prop(settings.values.$editorMode!, 'editor-mode', LocalStorageStore.string)
        .prop(settings.values.$showWidgets!, 'show-widgets', LocalStorageStore.bool);

      const filters: ((document: Document) => boolean)[] = [];
      markdownPlugins(plugins).forEach((plugin) => {
        if (plugin.provides.markdown.onChange) {
          state.onChange.push(plugin.provides.markdown.onChange);
        }

        if (plugin.provides.markdown.filter) {
          filters.push(plugin.provides.markdown.filter);
        }
      });
    },
    provides: {
      settings: settings.values,
      translations,
      metadata: {
        records: {
          [Document.schema.typename]: {
            placeholder: ['document title placeholder', { ns: MARKDOWN_PLUGIN }],
            icon: (props: IconProps) => <ArticleMedium {...props} />,
          },
        },
      },
      graph: {
        builder: ({ parent, plugins }) => {
          if (parent.data instanceof Folder || parent.data instanceof SpaceProxy) {
            const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

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
                testId: 'markdownPlugin.createDocument',
              },
            });
          } else if (parent.data instanceof Document && !parent.data.title) {
            return effect(() => {
              const document = parent.data;
              parent.label = document.title ||
                getFallbackTitle(document) || ['document title placeholder', { ns: MARKDOWN_PLUGIN }];
            });
          }
        },
      },
      stack: {
        creators: [
          {
            id: 'create-stack-section-doc',
            testId: 'markdownPlugin.createSectionSpaceDocument',
            label: ['create stack section label', { ns: MARKDOWN_PLUGIN }],
            icon: (props: any) => <ArticleMedium {...props} />,
            intent: {
              plugin: MARKDOWN_PLUGIN,
              action: MarkdownAction.CREATE,
            },
          },
        ],
        // TODO(burdon): Deprecated? Remove?
        choosers: [
          {
            id: 'choose-stack-section-doc',
            testId: 'markdownPlugin.chooseSectionSpaceDocument',
            label: ['choose stack section label', { ns: MARKDOWN_PLUGIN }],
            icon: (props: any) => <ArticleMedium {...props} />,
            filter: isMarkdownContent,
          },
        ],
      },
      surface: {
        component: ({ data, role, ...props }, forwardedRef) => {
          // TODO(wittjosiah): Improve the naming of surface components.
          switch (role) {
            case 'main': {
              if (isDocument(data.active)) {
                return <MarkdownMain content={data.active} />;
              } else if (
                'composer' in data &&
                isMarkdown(data.composer) &&
                'properties' in data &&
                isMarkdownProperties(data.properties)
              ) {
                if ('view' in data && data.view === 'embedded') {
                  return <EditorMainEmbedded composer={data.composer} properties={data.properties} />;
                } else {
                  return <EditorMainStandalone composer={data.composer} properties={data.properties} />;
                }
              } else if (
                'composer' in data &&
                isMarkdownPlaceholder(data.composer) &&
                'properties' in data &&
                isMarkdownProperties(data.properties)
              ) {
                return <MarkdownMainEmpty composer={data.composer} properties={data.properties} />;
              }
              break;
            }

            case 'heading': {
              if (isGraphNode(data.activeNode) && isDocument(data.activeNode.data)) {
                return <StandaloneMainMenu content={data.activeNode.data} />;
              }
              break;
            }

            case 'section': {
              if (isDocument(data.object) && isMarkdown(data.object.content)) {
                return (
                  <EditorSection
                    model={data.object.content}
                    editorMode={settings.values.editorMode}
                    showWidgets={settings.values.showWidgets}
                  />
                );
              }
              break;
            }

            case 'card': {
              if (isObject(data.content) && typeof data.content.id === 'string' && isDocument(data.content.object)) {
                const cardProps = {
                  ...props,
                  item: {
                    id: data.content.id,
                    object: data.content.object,
                    color: typeof data.content.color === 'string' ? data.content.color : undefined,
                  },
                };

                return isTileComponentProps(cardProps) ? (
                  <EditorCard {...cardProps} ref={forwardedRef as Ref<HTMLDivElement>} />
                ) : null;
              }
              break;
            }

            case 'settings': {
              return data.component === 'dxos.org/plugin/layout/ProfileSettings' ? <MarkdownSettings /> : null;
            }

            // TODO(burdon): Review with @thure.
            case 'dialog': {
              if (data.subject === 'dxos.org/plugin/stack/chooser' && data.id === 'choose-stack-section-doc') {
                // return <SpaceMarkdownChooser />;
                return null;
              }
              break;
            }
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case MarkdownAction.CREATE: {
              return { object: new Document() };
            }
          }
        },
      },
    },
  };
};

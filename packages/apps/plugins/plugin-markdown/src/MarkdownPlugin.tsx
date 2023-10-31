//
// Copyright 2023 DXOS.org
//

import { ArticleMedium, type IconProps } from '@phosphor-icons/react';
import { effect } from '@preact/signals-react';
import { deepSignal } from 'deepsignal';
import React, { type FC, type MutableRefObject, type RefCallback, useCallback } from 'react';

import { isGraphNode } from '@braneframe/plugin-graph';
import { SpaceAction } from '@braneframe/plugin-space';
import { Document, Folder } from '@braneframe/types';
import { type PluginDefinition, resolvePlugin, parseIntentPlugin, LayoutAction } from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';
import { getSpaceForObject, isTypedObject } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import {
  type ComposerModel,
  type MarkdownComposerProps,
  type MarkdownComposerRef,
  useTextModel,
} from '@dxos/react-ui-editor';

import {
  EditorMain,
  EditorMainEmbedded,
  EditorSection,
  MarkdownMainEmpty,
  MarkdownSettings,
  // SpaceMarkdownChooser,
  StandaloneMenu,
} from './components';
import translations from './translations';
import {
  MARKDOWN_PLUGIN,
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
  const settings = new LocalStorageStore<MarkdownSettingsProps>(MARKDOWN_PLUGIN);
  const state = deepSignal<{ onChange: NonNullable<MarkdownComposerProps['onChange']>[] }>({ onChange: [] });

  // TODO(burdon): Document.
  const pluginMutableRef: MutableRefObject<MarkdownComposerRef> = {
    current: { editor: null },
  };
  const pluginRefCallback: RefCallback<MarkdownComposerRef> = (nextRef: MarkdownComposerRef) => {
    pluginMutableRef.current = { ...nextRef };
  };

  // TODO(burdon): Rationalize EditorMainStandalone vs EditorMainEmbedded, etc. Should these components be inline or external?
  const EditorMainStandalone: FC<{
    composer: ComposerModel;
    properties: MarkdownProperties;
  }> = ({ composer, properties }) => {
    const onChange: NonNullable<MarkdownComposerProps['onChange']> = useCallback(
      (content) => state.onChange.forEach((onChange) => onChange(content)),
      [state.onChange],
    );

    return (
      <EditorMain
        model={composer}
        properties={properties}
        layout='standalone'
        editorMode={settings.values.editorMode}
        onChange={onChange}
        editorRefCb={pluginRefCallback}
      />
    );
  };

  const MarkdownMain: FC<{ content: Document }> = ({ content: document }) => {
    const identity = useIdentity();
    // TODO(wittjosiah): Should this be a hook?
    const space = getSpaceForObject(document);

    const textModel = useTextModel({
      identity,
      space,
      text: document?.content,
    });

    const onChange: NonNullable<MarkdownComposerProps['onChange']> = useCallback(
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
    meta: {
      id: MARKDOWN_PLUGIN,
    },
    ready: async (plugins) => {
      settings.prop(settings.values.$editorMode!, 'editor-mode', LocalStorageStore.string);

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
            fallbackName: ['document title placeholder', { ns: MARKDOWN_PLUGIN }],
            icon: (props: IconProps) => <ArticleMedium {...props} />,
          },
        },
      },
      graph: {
        builder: ({ parent, plugins }) => {
          if (parent.data instanceof Folder) {
            const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

            parent.actionsMap['create-object-group']?.addAction({
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
                    action: SpaceAction.ADD_TO_FOLDER,
                    data: { folder: parent.data },
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
        component: (data, role) => {
          // TODO(burdon): Document.
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
                return <EditorSection content={data.object.content} />;
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

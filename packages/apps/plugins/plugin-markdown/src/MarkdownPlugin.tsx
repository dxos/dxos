//
// Copyright 2023 DXOS.org
//

import { ArticleMedium, Plus } from '@phosphor-icons/react';
import { deepSignal } from 'deepsignal';
import get from 'lodash.get';
import React, { type FC, type MutableRefObject, type RefCallback, useCallback } from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { isGraphNode } from '@braneframe/plugin-graph';
import { GraphNodeAdapter, SpaceAction, type SpacePluginProvides } from '@braneframe/plugin-space';
import { Document } from '@braneframe/types';
import { type PluginDefinition, usePlugin, resolvePlugin, parseIntentPlugin, LayoutAction } from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';
import { Filter, SpaceProxy, TextObject, isTypedObject } from '@dxos/react-client/echo';
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
import { INITIAL_CONTENT, INITIAL_TITLE } from './initialContent';
import translations from './translations';
import {
  MARKDOWN_PLUGIN,
  MarkdownAction,
  type MarkdownPluginProvides,
  type MarkdownProperties,
  type MarkdownSettingsProps,
} from './types';
import {
  documentToGraphNode,
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

  let adapter: GraphNodeAdapter<Document> | undefined;

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

  // TODO(burdon): Is `data` expected to be a Document (TypedObject) or MarkdownProperties?
  const MarkdownMain: FC<{ content: Document }> = ({ content: document }) => {
    const identity = useIdentity();
    const spacePlugin = usePlugin<SpacePluginProvides>('dxos.org/plugin/space');
    const space = spacePlugin?.provides.space.active;

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

    if (!space?.db.getObjectById(document.id)) {
      return <MarkdownMainEmpty {...{ composer: { content: () => null }, properties: document }} />;
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
    const spacePlugin = usePlugin<SpacePluginProvides>('dxos.org/plugin/space');
    const space = spacePlugin?.provides.space.active;
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

      const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
      const dispatch = intentPlugin?.provides.intent.dispatch;

      if (dispatch) {
        const filter = Filter.from(
          (document: Document) =>
            document.__typename === Document.schema.typename && filters.every((filter) => filter(document)),
        );
        adapter = new GraphNodeAdapter({ dispatch, filter, adapter: documentToGraphNode });
      }

      const clientPlugin = resolvePlugin(plugins, parseClientPlugin);
      if (clientPlugin && clientPlugin.provides.firstRun) {
        const document = clientPlugin.provides.client.spaces.default.db.add(
          new Document({ title: INITIAL_TITLE, content: new TextObject(INITIAL_CONTENT) }),
        );
        if (document && intentPlugin) {
          void intentPlugin.provides.intent.dispatch({
            action: LayoutAction.ACTIVATE,
            data: { id: document.id },
          });
        }
      }

      // TODO(wittjosiah): Replace? Remove?
      // const dndPlugin = findPlugin<DndPluginProvides>(plugins, 'dxos.org/plugin/dnd');
      // if (dndPlugin && dndPlugin.provides.dnd?.onSetTileSubscriptions) {
      //   dndPlugin.provides.dnd.onSetTileSubscriptions.push((tile, node) => {
      //     if (isMarkdownContent(node.data)) {
      //       tile.copyClass = (tile.copyClass ?? new Set()).add('stack-section');
      //     }
      //     return tile;
      //   });
      // }
    },
    unload: async () => {
      adapter?.clear();
    },
    provides: {
      settings: settings.values,
      translations,
      graph: {
        builder: ({ parent, plugins }) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return;
          }

          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
          const space = parent.data;

          parent.addAction({
            id: `${MARKDOWN_PLUGIN}/create`,
            label: ['create document label', { ns: MARKDOWN_PLUGIN }],
            icon: (props) => <Plus {...props} />,
            properties: {
              testId: 'markdownPlugin.createDocument',
              disposition: 'toolbar',
            },
            invoke: () =>
              intentPlugin?.provides.intent.dispatch([
                {
                  plugin: MARKDOWN_PLUGIN,
                  action: MarkdownAction.CREATE,
                },
                {
                  action: SpaceAction.ADD_OBJECT,
                  data: { spaceKey: space.key.toHex() },
                },
                {
                  action: LayoutAction.ACTIVATE,
                },
              ]),
          });

          return adapter?.createNodes(space, parent);
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
          // TODO(wittjosiah): Expose all through `components` as well?
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
              if (
                get(data, 'subject') === 'dxos.org/plugin/stack/chooser' &&
                get(data, 'id') === 'choose-stack-section-doc'
              ) {
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

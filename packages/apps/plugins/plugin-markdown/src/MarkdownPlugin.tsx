//
// Copyright 2023 DXOS.org
//

import { ArticleMedium, Plus } from '@phosphor-icons/react';
import { deepSignal } from 'deepsignal';
import get from 'lodash.get';
import React, { type FC, type MutableRefObject, type RefCallback, useCallback } from 'react';

import { type ClientPluginProvides } from '@braneframe/plugin-client';
import { type Node } from '@braneframe/plugin-graph';
import { type IntentPluginProvides } from '@braneframe/plugin-intent';
import { GraphNodeAdapter, SpaceAction, type SpacePluginProvides } from '@braneframe/plugin-space';
import { SplitViewAction } from '@braneframe/plugin-splitview';
import { Document } from '@braneframe/types';
import {
  type ComposerModel,
  type MarkdownComposerProps,
  type MarkdownComposerRef,
  useTextModel,
} from '@dxos/react-ui-composer';
import { LocalStorageStore } from '@dxos/local-storage';
import { SpaceProxy, Text, isTypedObject } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { type PluginDefinition, findPlugin, usePlugin } from '@dxos/react-surface';

import {
  EditorMain,
  EditorMainEmbedded,
  EditorSection,
  MarkdownMainEmpty,
  MarkdownSettings,
  SpaceMarkdownChooser,
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
    data: { composer: ComposerModel; properties: MarkdownProperties };
    role?: string;
  }> = ({ data: { composer, properties } }) => {
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
  const MarkdownMain: FC<{ data: Document }> = ({ data }) => {
    const identity = useIdentity();
    const spacePlugin = usePlugin<SpacePluginProvides>('dxos.org/plugin/space');
    const space = spacePlugin?.provides.space.active;

    const textModel = useTextModel({
      identity,
      space,
      text: data?.content,
    });

    const onChange: NonNullable<MarkdownComposerProps['onChange']> = useCallback(
      (content) => state.onChange.forEach((onChange) => onChange(content)),
      [state.onChange],
    );

    if (!textModel) {
      return null;
    }

    if (!space?.db.getObjectById(data.id)) {
      return <MarkdownMainEmpty data={{ composer: { content: () => null }, properties: data }} />;
    }

    return (
      <EditorMain
        model={textModel}
        properties={data}
        layout='standalone'
        editorMode={settings.values.editorMode}
        onChange={onChange}
        editorRefCb={pluginRefCallback}
      />
    );
  };

  const StandaloneMainMenu: FC<{ data: Node<Document> }> = ({ data }) => {
    const identity = useIdentity();
    const spacePlugin = usePlugin<SpacePluginProvides>('dxos.org/plugin/space');
    const space = spacePlugin?.provides.space.active;
    const textModel = useTextModel({
      identity,
      space,
      text: data.data?.content,
    });

    if (!textModel) {
      return null;
    }

    return <StandaloneMenu properties={data.data} model={textModel} editorRef={pluginMutableRef} />;
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

      const filter = (document: Document) =>
        document.__typename === Document.schema.typename && filters.every((filter) => filter(document));
      adapter = new GraphNodeAdapter({ filter, adapter: documentToGraphNode });

      const clientPlugin = findPlugin<ClientPluginProvides>(plugins, 'dxos.org/plugin/client');
      const intentPlugin = findPlugin<IntentPluginProvides>(plugins, 'dxos.org/plugin/intent');
      if (clientPlugin && clientPlugin.provides.firstRun) {
        const document = clientPlugin.provides.client.spaces.default.db.add(
          new Document({ title: INITIAL_TITLE, content: new Text(INITIAL_CONTENT) }),
        );
        if (document && intentPlugin) {
          void intentPlugin.provides.intent.dispatch({
            action: SplitViewAction.ACTIVATE,
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
        nodes: (parent) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return;
          }

          const space = parent.data;

          parent.addAction({
            id: `${MARKDOWN_PLUGIN}/create`,
            label: ['create document label', { ns: MARKDOWN_PLUGIN }],
            icon: (props) => <Plus {...props} />,
            properties: {
              testId: 'spacePlugin.createDocument',
              disposition: 'toolbar',
            },
            intent: [
              {
                plugin: MARKDOWN_PLUGIN,
                action: MarkdownAction.CREATE,
              },
              {
                action: SpaceAction.ADD_OBJECT,
                data: { spaceKey: space.key.toHex() },
              },
              {
                action: SplitViewAction.ACTIVATE,
              },
            ],
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
      component: (data, role) => {
        if (role === 'dialog' && data === 'dxos.org/plugin/splitview/ProfileSettings') {
          return MarkdownSettings;
        }

        if (!data || typeof data !== 'object') {
          return null;
        }

        // TODO(burdon): Document.
        // TODO(wittjosiah): Expose all through `components` as well?
        // TODO(wittjosiah): Improve the naming of surface components.
        switch (role) {
          case 'main': {
            if (isDocument(data)) {
              return MarkdownMain;
            } else if (
              'composer' in data &&
              isMarkdown(data.composer) &&
              'properties' in data &&
              isMarkdownProperties(data.properties)
            ) {
              if ('view' in data && data.view === 'embedded') {
                return EditorMainEmbedded;
              } else {
                return EditorMainStandalone;
              }
            } else if (
              'composer' in data &&
              isMarkdownPlaceholder(data.composer) &&
              'properties' in data &&
              isMarkdownProperties(data.properties)
            ) {
              return MarkdownMainEmpty;
            }
            break;
          }

          case 'heading': {
            if ('data' in data && isDocument(data.data)) {
              return StandaloneMainMenu;
            }
            break;
          }

          case 'section': {
            if (isMarkdown(get(data, 'content', {}))) {
              return EditorSection;
            }
            break;
          }

          // TODO(burdon): Review with @thure.
          case 'dialog': {
            if (
              get(data, 'subject') === 'dxos.org/plugin/stack/chooser' &&
              get(data, 'id') === 'choose-stack-section-doc'
            ) {
              return SpaceMarkdownChooser;
            }
            break;
          }
        }

        return null;
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

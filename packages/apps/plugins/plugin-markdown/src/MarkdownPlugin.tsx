//
// Copyright 2023 DXOS.org
//

import { Article, ArticleMedium, Plus, Trash } from '@phosphor-icons/react';
import { deepSignal } from 'deepsignal';
import get from 'lodash.get';
import React from 'react';

import { GraphNode, GraphProvides } from '@braneframe/plugin-graph';
import { GraphNodeAdapter } from '@braneframe/plugin-space';
import { TranslationsProvides } from '@braneframe/plugin-theme';
import { TreeViewProvides } from '@braneframe/plugin-treeview';
import { Document as DocumentType } from '@braneframe/types';
import { ComposerModel, MarkdownComposerProps, TextKind } from '@dxos/aurora-composer';
import { Space, SpaceProxy } from '@dxos/client/echo';
import { PluginDefinition, findPlugin } from '@dxos/react-surface';

import {
  MarkdownMain,
  MarkdownMainEmbedded,
  MarkdownMainEmpty,
  MarkdownSection,
  SpaceMarkdownChooser,
} from './components';
import translations from './translations';
import { MarkdownProperties } from './types';
import {
  MARKDOWN_PLUGIN,
  isMarkdown,
  isMarkdownContent,
  isMarkdownPlaceholder,
  isMarkdownProperties,
  markdownPlugins,
} from './util';

type MarkdownPluginProvides = GraphProvides &
  TranslationsProvides & {
    // todo(thure): Refactor this to be DRY, but avoid circular dependencies. Do we need a package like `plugin-types` 😬? Alternatively, StackPlugin stories could exit its package, but we have no such precedent.
    stack: { creators: Record<string, any>[]; choosers: Record<string, any>[] };
  };

export const MarkdownPlugin = (): PluginDefinition<MarkdownPluginProvides> => {
  const state = deepSignal<{ onChange: NonNullable<MarkdownComposerProps['onChange']>[] }>({ onChange: [] });

  const objectToGraphNode = (parent: GraphNode<Space>, object: DocumentType, index: string): GraphNode => ({
    id: object.id,
    index: get(object, 'meta.index', index),
    label: object.title ?? ['document title placeholder', { ns: MARKDOWN_PLUGIN }],
    icon: (props) => (object.content?.kind === TextKind.PLAIN ? <ArticleMedium {...props} /> : <Article {...props} />),
    data: object,
    parent,
    pluginActions: {
      [MARKDOWN_PLUGIN]: [
        {
          id: 'delete',
          index: 'a1',
          label: ['delete document label', { ns: MARKDOWN_PLUGIN }],
          icon: (props) => <Trash {...props} />,
          invoke: async () => {
            parent.data?.db.remove(object);
          },
        },
      ],
    },
  });

  const adapter = new GraphNodeAdapter(DocumentType.filter(), objectToGraphNode);

  const MarkdownMainStandalone = ({
    data: [model, properties],
  }: {
    data: [ComposerModel, MarkdownProperties];
    role?: string;
  }) => {
    return (
      <MarkdownMain
        model={model}
        properties={properties}
        layout='standalone'
        onChange={(text) => state.onChange.forEach((onChange) => onChange(text))}
      />
    );
  };

  return {
    meta: {
      id: MARKDOWN_PLUGIN,
    },
    ready: async (plugins) => {
      markdownPlugins(plugins).forEach((plugin) => {
        if (plugin.provides.markdown.onChange) {
          state.onChange.push(plugin.provides.markdown.onChange);
        }
      });
    },
    unload: async () => {
      adapter.clear();
    },
    provides: {
      graph: {
        nodes: (parent, emit) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return [];
          }

          const space = parent.data;
          return adapter.createNodes(space, parent, emit);
        },
        actions: (parent, _, plugins) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return [];
          }

          const treeViewPlugin = findPlugin<TreeViewProvides>(plugins, 'dxos:treeview');
          const space = parent.data;
          return [
            {
              id: 'create-doc',
              index: 'a1',
              testId: 'spacePlugin.createDocument',
              label: ['create document label', { ns: MARKDOWN_PLUGIN }],
              icon: (props) => <Plus {...props} />,
              disposition: 'toolbar',
              invoke: async () => {
                const object = space.db.add(new DocumentType());
                if (treeViewPlugin) {
                  treeViewPlugin.provides.treeView.selected = [parent.id, object.id];
                }
              },
            },
          ];
        },
      },
      stack: {
        creators: [
          {
            id: 'create-section-space-doc',
            testId: 'markdownPlugin.createSectionSpaceDocument',
            label: ['create section space document label', { ns: MARKDOWN_PLUGIN }],
            icon: (props: any) => <ArticleMedium {...props} />,
            create: () => new Document(),
          },
        ],
        choosers: [
          {
            id: 'choose-section-space-doc',
            testId: 'markdownPlugin.chooseSectionSpaceDocument',
            label: ['choose section space document label', { ns: MARKDOWN_PLUGIN }],
            icon: (props: any) => <ArticleMedium {...props} />,
            filter: isMarkdownContent,
          },
        ],
      },
      translations,
      component: (datum, role) => {
        switch (role) {
          case 'main':
            if (Array.isArray(datum) && isMarkdown(datum[0]) && isMarkdownProperties(datum[1])) {
              if (datum[2] === 'embedded') {
                return MarkdownMainEmbedded;
              } else {
                return MarkdownMainStandalone;
              }
            } else if (Array.isArray(datum) && isMarkdownPlaceholder(datum[0]) && isMarkdownProperties(datum[1])) {
              return MarkdownMainEmpty;
            }
            break;
          case 'section':
            if (isMarkdown(get(datum, 'object.content', {}))) {
              return MarkdownSection;
            }
            break;
          // TODO(burdon): Can this be decoupled from this plugin?
          case 'dialog':
            if (get(datum, 'subject') === 'dxos:stack/chooser' && get(datum, 'id') === 'choose-section-space-doc') {
              return SpaceMarkdownChooser;
            }
            break;
        }

        return null;
      },
    },
  };
};

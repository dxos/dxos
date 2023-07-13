//
// Copyright 2023 DXOS.org
//

import { Plus, ArticleMedium } from '@phosphor-icons/react';
import { getIndices } from '@tldraw/indices';
import get from 'lodash.get';
import React from 'react';

import { GraphProvides } from '@braneframe/plugin-graph';
import { TranslationsProvides } from '@braneframe/plugin-theme';
import { TreeViewProvides } from '@braneframe/plugin-treeview';
import { Document } from '@braneframe/types';
import { UnsubscribeCallback } from '@dxos/async';
import { ComposerModel, MarkdownComposerProps } from '@dxos/aurora-composer';
import { SpaceProxy } from '@dxos/client';
import { createStore, subscribe } from '@dxos/observable-object';
import { observer } from '@dxos/observable-object/react';
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
  documentToGraphNode,
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
  const store = createStore<{ onChange: NonNullable<MarkdownComposerProps['onChange']>[] }>({ onChange: [] });
  const subscriptions = new Map<string, UnsubscribeCallback>();

  const MarkdownMainStandalone = observer(
    ({ data: [model, properties] }: { data: [ComposerModel, MarkdownProperties]; role?: string }) => {
      return (
        <MarkdownMain
          model={model}
          properties={properties}
          layout='standalone'
          onChange={(text) => store.onChange.forEach((onChange) => onChange(text))}
        />
      );
    },
  );

  return {
    meta: {
      id: MARKDOWN_PLUGIN,
    },
    ready: async (plugins) => {
      markdownPlugins(plugins).forEach((plugin) => {
        if (plugin.provides.markdown.onChange) {
          store.onChange.push(plugin.provides.markdown.onChange);
        }
      });
    },
    unload: async () => {
      subscriptions.forEach((unsubscribe) => unsubscribe());
      subscriptions.clear();
    },
    provides: {
      graph: {
        nodes: (parent, emit) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return [];
          }

          const space = parent.data;
          const query = space.db.query(Document.filter());
          const documentIndices = getIndices(query.objects.length);
          if (!subscriptions.has(parent.id)) {
            subscriptions.set(
              parent.id,
              query.subscribe(() => emit()),
            );
          }

          query.objects.forEach((document, index) => {
            if (!subscriptions.has(document.id)) {
              subscriptions.set(
                document.id,
                document[subscribe](() => {
                  if (document.__deleted) {
                    subscriptions.delete(document.id);
                    return;
                  }

                  emit(documentToGraphNode(document, parent, documentIndices[index]));
                }),
              );
            }
          });

          return query.objects.map((document, index) => documentToGraphNode(document, parent, documentIndices[index]));
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
                const object = space.db.add(new Document());
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
            icon: ArticleMedium,
            create: () => new Document(),
          },
        ],
        choosers: [
          {
            id: 'choose-section-space-doc',
            testId: 'markdownPlugin.chooseSectionSpaceDocument',
            label: ['choose section space document label', { ns: MARKDOWN_PLUGIN }],
            icon: ArticleMedium,
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

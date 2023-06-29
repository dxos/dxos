//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { GraphNode, useGraphContext } from '@braneframe/plugin-graph';
import { createStore } from '@dxos/observable-object';
import { observer } from '@dxos/react-client';
import { PluginDefinition, Surface } from '@dxos/react-surface';

import { TreeViewContext, TreeViewContextValue, useTreeView } from './TreeViewContext';
import { TreeViewContainer } from './components';

export const TREE_VIEW_PLUGIN = 'dxos:TreeViewPlugin';

export const uriToSelected = (uri: string) => {
  const [_, namespace, type, id, ...rest] = uri.split('/');
  return [`${namespace}:${type}/${id}`, ...rest];
};

export const selectedToUri = (selected: string[]) => '/' + selected.join('/').replace(':', '/');

export type TreeViewProvides = {
  treeView: TreeViewContextValue;
};

export const resolveNodes = (graph: GraphNode[], [id, ...path]: string[], nodes: GraphNode[] = []): GraphNode[] => {
  const node = graph.find((node) => node.id === id);
  if (!node) {
    return nodes;
  }

  return resolveNodes(node.children ?? [], path, [...nodes, node]);
};

export const TreeViewPlugin = (): PluginDefinition<TreeViewProvides> => {
  const store = createStore<TreeViewContextValue>({ selected: [] });

  return {
    meta: {
      id: TREE_VIEW_PLUGIN,
    },
    provides: {
      treeView: store,
      context: ({ children }) => {
        return <TreeViewContext.Provider value={store}>{children}</TreeViewContext.Provider>;
      },
      components: {
        default: observer(() => {
          const treeView = useTreeView();
          const graph = useGraphContext();
          const [plugin] = treeView.selected[0]?.split('/') ?? [];
          const nodes = resolveNodes(graph.roots[plugin] ?? [], treeView.selected);

          if (treeView.selected.length === 0) {
            return (
              <Surface
                component='dxos:SplitViewPlugin/SplitView'
                surfaces={{
                  sidebar: { component: 'dxos:TreeViewPlugin/TreeView' },
                  main: { component: 'dxos:SplitViewPlugin/SplitViewMainContentEmpty' },
                }}
              />
            );
          } else if (nodes.length === 0) {
            return <Surface component={`${plugin}/Main`} />;
          } else {
            return (
              <Surface
                component='dxos:SplitViewPlugin/SplitView'
                surfaces={{
                  sidebar: { component: 'dxos:TreeViewPlugin/TreeView' },
                  main: { component: `${plugin}/Main`, data: nodes },
                }}
              />
            );
          }
        }),
        TreeView: TreeViewContainer,
      },
    },
  };
};

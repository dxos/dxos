//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { GraphNode, useGraph } from '@braneframe/plugin-graph';
import { createStore } from '@dxos/observable-object';
import { observer } from '@dxos/react-client';
import { PluginDefinition, Surface } from '@dxos/react-surface';

import { TreeViewContext, useTreeView } from './TreeViewContext';
import { TreeViewContainer } from './components';
import { TreeViewContextValue, TreeViewProvides } from './types';
import { resolveNodes } from './util';

export const TREE_VIEW_PLUGIN = 'dxos:treeview';

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
          const graph = useGraph();
          const [plugin] = treeView.selected[0]?.split('/') ?? [];
          const nodes = resolveNodes(
            Object.values(graph.pluginChildren ?? {}).flat() as GraphNode[],
            treeView.selected,
          );

          if (treeView.selected.length === 0) {
            return (
              <Surface
                component='dxos:splitview/SplitView'
                surfaces={{
                  sidebar: { component: 'dxos:treeview/TreeView' },
                  main: { component: 'dxos:splitview/SplitViewMainContentEmpty' },
                }}
              />
            );
          } else if (nodes.length === 0) {
            return <Surface component={`${plugin}/Main`} />;
          } else {
            return (
              <Surface
                component='dxos:splitview/SplitView'
                surfaces={{
                  sidebar: { component: 'dxos:treeview/TreeView' },
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

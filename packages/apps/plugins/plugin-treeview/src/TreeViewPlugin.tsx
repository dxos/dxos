//
// Copyright 2023 DXOS.org
//

import { deepSignal } from 'deepsignal/react';
import React from 'react';

import { GraphNode, useGraph } from '@braneframe/plugin-graph';
import { PluginDefinition, Surface, findPlugin, usePluginContext } from '@dxos/react-surface';

import { TreeViewContext, useTreeView } from './TreeViewContext';
import { Fallback, TreeViewContainer } from './components';
import { TreeItemDragOverlay } from './components/TreeItemDragOverlay';
import translations from './translations';
import { TREE_VIEW_PLUGIN, TreeViewAction, TreeViewContextValue, TreeViewPluginProvides } from './types';
import { resolveNodes } from './util';

export const TreeViewPlugin = (): PluginDefinition<TreeViewPluginProvides> => {
  const state = deepSignal<TreeViewContextValue>({ active: [] });

  return {
    meta: {
      id: TREE_VIEW_PLUGIN,
    },
    provides: {
      treeView: state,
      context: ({ children }) => {
        return <TreeViewContext.Provider value={state}>{children}</TreeViewContext.Provider>;
      },
      components: {
        default: () => {
          const { plugins } = usePluginContext();
          const treeView = useTreeView();
          const { graph } = useGraph();
          const [shortId] = treeView.active[0]?.split('/') ?? [];
          const plugin = findPlugin(plugins, shortId);
          const active = resolveNodes(Object.values(graph.pluginChildren ?? {}).flat() as GraphNode[], treeView.active);

          if (active.length === 0 && plugin) {
            return <Surface component={`${plugin.meta.id}/Main`} />;
          } else if (active.length > 0) {
            return (
              <Surface
                component='dxos.org/plugin/splitview/SplitView'
                surfaces={{
                  sidebar: { component: 'dxos.org/plugin/treeview/TreeView' },
                  main: { component: `${shortId}/Main`, fallback: Fallback, data: { active } },
                }}
              />
            );
          } else {
            return (
              <Surface
                component='dxos.org/plugin/splitview/SplitView'
                surfaces={{
                  sidebar: { component: 'dxos.org/plugin/treeview/TreeView' },
                  main: { component: 'dxos.org/plugin/splitview/SplitViewMainContentEmpty' },
                }}
              />
            );
          }
        },
        TreeView: TreeViewContainer,
      },
      component: (data, role) => {
        switch (role) {
          case 'dragoverlay':
            if (!!data && typeof data === 'object' && 'id' in data && 'label' in data && 'index' in data) {
              return TreeItemDragOverlay;
            } else {
              return null;
            }
          default:
            return null;
        }
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case TreeViewAction.ACTIVATE: {
              if (Array.isArray(intent.data)) {
                state.active = intent.data;
                return true;
              }
              break;
            }
          }
        },
      },
      translations,
    },
  };
};

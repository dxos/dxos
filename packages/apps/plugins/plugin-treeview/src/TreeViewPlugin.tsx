//
// Copyright 2023 DXOS.org
//

import { RevertDeepSignal, deepSignal } from 'deepsignal/react';
import React from 'react';

import { GraphPluginProvides } from '@braneframe/plugin-graph';
import { Plugin, PluginDefinition, Surface, findPlugin, usePlugins } from '@dxos/react-surface';

import { TreeViewContext, useTreeView } from './TreeViewContext';
import { Fallback, TreeItemMainHeading, TreeViewContainer } from './components';
import { TreeItemDragOverlay } from './components/TreeItemDragOverlay';
import translations from './translations';
import { TREE_VIEW_PLUGIN, TreeViewAction, TreeViewContextValue, TreeViewPluginProvides } from './types';

export const TreeViewPlugin = (): PluginDefinition<TreeViewPluginProvides> => {
  let graphPlugin: Plugin<GraphPluginProvides> | undefined;
  const state = deepSignal<TreeViewContextValue>({
    active: undefined,
    get activeNode() {
      if (!graphPlugin) {
        throw new Error('Graph plugin not found.');
      }

      return this.active && graphPlugin.provides.graph.find(this.active);
    },
  }) as RevertDeepSignal<TreeViewContextValue>;

  return {
    meta: {
      id: TREE_VIEW_PLUGIN,
    },
    ready: async (plugins) => {
      graphPlugin = findPlugin<GraphPluginProvides>(plugins, 'dxos.org/plugin/graph');
    },
    provides: {
      treeView: state,
      context: ({ children }) => {
        return <TreeViewContext.Provider value={state}>{children}</TreeViewContext.Provider>;
      },
      components: {
        default: () => {
          const { plugins } = usePlugins();
          const treeView = useTreeView();
          const [shortId, component] = treeView.active?.split(':') ?? [];
          const plugin = findPlugin(plugins, shortId);

          if (plugin && plugin.provides.components?.[component]) {
            return <Surface component={`${plugin.meta.id}/${component}`} />;
          } else if (treeView.activeNode) {
            return (
              <Surface
                component='dxos.org/plugin/splitview/SplitView'
                surfaces={{
                  sidebar: { component: 'dxos.org/plugin/treeview/TreeView' },
                  complementary: { data: treeView.activeNode.data },
                  main: { fallback: Fallback, data: treeView.activeNode.data },
                  heading: { data: treeView.activeNode /* (thure): Intentionally the node. */ },
                  presence: { data: treeView.activeNode.data },
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
            if (!!data && typeof data === 'object' && 'id' in data && 'label' in data) {
              return TreeItemDragOverlay;
            } else {
              return null;
            }
          case 'heading':
            if (!!data && typeof data === 'object' && 'label' in data && 'parent' in data) {
              return TreeItemMainHeading;
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
              if (intent.data && typeof intent.data.id === 'string') {
                state.active = intent.data.id;
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

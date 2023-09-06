//
// Copyright 2023 DXOS.org
//

import { RevertDeepSignal, deepSignal } from 'deepsignal/react';
import React from 'react';

import { ClientPluginProvides } from '@braneframe/plugin-client';
import { GraphPluginProvides } from '@braneframe/plugin-graph';
import { AppState } from '@braneframe/types';
import { Plugin, PluginDefinition, Surface, findPlugin, usePlugins } from '@dxos/react-surface';

import { TreeViewContext, useTreeView } from './TreeViewContext';
import {
  Fallback,
  TreeItemMainHeading,
  TreeViewContainer,
  TreeItemDragOverlay,
  TreeViewDocumentTitle,
} from './components';
import translations from './translations';
import { TREE_VIEW_PLUGIN, TreeViewAction, TreeViewContextValue, TreeViewPluginProvides } from './types';
import { SpaceState } from '@dxos/protocols/proto/dxos/client/services'

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
    appState: undefined,
  }) as RevertDeepSignal<TreeViewContextValue>;

  return {
    meta: {
      id: TREE_VIEW_PLUGIN,
    },
    ready: async (plugins) => {
      graphPlugin = findPlugin<GraphPluginProvides>(plugins, 'dxos.org/plugin/graph');

      const clientPlugin = findPlugin<ClientPluginProvides>(plugins, 'dxos.org/plugin/client');
      if (!clientPlugin) {
        return;
      }

      const client = clientPlugin.provides.client;

      // todo(thure): remove the `??` fallback when `client.getSpace()` reliably returns the default space.
      const defaultSpace = client.getSpace() ?? client.spaces?.get().filter(space => space.state.get() !== SpaceState.INACTIVE)[0];
      if (defaultSpace) {
        // Ensure defaultSpace has the app state persistor
        await defaultSpace.waitUntilReady();
        const appStates = defaultSpace.db.query(AppState.filter()).objects;
        if (appStates.length < 1) {
          const appState = new AppState();
          defaultSpace.db.add(appState);
          state.appState = appState;
        } else {
          state.appState = (appStates as AppState[])[0];
        }
      }
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
                  main: { data: treeView.activeNode.data, fallback: Fallback },
                  heading: { data: treeView.activeNode /* (thure): Intentionally the node. */ },
                  presence: { data: treeView.activeNode.data },
                  status: { data: treeView.activeNode.data },
                  documentTitle: { component: 'dxos.org/plugin/treeview/DocumentTitle' },
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
                  documentTitle: { component: 'dxos.org/plugin/treeview/DocumentTitle' },
                }}
              />
            );
          }
        },
        TreeView: TreeViewContainer,
        DocumentTitle: TreeViewDocumentTitle,
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

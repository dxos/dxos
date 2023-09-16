//
// Copyright 2023 DXOS.org
//

import { batch, effect } from '@preact/signals-react';
import { RevertDeepSignal, deepSignal } from 'deepsignal/react';
import React from 'react';

import { ClientPluginProvides } from '@braneframe/plugin-client';
import { DndPluginProvides } from '@braneframe/plugin-dnd';
import { GraphPluginProvides } from '@braneframe/plugin-graph';
import { AppState } from '@braneframe/types';
import { EventSubscriptions } from '@dxos/async';
import { MosaicChangeEvent, MosaicState, parseDndId } from '@dxos/aurora-grid';
import { Plugin, PluginDefinition, Surface, findPlugin, usePlugins } from '@dxos/react-surface';

import { TreeViewContext, useTreeView } from './TreeViewContext';
import {
  Fallback,
  NavTreeItemDelegator,
  TreeItemMainHeading,
  TreeViewContainer,
  TreeViewDocumentTitle,
} from './components';
import translations from './translations';
import { TREE_VIEW_PLUGIN, TreeViewAction, TreeViewContextValue, TreeViewPluginProvides } from './types';
import { computeTreeViewMosaic, getPersistenceParent } from './util';

export const TreeViewPlugin = (): PluginDefinition<TreeViewPluginProvides> => {
  let graphPlugin: Plugin<GraphPluginProvides> | undefined;
  const subscriptions = new EventSubscriptions();

  const state = deepSignal<TreeViewContextValue>({
    active: undefined,
    previous: undefined,
    get activeNode() {
      if (!graphPlugin) {
        throw new Error('Graph plugin not found.');
      }

      return this.active && graphPlugin.provides.graph.find(this.active);
    },
    get previousNode() {
      if (!graphPlugin) {
        throw new Error('Graph plugin not found.');
      }

      return this.previous && graphPlugin.provides.graph.find(this.previous);
    },
    appState: undefined,
  }) as RevertDeepSignal<TreeViewContextValue>;

  return {
    meta: {
      id: TREE_VIEW_PLUGIN,
    },
    ready: async (plugins) => {
      graphPlugin = findPlugin<GraphPluginProvides>(plugins, 'dxos.org/plugin/graph');
      const graph = graphPlugin?.provides.graph;

      const dndPlugin = findPlugin<DndPluginProvides>(plugins, 'dxos.org/plugin/dnd');
      const mosaic: MosaicState | undefined = dndPlugin?.provides.dnd.mosaic;

      const clientPlugin = findPlugin<ClientPluginProvides>(plugins, 'dxos.org/plugin/client');
      const client = clientPlugin?.provides.client;
      if (!client?.spaces.isReady.get()) {
        return;
      }

      // Ensure defaultSpace has the app state persistor
      const defaultSpace = client.spaces.default;
      const appStates = defaultSpace.db.query(AppState.filter()).objects;
      if (appStates.length < 1) {
        const appState = new AppState();
        defaultSpace.db.add(appState);
        state.appState = appState;
      } else {
        state.appState = (appStates as AppState[])[0];
      }

      subscriptions.add(
        effect(() => {
          console.log('[graph mosaic]', 'effect');
          if (graph && graph.root && mosaic && state.appState) {
            const nextMosaic = computeTreeViewMosaic(graph, state.appState);
            mosaic.tiles = nextMosaic.tiles;
            mosaic.relations = nextMosaic.relations;
          }
        }),
      );

      if (graph && dndPlugin?.provides.dnd?.onMosaicChangeSubscriptions) {
        dndPlugin?.provides.dnd?.onMosaicChangeSubscriptions.push((event: MosaicChangeEvent) => {
          const [rootId, entityId] = parseDndId(event.id);
          if (rootId === TREE_VIEW_PLUGIN) {
            const node = graph.find(entityId);
            let fromNode = null;
            let toNode = null;
            if (node) {
              switch (event.type) {
                case 'rearrange':
                  toNode = getPersistenceParent(node, node.properties.persistenceClass);
                  toNode?.properties.onRearrangeChild?.(node, event.index);
                  break;
                case 'migrate':
                  fromNode = graph.find(parseDndId(event.fromId)[1]);
                  toNode = graph.find(parseDndId(event.toId)[1]);
                  console.log('[migrate start]', node, toNode, event.index);
                  toNode?.properties.onMigrateStartChild?.(node, toNode, event.index);
                  console.log('[migrate end]', fromNode);
                  fromNode?.properties.onMigrateEndChild?.(node);
                  break;
              }
            }
          }
        });
      }
    },
    unload: async () => {
      subscriptions.clear();
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
        if (!!data && typeof data === 'object') {
          switch (role) {
            case 'mosaic-delegator':
              if (
                'tile' in data &&
                typeof data.tile === 'object' &&
                !!data.tile &&
                'id' in data.tile &&
                parseDndId((data.tile.id as string) ?? '')[0] === TREE_VIEW_PLUGIN
              ) {
                return NavTreeItemDelegator;
              } else {
                return null;
              }
            case 'heading':
              if ('label' in data && 'parent' in data) {
                return TreeItemMainHeading;
              } else {
                return null;
              }
            default:
              return null;
          }
        } else {
          return null;
        }
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case TreeViewAction.ACTIVATE: {
              if (intent.data && typeof intent.data.id === 'string') {
                batch(() => {
                  state.previous = state.active;
                  state.active = intent.data.id;
                });
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

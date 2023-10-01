//
// Copyright 2023 DXOS.org
//

import { effect, untracked } from '@preact/signals-react';

import { DndPluginProvides, SetTileHandler } from '@braneframe/plugin-dnd';
import { Graph, GraphPluginProvides } from '@braneframe/plugin-graph';
import { AppState } from '@braneframe/types';
import { EventSubscriptions } from '@dxos/async';
import { MosaicChangeEvent, MosaicState, parseDndId } from '@dxos/aurora-grid';
import { PluginDefinition, findPlugin } from '@dxos/react-surface';

import { NavTreeItemDelegator, TreeItemMainHeading, TreeViewContainer, TreeViewDocumentTitle } from './components';
import translations from './translations';
import { TREE_VIEW_PLUGIN, TreeViewPluginProvides } from './types';
import { computeTreeViewMosaic, getPersistenceParent } from './util';

const TREEVIEW_PLUGIN_PREVIEW_ITEM = `preview--${TREE_VIEW_PLUGIN}`;

export const TreeViewPlugin = (): PluginDefinition<TreeViewPluginProvides> => {
  const subscriptions = new EventSubscriptions();

  return {
    meta: {
      id: TREE_VIEW_PLUGIN,
    },
    // TODO(wittjosiah): Move this into TreeViewContainer? Use graph passed in via data.
    ready: async (plugins) => {
      const graphPlugin = findPlugin<GraphPluginProvides>(plugins, 'dxos.org/plugin/graph');
      const graph = graphPlugin?.provides.graph();

      const dndPlugin = findPlugin<DndPluginProvides>(plugins, 'dxos.org/plugin/dnd');
      const mosaic: MosaicState | undefined = dndPlugin?.provides.dnd.mosaic;
      const appState: AppState | undefined = dndPlugin?.provides.dnd.appState;
      const onSetTile: SetTileHandler = dndPlugin?.provides.onSetTile ?? ((tile, _) => tile);

      subscriptions.add(
        effect(() => {
          if (graph && graph.root && mosaic && appState) {
            const nextMosaic = computeTreeViewMosaic(graph, appState, onSetTile);
            mosaic.tiles = untracked(() => ({ ...mosaic.tiles, ...nextMosaic.tiles }));
            mosaic.relations = untracked(() => ({ ...mosaic.relations, ...nextMosaic.relations }));
          }
        }),
      );

      if (graph && dndPlugin?.provides.dnd?.onMosaicChangeSubscriptions) {
        dndPlugin?.provides.dnd?.onMosaicChangeSubscriptions.push((event: MosaicChangeEvent) => {
          const [rootId, entityId] = parseDndId(event.id);
          if (rootId === TREE_VIEW_PLUGIN) {
            const node = graph.findNode(entityId);
            let fromNode = null;
            let toNode = null;
            if (node) {
              switch (event.type) {
                case 'rearrange':
                  toNode = getPersistenceParent(node, node.properties.persistenceClass);
                  toNode?.properties.onRearrangeChild?.(node, event.index);
                  break;
                case 'migrate':
                  fromNode = graph.findNode(parseDndId(event.fromId)[1]);
                  toNode = graph.findNode(parseDndId(event.toId)[1]);
                  toNode?.properties.onMigrateStartChild?.(node, toNode, event.index);
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
      component: (data, role) => {
        if (!data || typeof data !== 'object') {
          return null;
        }

        switch (role) {
          case 'navigation':
            if ('graph' in data && data.graph instanceof Graph) {
              return TreeViewContainer;
            }
            break;

          case 'document-title':
            return TreeViewDocumentTitle;
            case 'mosaic-delegator':
              if ('tile' in data && typeof data.tile === 'object' && !!data.tile && 'id' in data.tile) {
              const mosaicId = parseDndId((data.tile.id as string) ?? '')[0];
                return mosaicId === TREE_VIEW_PLUGIN || mosaicId === TREEVIEW_PLUGIN_PREVIEW_ITEM
                  ? NavTreeItemDelegator
                  : null;
            }
            break;

          case 'heading':
            if ('label' in data && 'parent' in data) {
              return TreeItemMainHeading;
            }
            break;
        }

        return null;
      },
      translations,
    },
  };
};

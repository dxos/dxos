//
// Copyright 2023 DXOS.org
//

import { deepSignal, RevertDeepSignal } from 'deepsignal/react';
import React from 'react';

import { Node, useGraph } from '@braneframe/plugin-graph';
import { Mosaic, parseDndId, Tile } from '@dxos/aurora-grid';
import { Plugin, PluginDefinition } from '@dxos/react-surface';

import { DndDelegator } from './DndDelegator';
import { DND_PLUGIN, DndPluginProvides, DndProvides, DndStore } from './types';

export const DndPlugin = (): PluginDefinition<DndPluginProvides> => {
  const dnd = deepSignal<DndStore>({
    mosaic: {
      tiles: {},
      relations: {},
    },
    onMosaicChangeSubscriptions: [],
    onSetTileSubscriptions: [],
    onCopyTileSubscriptions: [],
  });

  return {
    meta: {
      id: DND_PLUGIN,
    },
    ready: async (plugins) => {
      const persistorPlugin = (plugins as Plugin<DndProvides>[]).find(
        (plugin) => typeof plugin.provides.dnd?.appState === 'function',
      );

      if (persistorPlugin) {
        dnd.appState = persistorPlugin.provides.dnd.appState();
      }
    },
    provides: {
      components: {
        default: Mosaic.Overlay,
      },
      context: ({ children }) => {
        const { graph } = useGraph();
        return (
          <Mosaic.Provider
            mosaic={dnd.mosaic}
            Delegator={DndDelegator}
            getData={(dndId) => {
              const [_, nodeId] = parseDndId(dndId);
              return graph.findNode(nodeId);
            }}
            copyTile={(id, toId, mosaic) => {
              return dnd.onCopyTileSubscriptions.length
                ? dnd.onCopyTileSubscriptions.reduce((tile, handler) => handler(tile, id, toId, mosaic), {
                    ...mosaic.tiles[id],
                  })
                : mosaic.tiles[id];
            }}
            onMosaicChange={(event) => {
              dnd.onMosaicChangeSubscriptions.forEach((handler) => {
                handler(event);
              });
            }}
          >
            {children}
          </Mosaic.Provider>
        );
      },
      dnd: dnd as RevertDeepSignal<DndStore>,
      onSetTile: (tile: Tile, node: Node): Tile => {
        return dnd.onSetTileSubscriptions.length
          ? dnd.onSetTileSubscriptions.reduce((nextTile, handler) => handler(nextTile, node), tile)
          : tile;
      },
    },
  };
};

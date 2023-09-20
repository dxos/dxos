//
// Copyright 2023 DXOS.org
//

import { deepSignal } from 'deepsignal/react';
import React from 'react';

import { Graph, useGraph } from '@braneframe/plugin-graph';
import { Mosaic, parseDndId, Tile } from '@dxos/aurora-grid';
import { PluginDefinition } from '@dxos/react-surface';

import { DndDelegator } from './DndDelegator';
import { DND_PLUGIN, DndPluginProvides, DndStore } from './types';

const dnd: DndStore = deepSignal({
  mosaic: {
    tiles: {},
    relations: {},
  },
  onMosaicChangeSubscriptions: [],
  onSetTileSubscriptions: [],
  onCopyTileSubscriptions: [],
});

export const DndPlugin = (): PluginDefinition<DndPluginProvides> => {
  return {
    meta: {
      id: DND_PLUGIN,
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
              return graph.find(nodeId);
            }}
            copyTile={(id, toId, mosaic, operation) => {
              return dnd.onCopyTileSubscriptions.length
                ? dnd.onCopyTileSubscriptions.reduce((tile, handler) => handler(tile, id, toId, mosaic, operation), {
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
      dnd,
      onSetTile: (tile: Tile, node: Graph.Node): Tile => {
        return dnd.onSetTileSubscriptions.length
          ? dnd.onSetTileSubscriptions.reduce((nextTile, handler) => handler(nextTile, node), tile)
          : tile;
      },
    },
  };
};

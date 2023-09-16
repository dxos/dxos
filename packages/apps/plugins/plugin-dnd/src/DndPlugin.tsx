//
// Copyright 2023 DXOS.org
//

import { deepSignal } from 'deepsignal/react';
import React from 'react';

import { useGraph } from '@braneframe/plugin-graph';
import { getDndId, Mosaic, parseDndId } from '@dxos/aurora-grid';
import { PluginDefinition } from '@dxos/react-surface';

import { DndDelegator } from './DndDelegator';
import { DND_PLUGIN, DndPluginProvides } from './types';

const mosaic = deepSignal({
  tiles: {},
  relations: {},
});

export const DndPlugin = (): PluginDefinition<DndPluginProvides> => {
  return {
    meta: {
      id: DND_PLUGIN,
    },
    provides: {
      context: ({ children }) => {
        const { graph } = useGraph();
        return (
          <Mosaic.Provider
            mosaic={mosaic}
            Delegator={DndDelegator}
            getData={(dndId) => {
              const [_, nodeId] = parseDndId(dndId);
              return graph.find(nodeId);
            }}
            copyTile={(id, toId, mosaic) => {
              const [_, nodeId] = parseDndId(id);
              const [mosaicId] = parseDndId(toId);
              const nextId = getDndId(mosaicId, nodeId);
              return { ...mosaic.tiles[id], id: nextId };
            }}
          >
            {children}
          </Mosaic.Provider>
        );
      },
      dnd: mosaic,
    },
  };
};

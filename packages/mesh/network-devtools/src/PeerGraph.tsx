//
// Copyright 2020 DXOS.org
//

import { colors } from '@mui/material';
import { makeStyles } from '@mui/styles';
import React, { useState, useEffect } from 'react';

import { PublicKey } from '@dxos/crypto';
import { SVG, useGrid, Grid } from '@dxos/gem-core';
import { createSimulationDrag, ForceLayout, Graph, NodeProjector } from '@dxos/gem-spore';
import { PeerInfo } from '@dxos/network-manager';

const classMap: Record<string, string> = {
  ME: 'blue',
  WAITING_FOR_CONNECTION: 'orange',
  CONNECTED: 'green',
  CLOSED: 'red'
};

const nodeColors: (keyof typeof colors)[] = ['red', 'green', 'blue', 'yellow', 'orange', 'grey'];
const useCustomStyles = makeStyles(() => ({
  nodes: nodeColors.reduce((map: any, color: string) => {
    map[`& g.node.${color} circle`] = {
      fill: (colors as any)[color][400],
      stroke: (colors as any)[color][700]
    };

    // map[`& g.node.${color} text`] = {
    //   fontFamily: 'sans-serif',
    //   fontSize: 12,
    //   fill: colors['grey'][700]
    // };

    return map;
  }, {})
}));

export interface PeerGraphProps {
  peers: PeerInfo[]
  size: { width: number | null, height: number | null }
  onClick?: (id: PublicKey) => void
}

export const PeerGraph = ({ peers, size, onClick }: PeerGraphProps) => {
  const grid = useGrid(size);

  const [layout] = useState(() => new ForceLayout());
  const [drag] = useState(() => createSimulationDrag(layout.simulation));
  const [{ nodeProjector }] = useState({
    nodeProjector: new NodeProjector({
      node: {
        showLabels: true,
        propertyAdapter: (node: any) => {
          return {
            class: classMap[node.state] ?? 'grey'
          };
        }
      }
    })
  });

  const [data, setData] = useState<any>({ nodes: [], links: [] });

  function buildGraph (peers: PeerInfo[]) {
    const nodes: any[] = []; const links: any[] = [];
    for (const peer of peers) {
      nodes.push({
        id: peer.id.toHex(),
        title: peer.id.humanize(),
        state: peer.state
      });
      for (const connection of peer.connections) {
        links.push({
          id: `${peer.id.toHex()}-${connection.toHex()}`,
          source: peer.id.toHex(),
          target: connection.toHex()
        });
      }
    }
    return { nodes, links };
  }

  useEffect(() => {
    setData(buildGraph(peers));
  }, [peers]);

  useEffect(() => {
    if (onClick) {
      const handle = ({ source }: any) => {
        onClick!(PublicKey.from(source.id));
      };

      drag.on('click', handle);
      return () => drag.off('click', handle);
    }
  }, [onClick]);

  const classes = useCustomStyles();

  return (
    <SVG width={size.width} height={size.height}>
      <Grid grid={grid} />

      <Graph
        grid={grid}
        data={data}
        layout={layout}
        nodeProjector={nodeProjector}
        drag={drag}
        classes={{
          nodes: classes.nodes
        }}
      />
    </SVG>
  );
};

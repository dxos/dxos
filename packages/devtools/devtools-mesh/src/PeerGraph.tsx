//
// Copyright 2020 DXOS.org
//

import React, { useState, useEffect } from 'react';

import { SVG, SVGContextProvider } from '@dxos/gem-core';
import { Graph } from '@dxos/gem-spore';
import { PeerInfo } from '@dxos/network-manager';
import type { PublicKey } from '@dxos/protocols';
import { humanize } from '@dxos/util';

// const classMap: Record<string, string> = {
//   ME: 'blue',
//   WAITING_FOR_CONNECTION: 'orange',
//   CONNECTED: 'green',
//   CLOSED: 'red'
// };

// const nodeColors: (keyof typeof colors)[] = ['red', 'green', 'blue', 'yellow', 'orange', 'grey'];

/*
const useCustomStyles = makeStyles(() => ({
  nodes: nodeColors.reduce((map: any, color: string) => {
    map[`& g.node.${color} circle`] = {
      fill: (colors as any)[color][400],
      stroke: (colors as any)[color][700]
    };

    // code map[`& g.node.${color} text`] = {
    // code   fontFamily: 'sans-serif',
    // code   fontSize: 12,
    // code   fill: colors['grey'][700]
    // code };

    return map;
  }, {})
}));
*/

export interface PeerGraphProps {
  peers: PeerInfo[]
  size: { width: number | null, height: number | null }
  onClick?: (id: PublicKey) => void
}

export const PeerGraph = ({ peers, size, onClick }: PeerGraphProps) => {
  const [data, setData] = useState<any>({ nodes: [], links: [] });

  const buildGraph = (peers: PeerInfo[]) => {
    const nodes: any[] = []; const links: any[] = [];
    for (const peer of peers) {
      nodes.push({
        id: peer.id.toHex(),
        title: humanize(peer.id),
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
  };

  useEffect(() => {
    setData(buildGraph(peers));
  }, [peers]);

  useEffect(() => {
    if (onClick) {
      // const handle = ({ source }: any) => {
      //   onClick!(PublicKey.from(source.id));
      // };

      // drag.on('click', handle);
      // return () => drag.off('click', handle);
    }
  }, [onClick]);

  console.log(JSON.stringify(data));

  return (
    <SVGContextProvider>
      <SVG>
        <Graph />
      </SVG>
    </SVGContextProvider>
  );
};
